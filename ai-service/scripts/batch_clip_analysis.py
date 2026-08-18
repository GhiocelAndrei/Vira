"""Batch-download and analyze every clip for one creator, concurrently.

Runs the same steps as the manual smoke-test workflow (see send_clip_analysis.py) for
every clip belonging to one creator in samples/video-links.txt, in parallel:

    1. yt-dlp downloads any clips not already in samples/
    2. A CreatorClip row is inserted for any clip the backend DB doesn't know about yet
       (skipped if one already exists for that creator_id + tikTokVideoId)
    3. Gemini analyzes each clip (VideoAnalysisResult)
    4. Each result is POSTed to the backend's ingest endpoint

Step 2 talks to Postgres directly (psycopg2, same pattern as
export_business_questionnaires.py) rather than through the backend API, because
CreatorController has no service-to-service endpoint to create a clip — only the
creator-session-authenticated onboarding flow (`POST /creator/clips/selection`) can,
and only for clips TikTok already returned on login.

Usage:
    export GEMINI_API_KEY=your-gemini-api-key
    export BACKEND_BASE_URL=https://vira-backend.lemonfield-d6638dd6.westeurope.azurecontainerapps.io
    export BACKEND_SERVICE_KEY=your-backend-service-key
    export DATABASE_URI=postgresql://user:pass@host:port/db
    python scripts/batch_clip_analysis.py <creator_id> <creator_name> [--workers 3] [--links-file path]

video-links.txt format (one clip per line, manually curated):
    <index>\t<tiktok-url> # <creator display name>
Lines are matched to <creator_name> by case-insensitive substring against the comment.
"""

from __future__ import annotations

import argparse
import os
import random
import re
import subprocess
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
from google.genai.errors import APIError

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ai_client import GeminiClient  # noqa: E402
from app.backend_client import BackendClient  # noqa: E402
from app.models import VideoAnalysisResult  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SAMPLES_DIR = ROOT / "samples"
MIME_TYPES = {".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm"}

# Gemini returns 5xx ("high demand") fairly often under concurrent load; those are worth
# retrying, unlike 4xx (bad request/auth), which will just fail again.
_GEMINI_MAX_ATTEMPTS = 4
_GEMINI_RETRY_BASE_SECONDS = 5.0

_LINE_RE = re.compile(r"^(?:\d+\s+)?(?P<url>\S+)(?:\s*#\s*(?P<name>.+))?$")
_VIDEO_ID_RE = re.compile(r"/video/(\d+)")


@dataclass
class ClipLink:
    tiktok_video_id: str
    url: str


@dataclass
class ClipResult:
    tiktok_video_id: str
    ok: bool
    detail: str


