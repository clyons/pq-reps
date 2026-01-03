import { NextResponse } from "next/server";
import {
  buildPrompt,
  BodyState,
  ClosingStyle,
  DurationMinutes,
  EyeState,
  LabelingMode,
  NormalizationFrequency,
  PracticeMode,
  PrimarySense,
  SilenceProfile,
  SenseRotation,
} from "../../../lib/promptBuilder";
import { OutputMode, validateGenerateConfig } from "../../../lib/generateValidation";
import { generateScript, SCRIPT_SYSTEM_PROMPT } from "../../../services/script";
import { synthesizeSpeech, TTS_SYSTEM_PROMPT } from "../../../services/tts";

export const runtime = "nodejs";

const PAUSE_MARKER_REGEX = /\[pause:(\d+(?:\.\d+)?)\]/gi;

type SuccessResponse = {
  script: string;
  metadata: {
    practiceMode: PracticeMode;
    bodyState: BodyState;
    eyeState: EyeState;
    primarySense: PrimarySense;
    durationMinutes: DurationMinutes;
    labelingMode: LabelingMode;
    silenceProfile: SilenceProfile;
    normalizationFrequency: NormalizationFrequency;
    closingStyle: ClosingStyle;
    senseRotation?: SenseRotation;
    languages: string[];
    prompt: string;
    ttsProvider: string;
    voice: string;
  };
  ttsPrompt?: {
    model: string;
    voice: string;
    input: string;
    response_format: string;
    voiceStylePreference?: string;
    scriptSystemPrompt: string;
    scriptUserPrompt: string;
    ttsSystemPrompt: string;
  };
  audioBase64?: string;
  audioContentType?: string;
};

const stripPauseMarkers = (script: string) =>
  script.replace(PAUSE_MARKER_REGEX, "").replace(/\s{2,}/g, " ").trim();

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_json",
          message: "Request body must be valid JSON.",
          details: { error: (error as Error).message },
        },
      },
      { status: 400 },
    );
  }

  const validation = validateGenerateConfig(payload);
  if (!validation.ok) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { config, outputMode: requestedMode, debugTtsPrompt } = validation.value;
  const prompt = buildPrompt(config);
  const acceptHeader = request.headers.get("accept") ?? "";
  const outputMode =
    requestedMode ?? (acceptHeader.includes("application/json") ? "text" : "audio");

  if (requestedMode && !["text", "audio", "text-audio"].includes(requestedMode)) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_output_mode",
          message: "Output mode must be one of: text, audio, text-audio.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const { script } = await generateScript({ prompt });
    const cleanedScript = stripPauseMarkers(script);
    if (outputMode === "text") {
      const response: SuccessResponse = {
        script: cleanedScript,
        metadata: {
          practiceMode: config.practiceMode,
          bodyState: config.bodyState,
          eyeState: config.eyeState,
          primarySense: config.primarySense,
          durationMinutes: config.durationMinutes,
          labelingMode: config.labelingMode,
          silenceProfile: config.silenceProfile,
          normalizationFrequency: config.normalizationFrequency,
          closingStyle: config.closingStyle,
          senseRotation: config.senseRotation,
          languages: config.languages,
          prompt,
          ttsProvider: "none",
          voice: "n/a",
        },
      };
      return NextResponse.json(response);
    }

    console.info("AI-generated audio notice: This endpoint returns AI-generated speech.");
    const ttsResult = await synthesizeSpeech({
      script,
      language: config.languages[0],
      voice: config.voiceStyle,
    });
    const ttsPrompt = debugTtsPrompt
      ? {
          model: "gpt-4o-mini-tts",
          voice: ttsResult.voice,
          input: script,
          response_format: "wav",
          voiceStylePreference: config.voiceStyle,
          scriptSystemPrompt: SCRIPT_SYSTEM_PROMPT,
          scriptUserPrompt: prompt,
          ttsSystemPrompt: TTS_SYSTEM_PROMPT,
        }
      : undefined;

    if (outputMode === "text-audio") {
      const response: SuccessResponse = {
        script: cleanedScript,
        metadata: {
          practiceMode: config.practiceMode,
          bodyState: config.bodyState,
          eyeState: config.eyeState,
          primarySense: config.primarySense,
          durationMinutes: config.durationMinutes,
          labelingMode: config.labelingMode,
          silenceProfile: config.silenceProfile,
          normalizationFrequency: config.normalizationFrequency,
          closingStyle: config.closingStyle,
          senseRotation: config.senseRotation,
          languages: config.languages,
          prompt,
          ttsProvider: ttsResult.provider,
          voice: ttsResult.voice,
        },
        ttsPrompt,
        audioBase64: ttsResult.audio.toString("base64"),
        audioContentType: ttsResult.contentType,
      };

      return NextResponse.json(response);
    }

    return new Response(ttsResult.audio, {
      status: 200,
      headers: {
        "Content-Type": ttsResult.contentType,
        "Content-Disposition": "attachment; filename=\"pq-reps.wav\"",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "tts_failure",
          message: "Failed to synthesize audio.",
          details: { error: (error as Error).message },
        },
      },
      { status: 500 },
    );
  }
}
