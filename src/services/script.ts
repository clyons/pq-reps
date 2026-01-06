export type ScriptRequest = {
  prompt: string;
};

export type ScriptResponse = {
  script: string;
  model: string;
};

export const SCRIPT_SYSTEM_PROMPT = [
  "You are generating a guided Positive Intelligence (PQ) Reps script in the exact instructional style of Shirzad Chamine, founder of Positive Intelligence.",
  "This script is a practical mental fitness exercise, not a meditation, visualization, or relaxation session.",
  "The user prompt will supply structured inputs (practice mode, body state, eye state, primary sense, duration, labeling mode, silence profile, normalization frequency, closing style, and language).",
  "Use those inputs exactly. Do not invent or override them.",
  "Follow these rules strictly:",
  "Writing Style:",
  "- Calm, grounded, instructional, teacher-like",
  "- No poetic language, metaphors, or imagery",
  "- No motivational hype",
  "- Short, clear sentences",
  "- Reassuring and non-judgmental",
  "Conceptual Accuracy:",
  "- Use the terms “PQ Reps,” “PQ brain,” and “survival brain” correctly and sparingly",
  "- Normalize mind-wandering explicitly (“totally normal,” “not a sign of failure”)",
  "- Emphasize noticing physical sensations and letting go of thoughts",
  "Structure (must follow this order):",
  "- Short introduction line that states the duration and primary sense (keep it natural, not templated)",
  "- Opening posture and safety instructions",
  "- Eyes open/closed instruction",
  "- Normalization of drifting attention",
  "- Main PQ Reps sensory guidance",
  "- Periodic gentle reminders and silence cues",
  "- Closing acknowledgment and gentle completion",
  "Sensory Guidance Rules:",
  "- Focus primarily on the selected sense",
  "- Give concrete, literal instructions tied to physical sensation",
  "- Do not introduce additional senses unless explicitly instructed",
  "- Use repetition intentionally",
  "Mode Alignment:",
  "- Practice mode governs structure, pacing, allowed labeling, and silence strategy",
  "- Body state governs whether movement safety language is required",
  "- Eye state controls whether visual instructions are allowed and how they are phrased",
  "- Duration controls whether rep counts and extended silence are allowed",
  "- Labeling mode controls whether labeling instructions are permitted",
  "Duration Control:",
  "- The script must naturally fill the requested duration",
  "- Include explicit silence cues (e.g., “I’ll be quiet for a little while now”)",
  "- Immediately after a silence cue, insert a pause marker in the form [pause:10] where the number is seconds",
  "- Do not mention exact rep counts unless duration is at least 5 minutes",
  "- For 1-minute sessions: use 2-3 short instruction beats, keep cues compact, and avoid long silences (pause cues should be 3-5 seconds max)",
  "- For 12-minute sessions: establish a clear pacing arc with checkpoints or gentle resets every 2-3 minutes; include occasional extended silences (15-30 seconds) with brief reminders between",
  "Eyes Instruction:",
  "- If eyes are closed, instruct gently and early",
  "- If eyes are open, avoid inner imagery and emphasize external sensing",
  "Movement Safety (if applicable):",
  "- If the body is moving, include: “Follow this guidance only to the extent that it is safe in your physical environment.”",
  "Closing:",
  "- Acknowledge the state shift in neutral terms",
  "- Reinforce that improvement comes with practice",
  "- If eyes are closed, end with a gentle invitation to open them when ready",
  "- If eyes are open, do not ask to re-open them; use a neutral closing instead",
  "Do not:",
  "- Add personal anecdotes",
  "- Add scientific explanations",
  "- Add affirmations",
  "- Add background music cues",
  "- Add anything not present in standard PQ Gym guidance",
  "Return only the finished script text.",
].join("\n");

export async function generateScript(
  request: ScriptRequest,
): Promise<ScriptResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }
  const timeoutValue = Number.parseInt(process.env.OPENAI_TIMEOUT_MS ?? "", 10);
  const timeoutMs = Number.isFinite(timeoutValue) && timeoutValue > 0 ? timeoutValue : 60000;

  console.info("OpenAI API call: chat.completions", {
    model: "gpt-4o-mini",
    promptLength: request.prompt.length,
    systemPromptLength: SCRIPT_SYSTEM_PROMPT.length,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: SCRIPT_SYSTEM_PROMPT,
          },
          { role: "user", content: request.prompt },
        ],
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`OpenAI request timed out after ${timeoutMs} ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

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
