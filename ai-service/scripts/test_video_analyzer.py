"""Local smoke test for the Video Analyzer agent — calls GeminiClient directly, no server needed.

Usage:
    export GEMINI_API_KEY=...
    python scripts/test_video_analyzer.py                  # runs the clip(s) listed in samples/video-link.txt
    python scripts/test_video_analyzer.py samples/hook.mp4  # or specific files
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ai_client import GeminiClient  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SAMPLES = ROOT / "samples"
LINKS_FILE = SAMPLES / "video-link.txt"
MIME_TYPES = {".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm"}
VIDEO_ID_RE = re.compile(r"/video/(\d+)")


def paths_from_links_file() -> list[Path]:
    if not LINKS_FILE.exists():
        return []
    video_ids = VIDEO_ID_RE.findall(LINKS_FILE.read_text())
    paths = []
    for video_id in video_ids:
        for ext in MIME_TYPES:
            candidate = SAMPLES / f"{video_id}{ext}"
            if candidate.exists():
                paths.append(candidate)
                break
        else:
            print(f"No downloaded clip found for video ID {video_id} — run yt-dlp first.")
    return paths


def main() -> None:
    paths = [Path(p) for p in sys.argv[1:]]
    if not paths:
        paths = paths_from_links_file()
    if not paths:
        print(f"No clips given and none matched {LINKS_FILE.relative_to(ROOT)}.")
        raise SystemExit(1)

    client = GeminiClient()
    for path in paths:
        mime_type = MIME_TYPES.get(path.suffix.lower(), "video/mp4")
        print(f"\n=== {path.name} ===")
        result = client.analyze_video(path.read_bytes(), mime_type, tik_tok_video_id=path.stem)
        print(result.model_dump_json(by_alias=True, indent=2))


if __name__ == "__main__":
    main()
