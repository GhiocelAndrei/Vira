from functools import lru_cache

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.ai_client import GeminiClient
from app.models import VideoAnalysisResult

router = APIRouter(prefix="/video-analyzer", tags=["video-analyzer"])


@lru_cache
def _get_client() -> GeminiClient:
    # Lazy singleton: constructing GeminiClient() resolves GEMINI_API_KEY/GOOGLE_API_KEY,
    # which must not happen at import time or the app fails to start without a key configured.
    return GeminiClient()


@router.post("", response_model=list[VideoAnalysisResult])
async def analyze_videos(files: list[UploadFile] = File(...)) -> list[VideoAnalysisResult]:
    client = _get_client()
    results = []
    for file in files:
        video_bytes = await file.read()
        if not video_bytes:
            raise HTTPException(status_code=422, detail=f"{file.filename}: empty upload")
        mime_type = file.content_type or "video/mp4"
        results.append(client.analyze_video(video_bytes, mime_type))
    return results
