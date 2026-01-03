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
- [ ] Build a configuration UI for sense, eyes, duration, and language.
- [x] Add OpenAI TTS integration with direct audio bytes (no storage).
- [ ] Support multi-language template expansion beyond English/Spanish.
- [ ] Add tests for prompt outline and API validation.
- [ ] Add user-facing AI-generated voice disclosure in the UI.
- [x] Add console disclosure when running against the OpenAI TTS API.

## Local setup (macOS)

### Prerequisites
- **Node.js 18+** (recommend via Homebrew or nvm)

### Install dependencies
```bash
npm install
```

### Configure environment
Create a `.env.local` file with your OpenAI API key:
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
    "sense": "calm",
    "languages": ["en"],
    "durationSeconds": 120,
    "audience": "PQ practitioners",
    "topic": "building focus",
    "voiceStyle": "warm and grounded"
  }'
```

Example response:
```json
{
  "script": "Hook (calm): Imagine ...",
  "metadata": {
    "sense": "calm",
    "languages": ["en"],
    "durationSeconds": 120,
    "prompt": "...",
    "ttsProvider": "openai",
    "voice": "marin"
  }
}
```

To download audio bytes directly, omit the `Accept: application/json` header. The response
will be `audio/mpeg` with a `Content-Disposition` attachment header.

## Build and run (optional)
```bash
npm run build
npm start
```

## Notes
- The API defaults to OpenAI TTS voice `marin` and selects a fallback voice per language.
