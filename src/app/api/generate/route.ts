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
import { generateScript } from "../../../services/script";
import { synthesizeSpeech } from "../../../services/tts";

export const runtime = "nodejs";

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
  audioBase64?: string;
  audioContentType?: string;
};


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

  const { config, outputMode: requestedMode } = validation.value;
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
    if (outputMode === "text") {
      const response: SuccessResponse = {
        script,
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

    if (outputMode === "text-audio") {
      const response: SuccessResponse = {
        script,
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
