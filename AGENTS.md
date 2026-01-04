# AGENTS.md

## Purpose
This file documents how humans and automated agents should work in this repo.

## Repo overview
- PQ Reps Guided Audio Generator API + prompt tooling.
- Key directories:
  - `src/` TypeScript source (server + prompt builder utilities).
  - `tests/` Node test runner specs.

## Development workflow
- Install dependencies: `npm install`
- Run the API locally: `npm run dev` (server at `http://localhost:3000`)
- Build: `npm run build`
- Start compiled server: `npm start`
- Run tests: `npm test`

## Configuration
- Create `.env.local` with `OPENAI_API_KEY=...` for OpenAI TTS.

## Coding conventions
- TypeScript with ES module syntax (`"type": "module"` in `package.json`).
- Prefer small, focused modules in `src/` with clear exports.
- Keep API request/response shapes in sync with tests under `tests/`.

## Common pitfalls
- `npm run dev` uses `tsx watch`, so TypeScript changes are picked up live.
- The API supports both JSON responses and raw `audio/wav`; ensure content negotiation remains intact.

## PR/commit guidance
- Use concise, imperative commit messages (e.g., "Add AGENTS guidance").
- Summarize user-visible changes in PR descriptions.
