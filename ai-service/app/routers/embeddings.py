from datetime import datetime, timezone
from functools import lru_cache

from fastapi import APIRouter

from app.ai_client import EMBEDDING_DIMENSIONS, EMBEDDING_MODEL_ID, GeminiEmbeddingClient
from app.models import EmbeddingRequest, EmbeddingResponse

router = APIRouter(prefix="/embeddings", tags=["embeddings"])


@lru_cache
def _get_client() -> GeminiEmbeddingClient:
    # Lazy singleton, same reasoning as portrait.py's _get_client: constructing genai.Client()
    # resolves GOOGLE_API_KEY, which must not happen at import time.
    return GeminiEmbeddingClient()


@router.post("", response_model=EmbeddingResponse)
def create_embedding(req: EmbeddingRequest) -> EmbeddingResponse:
    client = _get_client()
    vector = client.embed(req.text)
    return EmbeddingResponse(
        embedding=vector,
        model=EMBEDDING_MODEL_ID,
        dimensions=EMBEDDING_DIMENSIONS,
        generated_at=datetime.now(timezone.utc),
    )
