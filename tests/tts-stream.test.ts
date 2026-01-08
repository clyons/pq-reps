import assert from "node:assert/strict";
import { once } from "node:events";
import type { IncomingMessage, ServerResponse } from "node:http";
import { PassThrough } from "node:stream";
import test from "node:test";
import handler from "../src/pages/api/tts";
import {
  DEFAULT_TTS_NEWLINE_PAUSE_SECONDS,
  synthesizeSpeechStream,
} from "../src/services/tts";

type WavFormat = {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
};

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

const setupTtsFixture = (t: { after: (fn: () => void) => void }, wavBuffer: Buffer) => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;

  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async () =>
    new Response(wavBuffer, {
      status: 200,
      headers: { "Content-Type": "audio/wav" },
    });

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (typeof originalApiKey === "undefined") {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  });
};

const createMockRequest = (payload: unknown, headers: Record<string, string>) => {
  const req = new PassThrough() as IncomingMessage;
  req.method = "POST";
  req.headers = headers;
  process.nextTick(() => {
    req.end(JSON.stringify(payload));
  });
  return req;
};

const createMockResponse = () => {
  const res = new PassThrough() as ServerResponse;
  const headers = new Map<string, string>();
  res.statusCode = 200;
  res.setHeader = (name: string, value: number | string | string[]) => {
    headers.set(name.toLowerCase(), Array.isArray(value) ? value.join(",") : String(value));
  };
  res.getHeader = (name: string) => headers.get(name.toLowerCase());
  return { res, headers };
};

const readResponseBody = async (res: PassThrough) => {
  const chunks: Buffer[] = [];
  res.on("data", (chunk) => {
    chunks.push(Buffer.from(chunk));
  });
  await once(res, "finish");
  return Buffer.concat(chunks);
};

test("streaming TTS preserves pause markers and newline pauses", async (t) => {
  const wavBuffer = buildFixtureWav();
  const audioData = wavBuffer.subarray(44);
  setupTtsFixture(t, wavBuffer);

  const ttsResult = await synthesizeSpeechStream({
    script: "[pause:0.25]Hello\nWorld",
    language: "en",
    voice: "alloy",
    newlinePauseSeconds: 0.5,
  });

  const chunks: Buffer[] = [];
  for await (const chunk of ttsResult.stream) {
    chunks.push(chunk);
  }

  const output = Buffer.concat(chunks);
  const data = parseWavData(output);
  const firstPauseBytes = getPauseBytes(0.25);
  const newlinePauseBytes = getPauseBytes(0.5);
  const expectedLength =
    firstPauseBytes + audioData.length + newlinePauseBytes + audioData.length + newlinePauseBytes;

  assert.equal(data.length, expectedLength);

  const firstPause = data.subarray(0, firstPauseBytes);
  assert.ok(firstPause.equals(Buffer.alloc(firstPauseBytes, 0)));

  const firstAudioStart = firstPauseBytes;
  const firstAudio = data.subarray(firstAudioStart, firstAudioStart + audioData.length);
  assert.ok(firstAudio.equals(audioData));

  const secondPauseStart = firstAudioStart + audioData.length;
  const secondPause = data.subarray(secondPauseStart, secondPauseStart + newlinePauseBytes);
  assert.ok(secondPause.equals(Buffer.alloc(newlinePauseBytes, 0)));

  const secondAudio = data.subarray(secondPauseStart + newlinePauseBytes);
  assert.ok(secondAudio.equals(audioData));

  const trailingPauseStart = secondPauseStart + newlinePauseBytes + audioData.length;
  const trailingPause = data.subarray(trailingPauseStart);
  assert.ok(trailingPause.equals(Buffer.alloc(newlinePauseBytes, 0)));
});

test("streaming API applies default newline pauses when omitted", async (t) => {
  const wavBuffer = buildFixtureWav();
  const audioData = wavBuffer.subarray(44);
  setupTtsFixture(t, wavBuffer);

  const payload = {
    script: "Hello\nWorld",
    language: "en",
    voice: "alloy",
  };

  const req = createMockRequest(payload, { "x-tts-streaming": "1" });
  const { res } = createMockResponse();

  await handler(req, res);
  const output = await readResponseBody(res);
  const data = parseWavData(output);

  const pauseBytes = getPauseBytes(DEFAULT_TTS_NEWLINE_PAUSE_SECONDS);
  const expectedLength = audioData.length * 2 + pauseBytes * 2;
  assert.equal(data.length, expectedLength);

  const firstAudio = data.subarray(0, audioData.length);
  assert.ok(firstAudio.equals(audioData));

  const firstPauseStart = audioData.length;
  const firstPause = data.subarray(firstPauseStart, firstPauseStart + pauseBytes);
  assert.ok(firstPause.equals(Buffer.alloc(pauseBytes, 0)));
});

