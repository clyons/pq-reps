export type ScriptRequest = {
  prompt: string;
};

export type ScriptResponse = {
  script: string;
  model: string;
};

export async function generateScript(
  request: ScriptRequest,
): Promise<ScriptResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You write short-form guided audio scripts. Return only the finished script text.",
        },
        { role: "user", content: request.prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI script generation failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };

  const script = payload.choices?.[0]?.message?.content?.trim();
  if (!script) {
    throw new Error("OpenAI script generation returned empty content.");
  }

  return {
    script,
    model: payload.model ?? "gpt-4o-mini",
  };
}
