import { NextResponse } from "next/server";
import {
  synthesizeSpeech,
  synthesizeSpeechStream,
  TtsScriptTooLargeError,
} from "../../../services/tts.js";
import { DEFAULT_TTS_NEWLINE_PAUSE_SECONDS } from "../../../services/tts.js";

export const runtime = "nodejs";

type TtsPayload = {
  script: string;
  language: string;
  voice: string;
  ttsNewlinePauseSeconds?: number;
};

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
  extension = "wav",
  now = new Date(),
}: {
  voice: string;
  extension?: string;
  now?: Date;
}) => `pq-reps_${voice}_${formatTimestamp(now)}.${extension}`;

const resolveAudioExtension = (contentType: string) =>
  contentType.includes("mpeg") ? "mp3" : "wav";

const isValidPayload = (payload: unknown): payload is TtsPayload => {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const { script, language, voice, ttsNewlinePauseSeconds } =
    payload as Partial<TtsPayload>;
  if (typeof script !== "string" || script.trim().length === 0) {
    return false;
  }
  if (typeof language !== "string" || language.trim().length === 0) {
    return false;
  }
  if (typeof voice !== "string" || voice.trim().length === 0) {
    return false;
  }
  if (
    typeof ttsNewlinePauseSeconds !== "undefined" &&
    typeof ttsNewlinePauseSeconds !== "number"
  ) {
    return false;
  }
  return true;
};

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

  if (!isValidPayload(payload)) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_payload",
          message: "Request body must include script, language, and voice.",
        },
      },
      { status: 400 },
    );
  }

  const wantsAudioStream = request.headers.get("x-tts-streaming") === "1";

  try {
    console.info("AI-generated audio notice: This endpoint returns AI-generated speech.");
    const newlinePauseSeconds =
      payload.ttsNewlinePauseSeconds ?? DEFAULT_TTS_NEWLINE_PAUSE_SECONDS;
    const ttsResult = wantsAudioStream
      ? await synthesizeSpeechStream({
          script: payload.script,
          language: payload.language,
          voice: payload.voice,
          newlinePauseSeconds,
        })
      : await synthesizeSpeech({
          script: payload.script,
          language: payload.language,
          voice: payload.voice,
          newlinePauseSeconds,
        });

    const downloadFilename = buildDownloadFilename({
      voice: ttsResult.voice,
      extension: resolveAudioExtension(ttsResult.contentType),
    });

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
    if (error instanceof TtsScriptTooLargeError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: "Script exceeds the maximum length supported for TTS.",
            details: {
              maxSegments: error.maxSegments,
              maxChars: error.maxChars,
              segmentCount: error.segmentCount,
              charCount: error.charCount,
            },
          },
        },
        { status: 400 },
      );
    }

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
