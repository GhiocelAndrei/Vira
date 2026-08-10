"""
Client for the .NET backend (the API gateway). The ai-service never talks to TikTok or the DB
directly — it reads seeded/real creator data through the backend. This wraps the /creators
endpoints and parses the responses into the Pydantic models in app.models.

Usage:
    from app.backend_client import BackendClient

    with BackendClient("https://vira-backend.<...>.azurecontainerapps.io") as client:
        for creator in client.fetch_all():
            print(creator.display_name, creator.aggregates.engagement_rate)
"""
from __future__ import annotations

import os

import httpx

from app.models import CreatorCategory, CreatorSummary, PortraitRequest

DEFAULT_BASE_URL = os.getenv("BACKEND_BASE_URL") or os.getenv("VIRA_BACKEND_URL") or "http://localhost:8080"
DEFAULT_SERVICE_KEY = os.getenv("BACKEND_SERVICE_KEY", "")


class BackendClient:
    """Reads creator data from the backend and posts analyzer results back to it."""

    def __init__(
        self,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 30.0,
        service_key: str = DEFAULT_SERVICE_KEY,
    ):
        self._client = httpx.Client(base_url=base_url.rstrip("/"), timeout=timeout)
        self._service_key = service_key

    # ── lifecycle ──────────────────────────────────────────────────────────────────────────
    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "BackendClient":
        return self

    def __exit__(self, *exc) -> None:
        self.close()

    # ── endpoints ──────────────────────────────────────────────────────────────────────────
    def health(self) -> dict:
        resp = self._client.get("/health")
        resp.raise_for_status()
        return resp.json()

    def list_creators(self, category: CreatorCategory | str | None = None) -> list[CreatorSummary]:
        """GET /creators — every seeded creator, optionally filtered by category."""
        params = {}
        if category is not None:
            params["category"] = category.value if isinstance(category, CreatorCategory) else category
        resp = self._client.get("/creators", params=params)
        resp.raise_for_status()
        return [CreatorSummary.model_validate(row) for row in resp.json()]

    def get_creator(self, creator_id: str) -> PortraitRequest:
        """GET /creators/{id} — the full assembled view (profile + clips + aggregates + questionnaire)."""
        resp = self._client.get(f"/creators/{creator_id}")
        resp.raise_for_status()
        return PortraitRequest.model_validate(resp.json())

    def fetch_all(self, category: CreatorCategory | str | None = None) -> list[PortraitRequest]:
        """List creators, then pull each one's full detail. Returns every seeded creator."""
        return [self.get_creator(row.id) for row in self.list_creators(category)]

    def generate_portrait(self, creator_id: str) -> dict:
        """POST /creators/{id}/portrait — assemble the payload and run it through the ai-service."""
        resp = self._client.post(f"/creators/{creator_id}/portrait")
        resp.raise_for_status()
        return resp.json()

    def post_clip_analysis(self, creator_id: str, tik_tok_video_id: str, payload: dict) -> None:
        """POST /creator/{id}/clips/{videoId}/analysis — persist a video-analysis for one clip.

        ``payload`` is the analyzer output as a plain JSON dict (envelope: ``analysis``, ``aiModel``,
        ``promptVersion``, ``ontologyVersion``, ``analyzedAt``); the backend stores it verbatim.
        Service-to-service: authenticated with the shared X-Service-Key header (no creator session).
        """
        resp = self._client.post(
            f"/creator/{creator_id}/clips/{tik_tok_video_id}/analysis",
            json=payload,
            headers={"X-Service-Key": self._service_key},
        )
        resp.raise_for_status()


if __name__ == "__main__":
    # Quick manual check: python -m app.backend_client  (honors VIRA_BACKEND_URL)
    import sys

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # Romanian diacritics on Windows consoles
    with BackendClient() as client:
        print("health:", client.health())
        creators = client.fetch_all()
        print(f"fetched {len(creators)} creators")
        for c in creators[:5]:
            print(f"  {c.display_name:<22} {c.category.value:<10} "
                  f"{c.follower_count:>9,} followers  {len(c.clips)} clips  "
                  f"ER={c.aggregates.engagement_rate:.3f}  {c.city}")
