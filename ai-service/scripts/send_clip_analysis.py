"""Local smoke test: analyze a clip with Gemini and POST it to the backend's ingest
endpoint (CreatorController.IngestAnalysis).

Usage:
    export GEMINI_API_KEY=your-gemini-api-key
    export BACKEND_BASE_URL=https://vira-backend.lemonfield-d6638dd6.westeurope.azurecontainerapps.io
    export BACKEND_SERVICE_KEY=your-backend-service-key
    python scripts/send_clip_analysis.py <creator_id> [video_path] [tiktok_video_id]

    video_path defaults to the first file in samples/.
    tiktok_video_id defaults to the video's filename stem (matches sample naming, e.g.
    samples/7668771088213527830.mp4 -> tikTokVideoId 7668771088213527830). The creator must
    already have a CreatorClip with that tikTokVideoId, or the backend returns 404.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ai_client import GeminiClient  # noqa: E402
from app.backend_client import BackendClient  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
MIME_TYPES = {".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm"}


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python scripts/send_clip_analysis.py <creator_id> [video_path] [tiktok_video_id]")
        raise SystemExit(1)

    creator_id = sys.argv[1]

    if len(sys.argv) > 2:
        video_path = Path(sys.argv[2])
    else:
        clips = sorted(p for p in (ROOT / "samples").glob("*") if p.suffix.lower() in MIME_TYPES)
        if not clips:
            print("No video_path given and none found in samples/. Drop a clip there first.")
            raise SystemExit(1)
        video_path = clips[0]

    tiktok_video_id = sys.argv[3] if len(sys.argv) > 3 else video_path.stem

    mime_type = MIME_TYPES.get(video_path.suffix.lower(), "video/mp4")
    print(f"Analyzing {video_path.name} with Gemini...")
    result = GeminiClient().analyze_video(video_path.read_bytes(), mime_type, tik_tok_video_id=tiktok_video_id)
    print(result.model_dump_json(by_alias=True, indent=2))

    payload = result.model_dump(mode="json", by_alias=True)

    print(f"\nPOST /creator/{creator_id}/clips/{tiktok_video_id}/analysis")
    with BackendClient() as client:
        client.post_clip_analysis(creator_id, tiktok_video_id, payload)
    print("Accepted.")


if __name__ == "__main__":
    main()
