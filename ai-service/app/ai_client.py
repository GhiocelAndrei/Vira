import io
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol

import numpy as np
from anthropic import Anthropic
from google import genai
from google.genai import types

from app.models import (
    BusinessStyleEstimate,
    PortraitGeneration,
    PortraitRequest,
    PortraitUsage,
    VideoAnalysis,
    VideoAnalysisResult,
)

# gemini-2.5-flash returns 404 for new projects (Google: "no longer available to new users" —
# use gemini-3.1-flash-lite or gemini-3.5-flash instead). Picked flash-lite for the cheaper/
# faster tier, matching the free-tier cost constraint this client was built under.
MODEL_ID = "gemini-3.1-flash-lite"
VIDEO_ANALYZER_PROMPT_VERSION = "video-analyzer-v6"
VIDEO_ANALYZER_ONTOLOGY_VERSION = "video-analyzer-ontology-v6"

# prompts/ lives at the monorepo root, not under ai-service/ (.claude/rules/ai-service.md:
# "Keep prompts under prompts/"). Resolve off this file's own location so it works regardless
# of the process's working directory (uvicorn is launched from both ai-service/ and the repo
# root across the README and docker-compose).
#
# The prompt file is named after VIDEO_ANALYZER_PROMPT_VERSION itself (video-analyzer-v3.md,
# not video-analyzer.md) — each version bump is its own file, so a stored ClipAnalysis row's
# promptVersion string always resolves to the exact prompt text that produced it. Bumping the
# version constant without adding the matching file fails loudly (FileNotFoundError) instead of
# silently loading a mismatched prompt.
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_VIDEO_ANALYZER_SYSTEM_PROMPT = (
    (_PROJECT_ROOT / "prompts" / f"{VIDEO_ANALYZER_PROMPT_VERSION}.md")
    .read_text(encoding="utf-8")
    .strip()
)


# Creator Profile Generator (ADR-011). Own constants/prompt file, same loading pattern as the
# video analyzer above: one file per prompt version so a stored provenance.prompt_version always
# resolves to the exact text that produced a given portrait.
CREATOR_PROFILE_MODEL_ID = "claude-sonnet-5"
CREATOR_PROFILE_PROMPT_VERSION = "creator-profile-v4"
# Bumping this is for the StyleVector dimension set / schema shape, not a closed-vocabulary
# ontology like the video analyzer's — but ADR-011 stamps it into provenance for the same reason:
# a stored portrait must stay interpretable against the version that produced it. v2 added
# style_evidence and the dossier word cap (ADR-012, ADR-013); v3 replaced positional evidence
# references with real tikTokVideoId citations (ADR-014). Prompt v4 rewrites the dossier's register
# for the "Despre creator" surface (ADR-015) and touches no dimension or field, so it did not move
# the ontology on its own; v4 is ADR-016's observed_products, which does change the envelope shape.
CREATOR_PROFILE_ONTOLOGY_VERSION = "creator-profile-ontology-v4"

# Claude Sonnet 5 introductory pricing (Anthropic pricing table, checked 2026-08-15): $2/$10 per
# MTok in/out. Active until 2026-08-31, after which it reverts to the $3/$15 standard list price —
# bump these two constants then. Named constants per CLAUDE.md rule 8.
CREATOR_PROFILE_INPUT_PRICE_USD_PER_MTOK = 2.00
CREATOR_PROFILE_OUTPUT_PRICE_USD_PER_MTOK = 10.00

_CREATOR_PROFILE_SYSTEM_PROMPT = (
    (_PROJECT_ROOT / "prompts" / f"{CREATOR_PROFILE_PROMPT_VERSION}.md")
    .read_text(encoding="utf-8")
    .strip()
)


# Embeddings for creator-brand matching (ADR-010, .claude/skills/creator-brand-matching/SKILL.md
# step 5). No prompt file — there's no instruction-following model call here, just a vector.
EMBEDDING_MODEL_ID = "gemini-embedding-001"
# 1536, not the model's native 3072: pgvector only indexes columns up to 2000 dimensions. MRL
# truncation to fewer dimensions requires renormalizing to unit length afterward (see
# GeminiEmbeddingClient.embed) or cosine similarity comes out systematically skewed — verified
# empirically in scripts/match_creator_businesses.py before this became a stored column.
EMBEDDING_DIMENSIONS = 1536


