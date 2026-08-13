# ai-service (Python / FastAPI)

The AI core. `AiModelClient` black-box contract (`app/ai_client.py`).
Owns: Creator Portrait, style-aware Assistant (stubbed), and the Video Analyzer agent.

- **Backend data** — `app/backend_client.py` (`BackendClient`) reads creator data (profile,
  clips, aggregates, questionnaire) from the .NET backend's `/creators` API; never call TikTok
  or a DB directly from here. Contract: `docs/backend-integration.md`.

- **Video Analyzer** (`POST /video-analyzer`, multipart `files[]`) — `GeminiClient` sends the
  raw clip to `gemini-3.1-flash-lite` (free tier, native video understanding — no local frame
  extraction) and returns a `VideoAnalysisResult` per clip via structured output
  (`response_schema=VideoAnalysis`). Needs `GEMINI_API_KEY` (Google AI Studio).
  `gemini-2.5-flash` is no longer available to new projects (404 from Google) — flash-lite was
  picked over 3.5-flash for the cheaper/faster tier, matching the free-tier cost constraint.

## Run locally

```bash
python3 -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export GEMINI_API_KEY=...                           # AI Studio free-tier key
uvicorn app.main:app --reload --port 8000
```

Health: http://localhost:8000/health · Docs: http://localhost:8000/docs

## Testing the Video Analyzer

Drop a few short clips (a few seconds each keeps Gemini upload fast) into `samples/` —
gitignored, never commit video files. Two ways to run them:

- **Script** (fastest iteration, no server needed):
  `python scripts/test_video_analyzer.py` — runs every clip in `samples/` and pretty-prints
  each `VideoAnalysisResult`. Pass explicit paths to run a subset.
- **Swagger UI** (to check the actual HTTP endpoint): start the server, open
  `/docs`, expand `POST /video-analyzer`, "Try it out", upload one or more files.

Either way needs `GEMINI_API_KEY` exported first. Real TikTok clips work the same as any
other clip — the Display API never returns video bytes (CLAUDE.md hard limit), so this is
the same upload shape production will use, not just a test shortcut.

## Testing the Backend Client

`python scripts/test_backend_client.py [category]` — hits the live .NET backend via
`BackendClient`: health check, `fetch_all()` (optionally filtered by category, e.g. `Food`),
then `get_creator` + `generate_portrait` on the first result. Needs `VIRA_BACKEND_URL` exported
(defaults to `http://localhost:8080`). Contract details: `docs/backend-integration.md`.
