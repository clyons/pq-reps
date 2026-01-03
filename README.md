# PQ Reps Guided Audio Generator

Generate guided PQ Rep audio scripts and placeholder audio URLs tailored by sense, eye position, duration, and language.

## What’s included
- Prompt builder utilities and templates in `src/lib/`
- A minimal HTTP API server exposing `POST /api/generate`
- Placeholder TTS service that returns a fake audio URL

## Local setup (macOS)

### Prerequisites
- **Node.js 18+** (recommend via Homebrew or nvm)

### Install dependencies
```bash
npm install
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
  "audioUrl": "https://example.com/audio/....mp3",
  "metadata": {
    "sense": "calm",
    "languages": ["en"],
    "durationSeconds": 120,
    "prompt": "...",
    "ttsProvider": "placeholder-tts"
  }
}
```

## Build and run (optional)
```bash
npm run build
npm start
```

## Notes
- The TTS provider is a placeholder in `src/services/tts.ts`. Swap this for a real provider when ready.