class BatchClipAnalyzer:
    """Downloads, analyzes, and ingests every video-links.txt clip for one creator."""

    def __init__(
        self,
        creator_id: str,
        creator_name: str,
        links_file: Path = SAMPLES_DIR / "video-links.txt",
        samples_dir: Path = SAMPLES_DIR,
        max_workers: int = 3,
        database_uri: str | None = None,
    ) -> None:
        self.creator_id = creator_id
        self.creator_name = creator_name
        self.links_file = links_file
        self.samples_dir = samples_dir
        self.max_workers = max_workers
        self.database_uri = database_uri or os.environ.get("DATABASE_URI")

    # ── link parsing ──────────────────────────────────────────────────────────────────────
    def matching_links(self) -> list[ClipLink]:
        links: list[ClipLink] = []
        for raw_line in self.links_file.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            match = _LINE_RE.match(line)
            if not match:
                continue
            name = (match.group("name") or "").strip()
            if self.creator_name.lower() not in name.lower():
                continue
            video_id_match = _VIDEO_ID_RE.search(match.group("url"))
            if not video_id_match:
                continue
            links.append(ClipLink(tiktok_video_id=video_id_match.group(1), url=match.group("url")))
        return links

    # ── download ─────────────────────────────────────────────────────────────────────────
    def download_missing(self, links: list[ClipLink]) -> None:
        missing = [link for link in links if self._video_path(link.tiktok_video_id) is None]
        if not missing:
            return
        print(f"Downloading {len(missing)} clip(s) with yt-dlp...")
        subprocess.run(
            [
                "yt-dlp",
                *[link.url for link in missing],
                "-o", str(self.samples_dir / "%(id)s.%(ext)s"),
                "--no-playlist",
                "--no-overwrites",
            ],
            check=True,
        )

    def _video_path(self, tiktok_video_id: str) -> Path | None:
        for ext in MIME_TYPES:
            candidate = self.samples_dir / f"{tiktok_video_id}{ext}"
            if candidate.exists():
                return candidate
        return None

    # ── db ───────────────────────────────────────────────────────────────────────────────
    def ensure_clip_rows(self, links: list[ClipLink]) -> None:
        """Insert a CreatorClip row for any link that doesn't have one yet (idempotent).

        Must run before the ingest POSTs below: the backend 404s an analysis for a
        (creatorId, tikTokVideoId) it has no CreatorClip row for.
        """
        if not self.database_uri:
            raise RuntimeError("DATABASE_URI is not set — required to insert CreatorClip rows.")

        # TikTokCreateTime is NOT NULL but these are manually-picked test clips, not ones
        # fetched from TikTok's API — we don't have the real post time, so this is a
        # placeholder, not a fact about when the clip was posted.
        now = datetime.now(timezone.utc)

        conn = psycopg2.connect(self.database_uri)
        try:
            with conn.cursor() as cur:
                for link in links:
                    cur.execute(
                        'SELECT 1 FROM "CreatorClips" WHERE "CreatorId" = %s AND "TikTokVideoId" = %s',
                        (self.creator_id, link.tiktok_video_id),
                    )
                    if cur.fetchone():
                        continue
                    cur.execute(
                        """
                        INSERT INTO "CreatorClips"
                            ("Id", "CreatorId", "TikTokVideoId", "EmbedLink",
                             "ViewCount", "LikeCount", "CommentCount", "ShareCount",
                             "TikTokCreateTime", "CreatedAt")
                        VALUES (%s, %s, %s, %s, 0, 0, 0, 0, %s, %s)
                        """,
                        (str(uuid.uuid4()), self.creator_id, link.tiktok_video_id, link.url, now, now),
                    )
                    print(f"  inserted CreatorClip row for {link.tiktok_video_id}")
            conn.commit()
        finally:
            conn.close()

    # ── analyze + ingest ─────────────────────────────────────────────────────────────────
    @staticmethod
    def _analyze_with_retry(
        gemini: GeminiClient, video_bytes: bytes, mime_type: str, tik_tok_video_id: str
    ) -> VideoAnalysisResult:
        for attempt in range(1, _GEMINI_MAX_ATTEMPTS + 1):
            try:
                return gemini.analyze_video(video_bytes, mime_type, tik_tok_video_id=tik_tok_video_id)
            except APIError as exc:
                if exc.code < 500 or attempt == _GEMINI_MAX_ATTEMPTS:
                    raise
                delay = _GEMINI_RETRY_BASE_SECONDS * (2 ** (attempt - 1)) + random.uniform(0, 1)
                print(f"  Gemini {exc.code} (attempt {attempt}/{_GEMINI_MAX_ATTEMPTS}), retrying in {delay:.1f}s...")
                time.sleep(delay)
        raise AssertionError("unreachable")  # loop always returns or raises

    def _process_one(self, gemini: GeminiClient, backend: BackendClient, link: ClipLink) -> ClipResult:
        video_path = self._video_path(link.tiktok_video_id)
        if video_path is None:
            return ClipResult(link.tiktok_video_id, False, "clip file not found after download")
        mime_type = MIME_TYPES[video_path.suffix.lower()]
        try:
            result = self._analyze_with_retry(gemini, video_path.read_bytes(), mime_type, link.tiktok_video_id)
            payload = result.model_dump(mode="json", by_alias=True)
            backend.post_clip_analysis(self.creator_id, link.tiktok_video_id, payload)
        except Exception as exc:  # noqa: BLE001 - one clip's failure must not kill the batch
            return ClipResult(link.tiktok_video_id, False, str(exc))
        return ClipResult(link.tiktok_video_id, True, "sent")

    def run(self) -> list[ClipResult]:
        links = self.matching_links()
        if not links:
            print(f"No lines in {self.links_file} match creator_name={self.creator_name!r}")
            return []

        self.download_missing(links)
        self.ensure_clip_rows(links)

        results: list[ClipResult] = []
        gemini = GeminiClient()
        with BackendClient() as backend, ThreadPoolExecutor(max_workers=self.max_workers) as pool:
            futures = {pool.submit(self._process_one, gemini, backend, link): link for link in links}
            for future in as_completed(futures):
                link = futures[future]
                result = future.result()
                results.append(result)
                status = "OK" if result.ok else "FAILED"
                print(f"[{status}] {link.tiktok_video_id}: {result.detail}")

        ok_count = sum(1 for r in results if r.ok)
        print(f"\n{ok_count}/{len(results)} clips analyzed and sent.")
        return results


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("creator_id", help="Backend creator GUID (must already exist in the Creators table)")
    parser.add_argument("creator_name", help="Substring to match against the # comment in video-links.txt")
    parser.add_argument("--links-file", type=Path, default=SAMPLES_DIR / "video-links.txt")
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--database-uri", default=None, help="Defaults to $DATABASE_URI")
    args = parser.parse_args()

    BatchClipAnalyzer(
        creator_id=args.creator_id,
        creator_name=args.creator_name,
        links_file=args.links_file,
        max_workers=args.workers,
        database_uri=args.database_uri,
    ).run()


if __name__ == "__main__":
    main()
