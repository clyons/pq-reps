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
import { synthesizeSpeech, synthesizeSpeechStream, TTS_SYSTEM_PROMPT } from "../../../services/tts";

export const runtime = "nodejs";

const PAUSE_MARKER_REGEX = /\[pause:(\d+(?:\.\d+)?)\]/gi;

const formatTimestamp = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}`;
};

const buildDownloadFilename = ({
  voice,
  durationMinutes,
  focus,
  now = new Date(),
  extension = "wav",
}: {
  voice: string;
  durationMinutes: number;
  focus: string;
  now?: Date;
  extension?: string;
}) => `pq-reps_${voice}_${durationMinutes}_${focus}_${formatTimestamp(now)}.${extension}`;

const resolveAudioExtension = (contentType: string) =>
  contentType.includes("mpeg") ? "mp3" : "wav";

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
    ttsNewlinePauseSeconds?: number;
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

const createReadableStreamFromGenerator = (
  generator: AsyncGenerator<Buffer>,
): ReadableStream<Uint8Array> =>
  new ReadableStream({
    async pull(controller) {
      const { value, done } = await generator.next();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(value);
    },
    async cancel() {
      await generator.return?.();
    },
  });

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
  const wantsAudioStream = request.headers.get("x-tts-streaming") === "1";
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
    const scriptStart = Date.now();
    const { script } = await generateScript({ prompt });
    console.info(`Script generation took ${Date.now() - scriptStart}ms.`);
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
          ttsNewlinePauseSeconds: config.ttsNewlinePauseSeconds,
          prompt,
          ttsProvider: "none",
          voice: "n/a",
        },
      };
      return NextResponse.json(response);
    }

    console.info("AI-generated audio notice: This endpoint returns AI-generated speech.");
    const ttsStart = Date.now();
    const ttsResult = wantsAudioStream && outputMode === "audio"
      ? await synthesizeSpeechStream({
          script,
          language: config.languages[0],
          voice: config.voiceStyle,
          newlinePauseSeconds: config.ttsNewlinePauseSeconds,
        })
      : await synthesizeSpeech({
          script,
          language: config.languages[0],
          voice: config.voiceStyle,
          newlinePauseSeconds: config.ttsNewlinePauseSeconds,
        });
    console.info(`Audio synthesis took ${Date.now() - ttsStart}ms.`);
    const downloadFilename = buildDownloadFilename({
      voice: ttsResult.voice,
      durationMinutes: config.durationMinutes,
      focus: config.primarySense,
      extension: resolveAudioExtension(ttsResult.contentType),
    });
    const ttsPrompt = debugTtsPrompt
      ? {
          model: "gpt-4o-mini-tts",
          voice: ttsResult.voice,
          input: ttsResult.inputScript,
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
          ttsNewlinePauseSeconds: config.ttsNewlinePauseSeconds,
          prompt,
          ttsProvider: ttsResult.provider,
          voice: ttsResult.voice,
        },
        ttsPrompt,
        audioBase64:
          "audio" in ttsResult ? ttsResult.audio.toString("base64") : undefined,
        audioContentType: ttsResult.contentType,
      };

      return NextResponse.json(response);
    }

    if ("stream" in ttsResult) {
      return new Response(createReadableStreamFromGenerator(ttsResult.stream), {
        status: 200,
        headers: {
          "Content-Type": ttsResult.contentType,
          "Content-Disposition": `attachment; filename="${downloadFilename}"`,
          "Transfer-Encoding": "chunked",
        },
      });
    }

    return new Response(ttsResult.audio, {
      status: 200,
      headers: {
        "Content-Type": ttsResult.contentType,
        "Content-Disposition": `attachment; filename="${downloadFilename}"`,
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
