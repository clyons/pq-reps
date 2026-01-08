import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import test, { type TestContext } from "node:test";
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

const format: WavFormat = {
  sampleRate: 8000,
  channels: 1,
  bitsPerSample: 16,
};
const audioData = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
const wavBuffer = buildWav(format, audioData);
const bytesPerSample = format.bitsPerSample / 8;

const mockTtsFetch = (t: TestContext) => {
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

const fetchStreamingTts = async (t: TestContext, payload: Record<string, unknown>) => {
  const server = http.createServer((req, res) => {
    handler(req, res).catch(() => {
      res.statusCode = 500;
      res.end();
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });

  t.after(() => {
    server.close();
  });

  const { port } = server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${port}/api/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tts-streaming": "1",
    },
    body: JSON.stringify(payload),
  });

  return {
    response,
    output: Buffer.from(await response.arrayBuffer()),
  };
};

const pauseBytesFor = (seconds: number) =>
  Math.round(seconds * format.sampleRate) * format.channels * bytesPerSample;

test("streaming TTS preserves pause markers and newline pauses", async (t) => {
  mockTtsFetch(t);

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
  assert.equal(output.toString("ascii", 0, 4), "RIFF");

  const data = output.subarray(44);
  const firstPauseBytes = pauseBytesFor(0.25);
  const newlinePauseBytes = pauseBytesFor(0.5);
  const expectedLength = firstPauseBytes + audioData.length + newlinePauseBytes + audioData.length;

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
});

test("streaming /api/tts applies default newline pause when omitted", async (t) => {
  mockTtsFetch(t);

  const { response, output } = await fetchStreamingTts(t, {
    script: "Hello\nWorld",
    language: "en",
    voice: "alloy",
  });

  assert.equal(response.status, 200);
  assert.equal(output.toString("ascii", 0, 4), "RIFF");

  const data = output.subarray(44);
  const newlinePauseBytes = pauseBytesFor(DEFAULT_TTS_NEWLINE_PAUSE_SECONDS);
  const expectedLength = audioData.length + newlinePauseBytes + audioData.length;

  assert.equal(data.length, expectedLength);

  const firstAudio = data.subarray(0, audioData.length);
  assert.ok(firstAudio.equals(audioData));

  const pauseStart = audioData.length;
  const pauseSegment = data.subarray(pauseStart, pauseStart + newlinePauseBytes);
  assert.ok(pauseSegment.equals(Buffer.alloc(newlinePauseBytes, 0)));

  const secondAudio = data.subarray(pauseStart + newlinePauseBytes);
  assert.ok(secondAudio.equals(audioData));
});

test("streaming /api/tts with newline pause set to 0 inserts no pause", async (t) => {
  mockTtsFetch(t);

  const { response, output } = await fetchStreamingTts(t, {
    script: "Hello\nWorld",
    language: "en",
    voice: "alloy",
    ttsNewlinePauseSeconds: 0,
  });

  assert.equal(response.status, 200);
  assert.equal(output.toString("ascii", 0, 4), "RIFF");

  const data = output.subarray(44);

  assert.equal(data.length, audioData.length);
  assert.ok(data.equals(audioData));
});

test("streaming /api/tts respects custom newline pause length", async (t) => {
  mockTtsFetch(t);

  const { response, output } = await fetchStreamingTts(t, {
    script: "Hello\nWorld",
    language: "en",
    voice: "alloy",
    ttsNewlinePauseSeconds: 0.5,
  });

  assert.equal(response.status, 200);
  assert.equal(output.toString("ascii", 0, 4), "RIFF");

  const data = output.subarray(44);
  const newlinePauseBytes = pauseBytesFor(0.5);
  const expectedLength = audioData.length + newlinePauseBytes + audioData.length;

  assert.equal(data.length, expectedLength);

  const firstAudio = data.subarray(0, audioData.length);
  assert.ok(firstAudio.equals(audioData));

  const pauseStart = audioData.length;
  const pauseSegment = data.subarray(pauseStart, pauseStart + newlinePauseBytes);
  assert.ok(pauseSegment.equals(Buffer.alloc(newlinePauseBytes, 0)));

  const secondAudio = data.subarray(pauseStart + newlinePauseBytes);
  assert.ok(secondAudio.equals(audioData));
});