class AiModelClient(Protocol):
    """Black-box AI contract (dev-doc §8). Impls: Gemini, Claude, local."""

    def analyze_video(self, video_bytes: bytes, mime_type: str, tik_tok_video_id: str) -> VideoAnalysisResult: ...


class GeminiClient:
    """Google Gemini implementation (free-tier Gemini 2.5 Flash, native video input)."""

    _FILE_ACTIVE_POLL_SECONDS = 1.5
    _FILE_ACTIVE_TIMEOUT_SECONDS = 60

    def __init__(self) -> None:
        self._client = genai.Client()

    def analyze_video(
        self, video_bytes: bytes, mime_type: str = "video/mp4", *, tik_tok_video_id: str
    ) -> VideoAnalysisResult:
        uploaded = self._client.files.upload(
            file=io.BytesIO(video_bytes),
            config=types.UploadFileConfig(mime_type=mime_type),
        )
        try:
            uploaded = self._wait_until_active(uploaded)

            response = self._client.models.generate_content(
                model=MODEL_ID,
                contents=[uploaded, "Analyze this creator clip."],
                config=types.GenerateContentConfig(
                    system_instruction=_VIDEO_ANALYZER_SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    response_schema=VideoAnalysis,
                ),
            )
            analysis = response.parsed or VideoAnalysis.model_validate_json(response.text)
        finally:
            self._client.files.delete(name=uploaded.name)

        return VideoAnalysisResult(
            tik_tok_video_id=tik_tok_video_id,
            analysis=analysis,
            ai_model=MODEL_ID,
            prompt_version=VIDEO_ANALYZER_PROMPT_VERSION,
            ontology_version=VIDEO_ANALYZER_ONTOLOGY_VERSION,
            analyzed_at=datetime.now(timezone.utc),
        )

    def _wait_until_active(self, file: types.File) -> types.File:
        deadline = time.monotonic() + self._FILE_ACTIVE_TIMEOUT_SECONDS
        while file.state.name == "PROCESSING":
            if time.monotonic() > deadline:
                raise TimeoutError(f"Gemini file {file.name} did not become active in time")
            time.sleep(self._FILE_ACTIVE_POLL_SECONDS)
            file = self._client.files.get(name=file.name)
        if file.state.name == "FAILED":
            raise ValueError(f"Gemini failed to process the uploaded video: {file.error}")
        return file


class ClaudePortraitClient:
    """Anthropic implementation of the portrait-generation lane (ADR-011)."""

    def __init__(self) -> None:
        self._client = Anthropic()

    def generate_portrait(self, req: PortraitRequest) -> tuple[PortraitGeneration, PortraitUsage]:
        # Claude has no native video input — cover images are the only visual signal available.
        # Nulls are common in real data (see the pgvector/creator-portrait skill's troubleshooting
        # note); skip them rather than sending an empty url.
        #
        # Each image is preceded by a text label carrying its tikTokVideoId, so a style_evidence
        # citation can point at the real clip (ADR-014) rather than at an array position.
        blocks: list[dict] = []
        for clip in req.clips:
            if not clip.cover_image_url:
                continue
            blocks.append({"type": "text", "text": f"tikTokVideoId: {clip.tik_tok_video_id}"})
            blocks.append({"type": "image", "source": {"type": "url", "url": clip.cover_image_url}})

        payload = {
            "aggregates": req.aggregates.model_dump(mode="json", by_alias=True),
            "questionnaire": req.questionnaire.model_dump(mode="json", by_alias=True),
            "analyses": [a.model_dump(mode="json", by_alias=True) for a in req.analyses],
        }
        blocks.append({"type": "text", "text": json.dumps(payload, ensure_ascii=False)})

        response = self._client.messages.parse(
            model=CREATOR_PROFILE_MODEL_ID,
            max_tokens=16000,
            system=_CREATOR_PROFILE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": blocks}],
            output_format=PortraitGeneration,
        )
        if response.stop_reason == "refusal":
            raise ValueError("Claude declined to generate a portrait for this request")
        if response.parsed_output is None:
            raise ValueError(
                f"Claude did not return a parseable portrait (stop_reason={response.stop_reason})"
            )

        cost_usd = (
            response.usage.input_tokens * CREATOR_PROFILE_INPUT_PRICE_USD_PER_MTOK
            + response.usage.output_tokens * CREATOR_PROFILE_OUTPUT_PRICE_USD_PER_MTOK
        ) / 1_000_000
        usage = PortraitUsage(
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            cost_usd=cost_usd,
        )
        return response.parsed_output, usage


