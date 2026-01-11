import assert from "node:assert/strict";
import test from "node:test";
import { synthesizeSpeech, TTS_SYSTEM_PROMPT } from "../src/services/tts";

type WavFormat = {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
};

type FetchCall = { input: RequestInfo | URL; init?: RequestInit };

const buildWav = (format: WavFormat, audioData: Buffer): Buffer => {
  const header = Buffer.alloc(44);
  const dataSize = audioData.length;
  const byteRate = (format.sampleRate * format.channels * format.bitsPerSample) / 8;
  const blockAlign = (format.channels * format.bitsPerSample) / 8;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(format.channels, 22);
  header.writeUInt32LE(format.sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(format.bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, audioData]);
};

const WAV_FORMAT: WavFormat = {
  sampleRate: 8000,
  channels: 1,
  bitsPerSample: 16,
};

const buildFixtureWav = () =>
  buildWav(WAV_FORMAT, Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]));

const getPauseBytes = (seconds: number) =>
  Math.round(seconds * WAV_FORMAT.sampleRate) *
  WAV_FORMAT.channels *
  (WAV_FORMAT.bitsPerSample / 8);

const parseWavData = (output: Buffer) => {
  assert.equal(output.toString("ascii", 0, 4), "RIFF");
  return output.subarray(44);
};

const setupApiKey = (t: { after: (fn: () => void) => void }) => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  t.after(() => {
    if (typeof originalApiKey === "undefined") {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  });
};

const setupFetchMock = (
  t: { after: (fn: () => void) => void },
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
};

test("synthesizeSpeech builds TTS requests and combines pause audio", async (t) => {
  setupApiKey(t);
  const calls: FetchCall[] = [];
  const wavBuffer = buildFixtureWav();
  const audioData = wavBuffer.subarray(44);

  setupFetchMock(t, async (input, init) => {
    calls.push({ input, init });
    return new Response(wavBuffer, {
      status: 200,
      headers: { "Content-Type": "audio/wav" },
    });
  });

  const result = await synthesizeSpeech({
    script: "Hello\nWorld",
    language: "en",
    voice: "alloy",
    newlinePauseSeconds: 0.5,
  });

  assert.equal(result.voice, "alloy");
  assert.equal(result.provider, "openai");
  assert.match(result.inputScript, /\[pause:0\.5\]/);

  const data = parseWavData(result.audio);
  const pauseBytes = getPauseBytes(0.5);
  const expectedLength = audioData.length * 2 + pauseBytes * 2;
  assert.equal(data.length, expectedLength);

  assert.equal(calls.length, 2);
  for (const { input, init } of calls) {
    assert.equal(input, "https://api.openai.com/v1/audio/speech");
    assert.equal(init?.method, "POST");
    assert.equal(init?.headers?.Authorization, "Bearer test-key");
    assert.equal(init?.headers?.["Content-Type"], "application/json");

    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "gpt-4o-mini-tts");
    assert.equal(body.voice, "alloy");
    assert.equal(body.instructions, TTS_SYSTEM_PROMPT);
    assert.equal(body.response_format, "wav");
    assert.equal(typeof body.input, "string");
  }
});
