# PQ Reps Guided Audio Generator

**Version:** 0.6.0

Generate guided PQ Rep audio scripts and placeholder audio URLs tailored by sense, eye position, duration, and language.

## What’s included
- Prompt builder utilities and templates in `src/lib/`
- A minimal HTTP API server exposing `POST /api/generate`
- OpenAI TTS integration that returns audio bytes directly
- Server-sent events for generation status updates via `Accept: text/event-stream`

## Changelog

### 0.6.0
- Improve the prompt drift harness with export automation, leaner debug reporting, and refreshed test cases.
- Add validation coverage for practice configuration and quick access scenarios.
- Fix scenario defaults for wind-down flow and resolve practice mode errors in scenario handling.
- Refine prompt parameter descriptions and remove the custom scenario line from prompts while the UI is disabled.

### 0.5.0
- Split long TTS scripts to avoid 401/500 errors.
- Document Cloud Run deployment and the logs helper script.
- Localize UI strings and scenario labels.
- Add API key auth checks plus in-memory rate limiting.

### 0.4.0
- Ensure streaming pauses emit silence for WAV responses.
- Fix newline pause insertion and update newline pause defaults.
- Replace dropdowns with pill radios and update preview controls.
- Apply styling updates across the UI.

### 0.3.0
- Force streaming WAV output and enable WAV streaming MIME types.
- Stream TTS audio as segments arrive for progressive playback.

### 0.2.0
- Add streaming audio support for generation.
- Add script download links to the UI.
- Log script and audio generation timing.
- Add UI disclosures for AI-generated audio.

### 0.1.0
- Add prompt config types and the prompt builder.
- Add the `POST /api/generate` API route with validation and TTS.
- Add the main page form-based UI for generation.
- Add local dev server setup guidance.

## Spec task list
- [x] Define core prompt builder types and templates.
- [x] Implement a `POST /api/generate` endpoint for script + audio metadata.
- [x] Provide local setup instructions for macOS.
- [x] Build a configuration UI for sense, eyes, duration, and language.
- [x] Add OpenAI TTS integration with direct audio bytes (no storage).
- [x] Update prompts to generate on-brand PQ Reps scripts.
- [x] Improve the tone and pacing of PQ Reps scripts.
- [x] Ensure text + audio uses a single generation pass to keep script/audio in sync.
- [x] Add console disclosure when running against the OpenAI TTS API.
- [x] Stream status updates with SSE for `/api/generate`.
- [x] Add user-facing AI-generated voice disclosure in the UI.
- [x] Reduce latency by using the Speech API to support realtime audio streaming via chunked transfer encoding.
- [x] Consider routing all audio (streamed and downloaded) through `/api/tts`.
- [x] Update the WAV filenames to include "metadata" -- speaker, duration, focus, datetime
- [x] Replace drop-downs with pills or other friendlier UI elements
- [x] Remove duplicate newline pauses before passing to TTS
- [x] Remove the Loading preview / playing preview text. Use a Play icon, Loading icon and Stop icon inside the Preview pill in place of the >.
- [x] Allow the user to stop the voice Preview from playing by clicking the button a second time. Revert the button to show the play button once more.
- [x] Add common scenarios for PQ Reps which have their own settings / prompts:
  - Calm me now (Still, eyes open, touch)
  - Get present for a meeting (Still, eyes open, touch)
  - Start the thing I’m avoiding (Moving, touch)
  - Prepare for a tough conversation (Still, eyes open, sight)
  - Reset after feedback (Labeling, hearing)
  - Wind down for sleep (Still, eyes closed, breath)
  - Daily deep reset (Still, eyes closed, touch)
