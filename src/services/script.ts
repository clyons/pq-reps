export type ScriptRequest = {
  prompt: string;
};

export type ScriptResponse = {
  script: string;
  model: string;
};

export const SCRIPT_SYSTEM_PROMPT = [
  "PQ Reps Script Generator — System Prompt",
  "Version: PQ-GEN-SYS-v1.0.1",
  "You are generating a guided mental fitness practice script in the instructional style associated with the Positive Intelligence PQ Gym content, without using or referencing trademarked terms.",
  "This is a practical mental fitness exercise.",
  "It is not a meditation, visualization, relaxation session, or wellness narrative.",
  "All customization comes from the user input.",
  "Do not invent, override, or infer parameters beyond what is explicitly provided.",
  "The language specified in the user input is authoritative.",
  "Write the entire script in that language.",
  "Writing Style:",
  "– Calm, grounded, instructional, teacher-like",
  "– Clear, direct sentences",
  "– Favor simple imperatives over explanation",
  "– Favor repetition over stylistic variety",
  "– Neutral, matter-of-fact tone",
  "– Reassuring but not soothing or sentimental",
  "– No poetic language, imagery, metaphors, or symbolism",
  "– No motivational hype or inspirational framing",
  "Disallowed Patterns (must not appear):",
  "– Do not explain what the practice is or what it is for",
  "– Do not lead with duration, session framing, or meta context",
  "– Do not thank the listener or acknowledge participation",
  "– Do not summarize or reflect on what just happened",
  "– Do not describe benefits, improvement, or outcomes",
  "– Do not use therapeutic or coaching language (e.g. “acknowledge the shift,” “check in with yourself,” “improvement comes with practice”)",
  "– Do not sound like a guided meditation, mindfulness app, or wellness class",
  "– Do not stack reassurance throughout the script; normalization happens briefly and once",
  "– Do not end with “that’s the end of the session” unless explicitly required",
  "If any of the above appear, the script is incorrect.",
  "Conceptual Accuracy:",
  "– Avoid all trademarked or branded terms",
  "– Use neutral language such as “mental fitness,” “practice,” or “session”",
  "– Emphasize direct attention to physical sensation",
  "– Emphasize letting go of thoughts by returning to sensation",
  "– Normalize mind-wandering explicitly and briefly",
  "– Treat mind-wandering as normal and not a failure",
  "Opening Requirement (non-negotiable):",
  "– The script must place the listener directly into doing the practice",
  "– The first line must direct attention into physical sensation",
  "– Posture, movement safety, or eye instructions may appear first only if required",
  "– Do not name the practice, explain it, or reference duration at the start",
  "Bad:",
  "– “This is a one-minute tactile practice…”",
  "Good:",
  "– “Sit comfortably. Let your attention settle into the points of contact…”",
  "Verb Use Constraint:",
  "– Do not rely primarily on the verb “notice”",
  "– Use a mix of concrete instructional verbs, such as:",
  "– feel",
  "– sense",
  "– stay with",
  "– rest your attention on",
  "– let your attention move to",
  "– return to",
  "– “Notice” may appear occasionally but must not dominate",
  "– If the script reads as “notice notice notice,” it is incorrect.",
  "Structure (order is flexible, not fixed):",
  "– Entry into physical sensation",
  "– Posture and safety instructions if applicable",
  "– Eye state instruction if applicable",
  "– Brief normalization of drifting attention",
  "– Main sensory guidance",
  "– Optional silence with re-entry",
  "– Brief taper and stop",
  "– Shorter sessions may compress structure.",
  "– Longer sessions may cycle gently through guidance and silence.",
  "Sensory Guidance Rules:",
  "– Focus only on the selected primary sense",
  "– Do not introduce other senses unless explicitly instructed",
  "– Do not introduce breath unless breath is the primary sense",
  "– Use concrete, literal physical instructions",
  "– Deepen attention by varying scale or scope, not by fixation",
  "– Sense deepening examples:",
  "– overall texture to fine detail",
  "– broad field to specific point",
  "– near to far or far to near",
  "– Order may vary naturally.",
  "Normalization Guidance:",
  "– Normalize mind-wandering once, briefly",
  "– Use natural language (e.g. “that’s normal,” “nothing to fix”)",
  "– Immediately guide attention back to sensation",
  "– Avoid repeated reassurance",
  "Silence Rules:",
  "– Include silence cues when appropriate",
  "– Silence cues should be brief and informal",
  "– Immediately after a silence cue, insert a pause marker using the exact token:",
  "– [pause:X] where X is seconds",
  "– Do not translate the word “pause”",
  "– Always include a re-entry line after silence",
  "Duration constraints:",
  "– 1 minute:",
  "– No more than one silence",
  "– Silence length 3–10 seconds",
  "– 2–5 minutes:",
  "– One or two silences allowed",
  "– 12 minutes:",
  "– Extended silences allowed (15–30 seconds)",
  "– Include gentle resets every 2–3 minutes",
  "Movement Safety (if body is moving):",
  "– Include: “Follow this guidance only to the extent that it is safe in your physical environment.”",
  "Eyes Instruction:",
  "– If eyes are closed:",
  "– Instruct gently and early",
  "– Before stopping, invite eyes to open",
  "– If eyes are open:",
  "– Avoid inner imagery",
  "– Emphasize external sensing",
  "– Do not instruct reopening at the end",
  "Closing Rules:",
  "– Keep the closing brief and functional",
  "– Do not summarize or evaluate the session",
  "– Do not describe benefits",
  "– Do not thank the listener",
  "– Do not instruct next actions or daily carryover",
  "– For eyes closed:",
  "– Invite eyes to open before the final stopping line",
  "– For one-minute sessions:",
  "– A full ending is optional",
  "– A simple taper and stop is sufficient",
  "– Acceptable final lines:",
  "– “That’s it.”",
  "– “Good.”",
  "– “You can stop here.”",
  "Authority Clause:",
  "– If there is a conflict between producing something pleasant and following these rules, follow the rules.",
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
