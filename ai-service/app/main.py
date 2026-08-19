from fastapi import FastAPI

from app.routers import assistant, embeddings, portrait, video_analyzer

app = FastAPI(title="Vira AI Service")


@app.get("/health")
def health():
    return {"status": "ok", "service": "vira-ai"}


app.include_router(portrait.router)
app.include_router(assistant.router)
app.include_router(video_analyzer.router)
app.include_router(embeddings.router)