- [x] Add tests for prompt outline (API validation coverage exists in `tests/generate-api.test.ts`).
- [x] Secure the endpoints against unauthorised access
- [x] Localise the whole site to 4 languages (English, German, Spanish, French)
- [x] Add test harness to test script output and guard against prompt drift
- [x] Refine test harness to produce more passing tests
- [x] Improve prompt handling for common scenarios and introduce new state for sleep
- [ ] Include one-line user-customisible scenario with tight guardrails, e.g. "walking the dog" (Notes: server-side guardrail validation exists, but UI input + validation wiring still pending.)
- [ ] Improve prompt handling for custom scenario line before re-enabling UI input (Notes: prompt does not include custom scenario lines until the feature is re-enabled.)
- [ ] Align script timings more closely to actual spoken duration (especially 1 min and 12 min) (Notes: pacing guidance exists in prompts, but no runtime timing calibration.)
- [ ] Fix/enable straming in Mobile Safari
- [ ] Add deploy script via Github Actions

## Streaming audio
- `/api/tts` supports streaming WAV audio when you set the `x-tts-streaming: 1` header.
- `/api/generate` also supports streaming audio when `outputMode=audio` and `x-tts-streaming: 1` are set.
- Streaming responses send a WAV header first, followed by chunked audio bytes.
- Pause markers like `[pause:2]` are preserved in streaming output as silent PCM buffers.

## Local setup (macOS)

### Prerequisites
- **Node.js 18+** (recommend via Homebrew or nvm)

### Install dependencies
```bash
npm install
```

### Configure environment
Create a `.env.local` file with your OpenAI API key and API auth secret (auto-loaded on startup):
```bash
OPENAI_API_KEY=your_api_key_here
API_KEY=your_api_key_here
```

Optional rate limit tuning for `/api/*` requests (in-memory, per IP or `x-api-key`):
```bash
# Allow 60 requests per 60-second window (token bucket defaults).
RATE_LIMIT_MAX_REQUESTS=60
RATE_LIMIT_WINDOW_SECONDS=60
```

### Run the API locally
```bash
npm run dev
```

The server starts on `http://localhost:3000`.

### Try the API
Provide the API key via `Authorization: Bearer <token>` or `x-api-key`.
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "practiceMode": "sitting",
    "bodyState": "still_seated",
    "eyeState": "open_focused",
    "primarySense": "breath",
    "durationMinutes": 5,
    "labelingMode": "none",
    "silenceProfile": "short_pauses",
    "normalizationFrequency": "periodic",
    "closingStyle": "pq_framed",
    "senseRotation": "guided_rotation",
    "languages": ["en", "es"],
    "audience": "busy professionals",
    "voiceStyle": "sage"
  }'
```

Example response:
```json
{
  "script": "Hook (calm): Imagine ...",
  "metadata": {
    "practiceMode": "sitting",
    "bodyState": "still_seated",
    "eyeState": "open_focused",
    "primarySense": "breath",
    "durationMinutes": 5,
    "labelingMode": "none",
    "silenceProfile": "short_pauses",
    "normalizationFrequency": "periodic",
    "closingStyle": "pq_framed",
    "senseRotation": "guided_rotation",
    "languages": ["en", "es"],
    "prompt": "...",
    "ttsProvider": "openai",
    "voice": "sage"
  }
}
```

To download audio bytes directly, omit the `Accept: application/json` header. The response
will be `audio/wav` with `Content-Disposition: attachment; filename="pq-reps.wav"`.

### Streaming audio (WAV)
Both `POST /api/tts` and `POST /api/generate` support chunked WAV streaming when you send
`x-tts-streaming: 1`. The WAV header is sent first, then audio chunks follow as they are
generated.

`POST /api/tts` expects:
```json
{
  "script": "string",
  "language": "en",
  "voice": "alloy",
  "ttsNewlinePauseSeconds": 1
}
```

Example streaming call:
```bash
curl -s -H "x-tts-streaming: 1" -H "Content-Type: application/json" \
  -d '{"script":"[pause:2]Hello\\nWorld","language":"en","voice":"alloy","ttsNewlinePauseSeconds":4}' \
  http://localhost:3000/api/tts > out.wav
