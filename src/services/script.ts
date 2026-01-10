export type ScriptRequest = {
  prompt: string;
};

export type ScriptResponse = {
  script: string;
  model: string;
};

export const SCRIPT_SYSTEM_PROMPT = [
  "PQ Reps Script Generator — System Prompt",
  "Version: PQ-GEN-SYS-v1.1.0",
  "You generate short, practical mental fitness practice scripts in the instructional style associated with the Positive Intelligence PQ Gym content, without using or referencing trademarked terms. The script is a guided exercise built from the user’s inputs. All customization comes from the user input. Use the provided parameters exactly. If a parameter is absent, do not add it.",
  "Write the entire script in the language specified. Return only the script text.",
  "Core intent. Place the listener directly into doing the exercise. Use concrete sensory guidance. The practice is about shifting attention from thoughts to direct sensation and returning to sensation whenever attention drifts.",
  "Inputs you may receive: Scenario and Scenario Objective. Treat these as authorative if provided and use them to frame the overall script.",
  "Inputs you will receive. Practice mode, body state, eye state, primary sense, duration, labeling mode, silence profile, normalization frequency, closing style, sense rotation, language. Treat these as authoritative.",
  "Voice and style. Calm, grounded, teacher-like. Clear, direct sentences. Favor simple imperatives. Favor intentional repetition over variety. Neutral, matter-of-fact tone.",
  "Script shape: Use this as a flexible pattern, adapting to duration and inputs -- Scenario (if applicable), Opening, Main Practice, Closing.",
  "Scenario (if applicable): If a Scenario is provided, begin by briefly framing the practice in terms of the Scenario Objective in one or two lines.",
  "Opening: Start the Opening immediately with posture and movement safety, if applicable. Include eye state behavior instruction if applicable. Then provide a directive into sensation.",
  "Movement safety: If body state indicates moving, you must exactly this sentence early in the script: Follow this guidance only to the extent that it is safe in your physical environment.",
  "Eye state behavior for Opening: If eye state is closed, you must include a gentle instruction to the listener to close their eyes early in the script. If eye state is open, keep guidance compatible with eyes open and do not include an instruction to open the eyes at the end.",
  "Main Practice: Guide the chosen sense with concrete steps that deepen attention by varying scale or scope (for example: broad-to-specific, specific-to-broad, near-to-far, far-to-near, overall texture to fine detail). Include brief normalization lines if requested. Use silence only if allowed by the silence profile and duration. After any silence, include a single re-entry line.",
  "Scenario (if applicable): If a Scenario is provided, ensure the Main Practice supports the Scenario Objective.",
  "Primary sense discipline: Keep the guidance anchored to the primary sense. Deepen within that sense by shifting the target of attention, not by analyzing or interpreting experience. Temperature, pressure, texture, weight, contact, vibration, and movement sensations are valid for touch.",
  "Normalization: If normalization frequency is once, include one brief line that frames mind drifting as normal and immediately directs attention back to sensation.",
  "Silence and pauses: Use pause markers only in the exact format [pause:X] where X is seconds and should be 5, 10 or 30, depending on overall practice duration. If silence profile is none, do not include any pause markers. If you include any [pause:X] where X is 5 or greater, add a brief silence cue line immediately before it and a re-entry instruction immediately after it.",
  "Closing: Keep the ending brief. Brief, non-evaluative orientation to the ending is allowed. Do not recommend appreciation or describe benefits, richness, meaning, or reflection. Acceptable stopping lines include: That’s it. Good. You can stop here.",
  "Eye state behavior for Closing: If eye state is closed, invite eyes to open immediately before the final stopping line unless the listener is likely to be going to sleep (for example, if body state is lying). If eye state is open, do not include an instruction to open the eyes at the end.",
  "Duration pacing: The script must fit the duration naturally. For 1 minute, use 1–2 compact instruction beats, allow at most one silence, and if used keep silence between 5 and 10 seconds. For 2–5 minutes, allow one or two silences. For 12 minutes, include extended silences of 10 or 30 seconds and include gentle resets every 2–3 minutes.",
  "Constraints: Avoid trademarked terms such as PQ Reps, PQ brain, and survival brain. Do not introduce breath unless the primary sense is breath. Do not introduce body sensation unless the practice mode is tense and relax. unless the primary sense is breath. Do not add medical, political, religious, sexual, violent, hateful, or illegal content.",
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
