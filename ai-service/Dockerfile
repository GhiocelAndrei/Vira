# Build context is the repo root (not ai-service/): app/ai_client.py resolves
# prompts/video-analyzer.md relative to its own location, so the image mirrors the monorepo
# layout (repo root / ai-service / app) rather than flattening ai-service to the image root.
FROM python:3.12-slim
WORKDIR /repo

COPY ai-service/requirements.txt ai-service/requirements.txt
RUN pip install --no-cache-dir -r ai-service/requirements.txt

COPY ai-service/app ai-service/app
COPY prompts prompts

WORKDIR /repo/ai-service

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
