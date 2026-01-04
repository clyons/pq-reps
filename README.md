# PQ Reps Guided Audio Generator

**Version:** 0.2.0

Generate guided PQ Rep audio scripts and placeholder audio URLs tailored by sense, eye position, duration, and language.

## What’s included
- Prompt builder utilities and templates in `src/lib/`
- A minimal HTTP API server exposing `POST /api/generate`
- OpenAI TTS integration that returns audio bytes directly
- Server-sent events for generation status updates via `Accept: text/event-stream`

## Spec task list
- [x] Define core prompt builder types and templates.
- [x] Implement a `POST /api/generate` endpoint for script + audio metadata.
- [x] Provide local setup instructions for macOS.
- [x] Build a configuration UI for sense, eyes, duration, and language.
- [x] Add OpenAI TTS integration with direct audio bytes (no storage).
- [x] Update prompts to generate on-brand PQ Reps scripts.
- [x] Ensure text + audio uses a single generation pass to keep script/audio in sync.
- [x] Improve the tone and pacing of PQ Reps scripts.
- [x] Add console disclosure when running against the OpenAI TTS API.
- [x] Stream status updates with SSE for `/api/generate`.
- [ ] Add user-facing AI-generated voice disclosure in the UI.
- [ ] Add tests for prompt outline (API validation coverage exists in `tests/generate-api.test.ts`).
- [ ] Reduce latency by using the Speech API to support realtime audio streaming via chunked transfer encoding.
- [ ] Consider routing all audio (streamed and downloaded) through `/api/tts`.
- [ ] Replace drop-downs with pills or other friendlier UI elements
- [ ] Add common scenarios for PQ Reps which have their own settings / prompts
- [ ] Include one-line user-customisible scenario with tight guardrails, e.g. "walking the dog"
- [ ] Align script timings more closely to actual spoken duration (especially 1 min and 12 min)
- [ ] Update the WAV filenames to include "metadata" -- speaker, duration, focus, datetime

## WIP: Streaming audio
- Investigate OpenAI Speech API chunked streaming support for TTS audio bytes.
- Prototype server-side chunked transfer encoding for `/api/generate`.
- Add client playback buffering indicators for partial audio responses.

## Local setup (macOS)

### Prerequisites
- **Node.js 18+** (recommend via Homebrew or nvm)

### Install dependencies
```bash
npm install
```

### Configure environment
Create a `.env.local` file with your OpenAI API key (auto-loaded on startup):
```bash
OPENAI_API_KEY=your_api_key_here
```

### Run the API locally
```bash
npm run dev
```

The server starts on `http://localhost:3000`.

### Try the API
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
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

### Debug & streaming
- `outputMode` controls response format:
  - `text` returns JSON only.
  - `audio` returns raw audio bytes (non-JSON).
  - `text-audio` returns JSON plus audio metadata.
- Stream JSON by setting `Accept: text/event-stream`. The server emits `status`, `done`,
  and `error` SSE events.
- Set `debugTtsPrompt: true` to include `ttsPrompt` in JSON responses. The UI also enables
  this in dev mode via `?dev=1`.
- Use `ttsNewlinePauseSeconds` to insert pause markers between sentences in TTS output.

## Build and run (optional)
```bash
npm run build
npm start
```

## Notes
- The API defaults to OpenAI TTS voice `alloy`, with language-based fallbacks (`en: alloy`, `es: nova`, `fr: nova`, `de: alloy`).
- `voiceStyle` must be one of: `alloy`, `ash`, `nova`, `onyx`.
