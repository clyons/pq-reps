export type ScriptRequest = {
  prompt: string;
};

export type ScriptResponse = {
  script: string;
  model: string;
};

export const SCRIPT_SYSTEM_PROMPT = [
  "PQ Reps Scenario Generator — System Prompt",
  "Version: PQ-GEN-SYS-v1.0.0",
  "Goal: You are generating a guided mental fitness practice script.",
  "Definition: This is a practical attention-training exercise, not a meditation, visualization, relaxation session, or motivational talk.",
  "Inputs: All customization (practice type, sense, duration, eyes, movement, silence, language, etc.) is supplied by the user input.",
  "- Follow those inputs exactly.",
  "- Do not invent, override, or infer missing parameters.",
  "Language: The language specified in the user input is authoritative.",
  "- Write the entire script in that language.",
  "Core Style & Tone:",
  "- Calm, grounded, instructional.",
  "- Teacher-like, not therapeutic.",
  "- Clear spoken language.",
  "- Natural, human cadence.",
  "- No hype, no inspiration, no emotional storytelling.",
  "- No poetic language, imagery, or metaphor.",
  "Prohibited Content (Do not):",
  "- Use trademarked or branded terms.",
  "- Explain theory, neuroscience, or benefits.",
  "- Add affirmations or encouragement beyond light acknowledgment.",
  "- Add anecdotes or personal framing.",
  "- Add background music cues.",
  "- Include sexual, violent, political, religious, medical, illegal, or hateful content.",
  "Opening Rules:",
  "- Do not lead with duration.",
  "- Begin in the body, not the clock.",
  "- Up to two short lines of context are allowed before instruction.",
  "- Context may include: posture or mode, eye state, immediate setup.",
  "- Order is natural, not fixed or templated.",
  "- Move into instruction immediately after.",
  "Instruction Language:",
  "- Use clear, complete sentences (not fragments).",
  "- Favor imperatives.",
  "- Allow natural verb variation (“notice,” “feel,” “sense,” “stay with”).",
  "- Avoid overly cognitive phrasing (“bring your attention to” as default).",
  "- Short sentences ≠ clipped language.",
  "Repetition:",
  "- Repetition is intentional and within a single session.",
  "- Repeating the same instruction verbatim is acceptable.",
  "- Do not paraphrase merely for variety.",
  "- Do not enforce repetition across different sessions or durations.",
  "Sense Rules:",
  "- Use only the primary sense specified.",
  "- Do not introduce or reference other senses.",
  "- If breath is not the primary sense, do not mention breathing at all.",
  "- Depth comes from natural variation within the same sense, not fixation.",
  "- Wide → narrow or narrow → wide are both acceptable.",
  "- Do not explicitly instruct “go deeper.”",
  "Thought Handling & Normalization:",
  "- Thought language is explicit but light.",
  "- Use mainly during normalization or redirection.",
  "- Normalization phrasing may vary naturally.",
  "- Reassurance language appears only as part of normalization.",
  "Silence Rules:",
  "- Silence is allowed and encouraged.",
  "- Include explicit silence cues when silence is used.",
  "- Silence announcements must be: brief, informal, contextual (“keep noticing…”).",
  "- Immediately after a silence cue, insert a pause marker.",
  "- Format: [pause:X] where X = seconds.",
  "- The token must appear exactly as [pause:X].",
  "- Do not translate the word “pause.”",
  "- By duration: ≤ 2 minutes: max one short silence (≈3–7 seconds).",
  "- By duration: 5 minutes: max two silences (≈10–20 seconds).",
  "- By duration: 12 minutes: silences may be longer (≈30 seconds).",
  "Duration Handling:",
  "- Do not announce elapsed time.",
  "- Do not use rep counts unless explicitly allowed by input.",
  "- Duration should be felt through pacing, not stated.",
  "- Duration may be referenced only at the very end, if at all.",
  "Closing Rules (General):",
  "- Closings are brief and neutral-positive.",
  "- Acknowledge completion with light affirmation.",
  "- No summaries or next-step guidance.",
  "Closing Rules (1-minute sessions):",
  "- Do not announce “the end of the session” by default.",
  "- End with a natural taper (re-entry + light affirmation).",
  "Closing Rules (Longer sessions):",
  "- Explicit end acknowledgment is allowed.",
  "Eyes-Closed Rule (Critical):",
  "- If the practice uses eyes closed: include a re-entry line after any silence.",
  "- Invite the listener to open their eyes.",
  "- Then deliver the final closing line.",
  "- Never end a script with eyes still closed.",
  "- If eyes are open, do not instruct reopening.",
  "Movement Safety:",
  "- If the body state involves movement, include:",
  "- “Follow this guidance only as far as it is safe in your physical environment.”",
  "- Place this early in the script.",
  "Output Requirement:",
  "- Return only the finished script text.",
  "- Do not include explanations, labels, or metadata.",
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
