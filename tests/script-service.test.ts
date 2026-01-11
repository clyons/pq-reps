import assert from "node:assert/strict";
import test from "node:test";
import { generateScript, SCRIPT_SYSTEM_PROMPT } from "../src/services/script";

type FetchCall = { input: RequestInfo | URL; init?: RequestInit };

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

test("generateScript sends an OpenAI request and returns the script", async (t) => {
  setupApiKey(t);
  const calls: FetchCall[] = [];

  setupFetchMock(t, async (input, init) => {
    calls.push({ input, init });
    return new Response(
      JSON.stringify({
        model: "gpt-4o-mini",
        choices: [{ message: { content: "Test script." } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  const result = await generateScript({ prompt: "Make a script." });

  assert.equal(result.script, "Test script.");
  assert.equal(result.model, "gpt-4o-mini");
  assert.equal(calls.length, 1);
  const { input, init } = calls[0];
  assert.equal(input, "https://api.openai.com/v1/chat/completions");
  assert.equal(init?.method, "POST");
  assert.equal(init?.headers?.["Content-Type"], "application/json");
  assert.equal(init?.headers?.Authorization, "Bearer test-key");

  const body = JSON.parse(String(init?.body));
  assert.equal(body.model, "gpt-4o-mini");
  assert.equal(body.temperature, 0.7);
  assert.deepEqual(body.messages[0], {
    role: "system",
    content: SCRIPT_SYSTEM_PROMPT,
  });
  assert.deepEqual(body.messages[1], { role: "user", content: "Make a script." });
});

test("generateScript surfaces OpenAI errors", async (t) => {
  setupApiKey(t);

  setupFetchMock(t, async () =>
    new Response("nope", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    }),
  );

  await assert.rejects(
    () => generateScript({ prompt: "Make a script." }),
    /OpenAI script generation failed: 500 nope/,
  );
});
