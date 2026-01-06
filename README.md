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
- [ ] Add common scenarios for PQ Reps which have their own settings / prompts
- [ ] Include one-line user-customisible scenario with tight guardrails, e.g. "walking the dog"
- [ ] Improve prompt handling for custom scenario line before re-enabling UI input
- [ ] Align script timings more closely to actual spoken duration (especially 1 min and 12 min)
- [ ] Add tests for prompt outline (API validation coverage exists in `tests/generate-api.test.ts`).
- [ ] Secure the endpoints against unauthorised access
- [ ] Localise the whole site to 4 languages

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