# Business Style Estimate (exploratory, ai-service/scripts/estimate_business_style.py only — see
# that script's module docstring for the boundary). Own prompt/version constants, same
# one-file-per-version loading discipline as the video analyzer and creator profile prompts above,
# so a printed/JSON provenance stamp always resolves to the exact text that produced it, even
# though nothing here is persisted to a DB row.
BUSINESS_STYLE_ESTIMATE_MODEL_ID = CREATOR_PROFILE_MODEL_ID  # same claude-sonnet-5, same pricing table
BUSINESS_STYLE_ESTIMATE_PROMPT_VERSION = "business-style-estimate-v1"
BUSINESS_STYLE_ESTIMATE_ONTOLOGY_VERSION = "business-style-estimate-ontology-v1"

_BUSINESS_STYLE_ESTIMATE_SYSTEM_PROMPT = (
    (_PROJECT_ROOT / "prompts" / f"{BUSINESS_STYLE_ESTIMATE_PROMPT_VERSION}.md")
    .read_text(encoding="utf-8")
    .strip()
)


class ClaudeBusinessStyleEstimateClient:
    """Anthropic implementation of the exploratory business-side style estimate. Same
    messages.parse/output_format/refusal-handling pattern as ClaudePortraitClient, deliberately
    kept as a separate class rather than a second method on it: the two call sites must never be
    confused for the same contract, and this one is never invoked from a router."""

    def __init__(self) -> None:
        self._client = Anthropic()

    def estimate(
        self, description: str, brief_message: str | None = None
    ) -> tuple[BusinessStyleEstimate, PortraitUsage]:
        blocks: list[dict] = [{"type": "text", "text": f"description: {description}"}]
        if brief_message:
            blocks.append({"type": "text", "text": f"briefMessage: {brief_message}"})

        response = self._client.messages.parse(
            model=BUSINESS_STYLE_ESTIMATE_MODEL_ID,
            max_tokens=4000,
            system=_BUSINESS_STYLE_ESTIMATE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": blocks}],
            output_format=BusinessStyleEstimate,
        )
        if response.stop_reason == "refusal":
            raise ValueError("Claude declined to generate a business style estimate")
        if response.parsed_output is None:
            raise ValueError(
                f"Claude did not return a parseable estimate (stop_reason={response.stop_reason})"
            )

        cost_usd = (
            response.usage.input_tokens * CREATOR_PROFILE_INPUT_PRICE_USD_PER_MTOK
            + response.usage.output_tokens * CREATOR_PROFILE_OUTPUT_PRICE_USD_PER_MTOK
        ) / 1_000_000
        usage = PortraitUsage(
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            cost_usd=cost_usd,
        )
        return response.parsed_output, usage


class GeminiEmbeddingClient:
    """Embedding lane for creator-brand matching (ADR-010). Same recipe validated in
    scripts/match_creator_businesses.py: MRL-truncate gemini-embedding-001's native 3072-dim
    output to EMBEDDING_DIMENSIONS, then renormalize to unit length so cosine similarity over the
    truncated vector isn't systematically skewed.
    """

    def __init__(self) -> None:
        self._client = genai.Client()

    def embed(self, text: str) -> list[float]:
        response = self._client.models.embed_content(
            model=EMBEDDING_MODEL_ID,
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIMENSIONS),
        )
        vector = np.array(response.embeddings[0].values, dtype=np.float64)
        vector = vector / np.linalg.norm(vector)
        return vector.tolist()