test("streaming API respects an explicit zero newline pause", async (t) => {
  const wavBuffer = buildFixtureWav();
  const audioData = wavBuffer.subarray(44);
  setupTtsFixture(t, wavBuffer);

  const payload = {
    script: "Hello\nWorld",
    language: "en",
    voice: "alloy",
    ttsNewlinePauseSeconds: 0,
  };

  const req = createMockRequest(payload, { "x-tts-streaming": "1" });
  const { res } = createMockResponse();

  await handler(req, res);
  const output = await readResponseBody(res);
  const data = parseWavData(output);

  assert.equal(data.length, audioData.length);
  assert.ok(data.equals(audioData));
});

test("streaming API applies a custom newline pause value", async (t) => {
  const wavBuffer = buildFixtureWav();
  const audioData = wavBuffer.subarray(44);
  setupTtsFixture(t, wavBuffer);

  const payload = {
    script: "Hello\nWorld",
    language: "en",
    voice: "alloy",
    ttsNewlinePauseSeconds: 0.75,
  };

  const req = createMockRequest(payload, { "x-tts-streaming": "1" });
  const { res } = createMockResponse();

  await handler(req, res);
  const output = await readResponseBody(res);
  const data = parseWavData(output);

  const pauseBytes = getPauseBytes(0.75);
  const expectedLength = audioData.length * 2 + pauseBytes * 2;
  assert.equal(data.length, expectedLength);
});

test("streaming API applies default newline pauses when omitted", async (t) => {
  const wavBuffer = buildFixtureWav();
  const audioData = wavBuffer.subarray(44);
  setupTtsFixture(t, wavBuffer);

  const payload = {
    script: "Hello\nWorld",
    language: "en",
    voice: "alloy",
  };

  const req = createMockRequest(payload, { "x-tts-streaming": "1" });
  const { res } = createMockResponse();

  await handler(req, res);
  const output = await readResponseBody(res);
  const data = parseWavData(output);

  const pauseBytes = getPauseBytes(DEFAULT_TTS_NEWLINE_PAUSE_SECONDS);
  const expectedLength = audioData.length * 2 + pauseBytes * 2;
  assert.equal(data.length, expectedLength);

  const firstAudio = data.subarray(0, audioData.length);
  assert.ok(firstAudio.equals(audioData));

  const firstPauseStart = audioData.length;
  const firstPause = data.subarray(firstPauseStart, firstPauseStart + pauseBytes);
  assert.ok(firstPause.equals(Buffer.alloc(pauseBytes, 0)));
});

test("streaming API respects an explicit zero newline pause", async (t) => {
  const wavBuffer = buildFixtureWav();
  const audioData = wavBuffer.subarray(44);
  setupTtsFixture(t, wavBuffer);

  const payload = {
    script: "Hello\nWorld",
    language: "en",
    voice: "alloy",
    ttsNewlinePauseSeconds: 0,
  };

  const req = createMockRequest(payload, { "x-tts-streaming": "1" });
  const { res } = createMockResponse();

  await handler(req, res);
  const output = await readResponseBody(res);
  const data = parseWavData(output);

  assert.equal(data.length, audioData.length);
  assert.ok(data.equals(audioData));
});

test("streaming API applies a custom newline pause value", async (t) => {
  const wavBuffer = buildFixtureWav();
  const audioData = wavBuffer.subarray(44);
  setupTtsFixture(t, wavBuffer);

  const payload = {
    script: "Hello\nWorld",
    language: "en",
    voice: "alloy",
    ttsNewlinePauseSeconds: 0.75,
  };

  const req = createMockRequest(payload, { "x-tts-streaming": "1" });
  const { res } = createMockResponse();

  await handler(req, res);
  const output = await readResponseBody(res);
  const data = parseWavData(output);

  const pauseBytes = getPauseBytes(0.75);
  const expectedLength = audioData.length * 2 + pauseBytes * 2;
  assert.equal(data.length, expectedLength);
});