```

Notes:
- Use `[pause:<seconds>]` markers in scripts to insert explicit silences. These pauses are
  preserved in streaming audio as silence buffers.
- Set `ttsNewlinePauseSeconds` to automatically insert pauses between newline-delimited
  sentences before audio synthesis.

### Debug & streaming
- `outputMode` controls response format:
  - `text` returns JSON only.
  - `audio` returns raw audio bytes (non-JSON).
  - `text-audio` returns JSON plus audio metadata.
- Stream JSON by setting `Accept: text/event-stream`. The server emits `status`, `done`,
  and `error` SSE events.

## Prompt drift harness
The harness can generate scripts or validate existing outputs for the prompt drift test cases.

### OpenAI provider (generate + validate)
Run the harness against the OpenAI API by loading your `.env.local` and selecting the
OpenAI provider:

```bash
set -a; source .env.local; set +a
node --import tsx scripts/export-script-system-prompt.ts --out scripts/prompt-drift/system.txt
node --import tsx scripts/harness.ts \
  --system scripts/prompt-drift/system.txt \
  --cases scripts/prompt-drift/test-cases.example.json \
  --out scripts/prompt-drift/output \
  --provider openai
```

### Mock provider (generate + validate)
Use the mock provider to generate placeholder outputs and validate them without calling
the OpenAI API:

```bash
node --import tsx scripts/harness.ts \
  --system scripts/prompt-drift/system.txt \
  --cases scripts/prompt-drift/test-cases.example.json \
  --out scripts/prompt-drift/output \
  --provider mock
```

### Reuse outputs (validate only)
If outputs already exist under `scripts/prompt-drift/output/outputs`, validate them without
generating new scripts:

```bash
node --import tsx scripts/harness.ts \
  --system scripts/prompt-drift/system.txt \
  --cases scripts/prompt-drift/test-cases.example.json \
  --out scripts/prompt-drift/output \
  --reuse-outputs
```
- Set `debugTtsPrompt: true` to include `ttsPrompt` in JSON responses. The UI also enables
  this in dev mode via `?dev=1`.
- Use `ttsNewlinePauseSeconds` to insert pause markers between sentences in TTS output.

## Build and run (optional)
```bash
npm run build
npm start
```

## Deployment / Production Environment

### Runtime
- Platform: Google Cloud Run
- Region: us-east1
- Runtime: Node.js 20 (Docker-based)
- Execution model: Stateless HTTP service with scale-to-zero enabled
- Each Cloud Run instance runs the same Node server; instances are created and
  destroyed automatically based on incoming traffic.

### Scaling & Limits
- Max instances: 3
- Concurrency: 5 requests per instance (maximum ~15 concurrent requests total)
- Request timeout: 600s (10 min)
- Long-running audio generation requests occupy a concurrency slot for their
  duration.

### Networking
- The server must bind to `0.0.0.0` and read the port from `process.env.PORT`.
- Cloud Run injects `PORT=8080` at runtime.

### Secrets & Configuration
- Secrets are provided via Google Secret Manager, not `.env` files.
- Injected environment variables:
  - `OPENAI_API_KEY` — OpenAI API access (used only for OpenAI calls).
  - `API_KEY` — Shared secret used to authenticate incoming requests.
- `.env` / `.env.local` are local development only and are ignored in production.

### Authentication
- Endpoints are protected via a shared API key (`API_KEY`) supplied by the
  client (e.g. header-based auth).
- Cloud Run IAM is not used for request authentication.

### Build & Deploy
- The service is built via a Dockerfile (not buildpacks).
- Deployment command:
  ```bash
  gcloud run deploy pq-reps --source . --region us-east1
  ```
- Production runs `node dist/server.js`.

### Observability
- Logs are written to stdout/stderr and available via:
  ```bash
  gcloud run services logs read pq-reps --region us-east1
  ```
- For a friendlier log viewer, use the helper script:
  ```bash
  ./scripts/logs.sh 2h pq-reps
  ```
  Pass a custom freshness window or revision if needed (see `scripts/logs.sh`).
- Logs may interleave across multiple instances.

### Operational Assumptions
- The service is stateless.
- No in-memory state is shared across requests or instances.
- Long audio sessions may require increased timeout or chunking.

## Notes
- The API defaults to OpenAI TTS voice `alloy`, with language-based fallbacks (`en: alloy`, `es: nova`, `fr: nova`, `de: alloy`).
- `voiceStyle` must be one of: `alloy`, `ash`, `nova`, `onyx`.
