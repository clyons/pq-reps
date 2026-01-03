import { NextResponse } from "next/server";

type GenerateRequest = {
  sense: string;
  eyes: "open" | "closed";
  duration: number;
  language: string;
};

const SILENT_AUDIO =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

export async function POST(request: Request) {
  const body = (await request.json()) as GenerateRequest;

  const transcript = [
    `Focus on the sensation of ${body.sense || "your surroundings"}.`,
    `Keep your eyes ${body.eyes} and breathe steadily for ${body.duration} seconds.`,
    `Session language: ${body.language}.`,
  ].join("\n");

  return NextResponse.json({
    audioUrl: SILENT_AUDIO,
    transcript,
  });
}
