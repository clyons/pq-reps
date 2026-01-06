import assert from "node:assert/strict";
import test from "node:test";
import { synthesizeSpeechStream } from "../src/services/tts";

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

test("streaming TTS preserves pause markers and newline pauses", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;

  const format: WavFormat = {
    sampleRate: 8000,
    channels: 1,
    bitsPerSample: 16,
  };
  const audioData = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const wavBuffer = buildWav(format, audioData);

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
  const bytesPerSample = format.bitsPerSample / 8;
  const firstPauseBytes =
    Math.round(0.25 * format.sampleRate) * format.channels * bytesPerSample;
  const newlinePauseBytes =
    Math.round(0.5 * format.sampleRate) * format.channels * bytesPerSample;
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
