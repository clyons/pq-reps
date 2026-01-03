# PQ Reps Guided Audio Generator

Generate guided PQ Rep audio scripts and placeholder audio URLs tailored by sense, eye position, duration, and language.

## What’s included
- Prompt builder utilities and templates in `src/lib/`
- A minimal HTTP API server exposing `POST /api/generate`
- OpenAI TTS integration that returns audio bytes directly

## Spec task list
- [x] Define core prompt builder types and templates.
- [x] Implement a `POST /api/generate` endpoint for script + audio metadata.
- [x] Provide local setup instructions for macOS.
- [x] Build a configuration UI for sense, eyes, duration, and language.
- [x] Add a UI toggle for text-only, audio-only, or text + audio output.
- [x] Add OpenAI TTS integration with direct audio bytes (no storage).
- [x] Update prompts to generate on-brand PQ Reps scripts.
- [x] Ensure text + audio uses a single generation pass to keep script/audio in sync.
- [ ] Support multi-language template expansion beyond English/Spanish.
- [ ] Add tests for prompt outline and API validation.
- [ ] Add user-facing AI-generated voice disclosure in the UI.
- [ ] Improve the tone and pacing of PQ Reps scripts.
- [ ] Reduce latency by using The Speech API to support realtime audio streaming via chunked transfer encoding.
- [x] Add console disclosure when running against the OpenAI TTS API.

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
will be `audio/mpeg` with a `Content-Disposition` attachment header.

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
- The API defaults to OpenAI TTS voice `marin` and selects a fallback voice per language.
- `voiceStyle` must be one of: `alloy`, `ash`, `ballad`, `cedar`, `coral`, `echo`, `fable`, `marin`, `nova`, `onyx`, `sage`, `shimmer`, `verse`.
- The UI calls `GET /version` to display the app version string.
