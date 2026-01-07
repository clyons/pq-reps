"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  SCENARIOS,
  type PracticeType,
  type ScenarioId,
} from "../lib/promptBuilder";
import {
  deriveDurationConfig,
  derivePracticeConfig,
  deriveSenseRotation,
} from "../lib/practiceConfig";

type GenerationResult = {
  audioStream?: MediaStream;
  audioUrl?: string;
  downloadUrl?: string;
  script?: string;
  ttsPrompt?: string;
  downloadFilename?: string;
  scriptDownloadUrl?: string;
  scriptDownloadFilename?: string;
};

type FormState = {
  practiceType: PracticeType;
  focus: "touch" | "hearing" | "sight" | "breath";
  durationMinutes: 1 | 2 | 5 | 12;
  language: string;
  voiceGender: "female" | "male";
  ttsNewlinePauseSeconds: number;
  debugTtsPrompt: boolean;
  audioDelivery: "generate" | "stream";
  scenarioId?: ScenarioId;
  customScenarioLine: string;
};

const DEFAULT_STATE: FormState = {
  practiceType: "still_eyes_closed",
  focus: "touch",
  durationMinutes: 2,
  language: "en",
  voiceGender: "female",
  ttsNewlinePauseSeconds: 1.5,
  debugTtsPrompt: false,
  audioDelivery: "generate",
  customScenarioLine: "",
};

const BRAND_COLORS = {
  yellow: { base: "#FFC524", light: "#FFE28A", dark: "#E0A800" },
  orange: { base: "#FF8E4F", light: "#FFC1A1", dark: "#E66F2E" },
  blue: { base: "#82E6E6", light: "#CFF5F5", dark: "#4FC6C6" },
  green: { base: "#63D9A0", light: "#B8EED5", dark: "#2FBF7F" },
  neutral: {
    white: "#FFFFFF",
    grayBase: "#F8F8F8",
    grayMid: "#E5E5E5",
    black30: "#BFBFBF",
    black: "#000000",
  },
};

const useAudioSync = (
  audioRef: RefObject<HTMLAudioElement>,
  audioStream?: MediaStream,
  audioUrl?: string,
) => {
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) {
      return;
    }
    if (audioStream) {
      if (audioElement.srcObject !== audioStream) {
        audioElement.srcObject = audioStream;
      }
      audioElement.play().catch(() => {});
      return;
    }
    if (audioElement.srcObject) {
      audioElement.srcObject = null;
    }
    if (audioUrl && audioElement.src !== audioUrl) {
      audioElement.src = audioUrl;
    }
  }, [audioRef, audioStream, audioUrl]);
};

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];

const DURATION_OPTIONS: FormState["durationMinutes"][] = [1, 2, 5, 12];
const CUSTOM_SCENARIO_MAX_LENGTH = 120;

const formatDurationLabel = (minutes: number) =>
  `${minutes} minute${minutes === 1 ? "" : "s"}`;

const PRACTICE_TYPE_LABELS: Record<PracticeType, string> = {
  still_eyes_closed: "Still (Eyes closed)",
  still_eyes_open: "Still (Eyes open)",
  moving: "Moving",
  labeling: "Labeling",
};

const QUICK_ACCESS_SCENARIOS = SCENARIOS;

const FEMALE_VOICES_BY_LANGUAGE: Record<string, string> = {
  es: "nova",
  fr: "nova",
};

const MALE_VOICES_BY_LANGUAGE: Record<string, string> = {
  es: "onyx",
  fr: "onyx",
};

const capitalize = (value: string) =>
  value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);

const resolveVoiceForGender = (gender: FormState["voiceGender"], language: string) => {
  if (gender === "male") {
    return MALE_VOICES_BY_LANGUAGE[language] ?? "ash";
  }
  return FEMALE_VOICES_BY_LANGUAGE[language] ?? "alloy";
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

const resolveAudioExtension = (contentType?: string) =>
  contentType?.includes("mpeg") ? "mp3" : "wav";

const resolveStreamingMimeType = (contentType: string) =>
  contentType.includes("audio/wav") ? 'audio/wav; codecs="1"' : contentType;

const parseWavHeader = (header: Uint8Array) => {
  const readString = (offset: number, length: number) =>
    String.fromCharCode(...header.slice(offset, offset + length));
  if (readString(0, 4) !== "RIFF" || readString(8, 4) !== "WAVE") {
    throw new Error("Invalid WAV header.");
  }
  let offset = 12;
  let fmt: {
    audioFormat: number;
    channels: number;
    sampleRate: number;
    bitsPerSample: number;
  } | null = null;
  let dataOffset: number | null = null;
  while (offset + 8 <= header.length) {
    const chunkId = readString(offset, 4);
    const chunkSize =
      header[offset + 4] |
      (header[offset + 5] << 8) |
      (header[offset + 6] << 16) |
      (header[offset + 7] << 24);
    const chunkStart = offset + 8;
    if (chunkId === "fmt ") {
      const audioFormat = header[chunkStart] | (header[chunkStart + 1] << 8);
      const channels = header[chunkStart + 2] | (header[chunkStart + 3] << 8);
      const sampleRate =
        header[chunkStart + 4] |
        (header[chunkStart + 5] << 8) |
        (header[chunkStart + 6] << 16) |
        (header[chunkStart + 7] << 24);
      const bitsPerSample = header[chunkStart + 14] | (header[chunkStart + 15] << 8);
      fmt = { audioFormat, channels, sampleRate, bitsPerSample };
    } else if (chunkId === "data") {
      dataOffset = chunkStart;
      break;
    }
    offset = chunkStart + chunkSize + (chunkSize % 2);
  }
  if (!fmt || dataOffset === null) {
    throw new Error("Unsupported WAV header.");
  }
  if (fmt.audioFormat !== 1) {
    throw new Error("Only PCM WAV is supported for streaming.");
  }
  return { ...fmt, dataOffset };
};

const streamWavViaWebAudio = async ({
  reader,
  onStreamStart,
  onChunk,
}: {
  reader: ReadableStreamDefaultReader<Uint8Array>;
  onStreamStart?: (mediaStream: MediaStream) => void;
  onChunk?: (chunk: Uint8Array) => void;
}) => {
  const bufferSize = 4096;
  let audioContext: AudioContext | null = null;
  let activeProcessor: ScriptProcessorNode | null = null;
  let streamDestination: MediaStreamAudioDestinationNode | null = null;
  const sampleQueue: Float32Array[] = [];
  let sampleOffset = 0;
  let wavInfo:
    | {
        channels: number;
        bitsPerSample: number;
        dataOffset: number;
        sampleRate: number;
      }
    | null = null;
  let pendingPcmBytes = new Uint8Array(0);
  let headerBytes = new Uint8Array(0);
  let playbackStarted = false;
  let streamingEnabled = true;

  const readSample = () => {
    while (sampleQueue.length > 0 && sampleOffset >= sampleQueue[0].length) {
      sampleQueue.shift();
      sampleOffset = 0;
    }
    if (sampleQueue.length === 0) {
      return null;
    }
    const value = sampleQueue[0][sampleOffset];
    sampleOffset += 1;
    return value;
  };

  const handleAudioProcess = (event: AudioProcessingEvent) => {
    if (!wavInfo) {
      return;
    }
    const channelCount = wavInfo.channels;
    const outputs = Array.from({ length: channelCount }, (_, idx) =>
      event.outputBuffer.getChannelData(idx),
    );
    for (let i = 0; i < outputs[0].length; i += 1) {
      for (let channel = 0; channel < channelCount; channel += 1) {
        const sample = readSample();
        outputs[channel][i] = sample === null ? 0 : sample;
      }
    }
  };

  const enqueuePcm = (pcmBytes: Uint8Array) => {
    if (!wavInfo || wavInfo.bitsPerSample !== 16) {
      return;
    }
    const frameSize = wavInfo.channels * (wavInfo.bitsPerSample / 8);
    const combined = new Uint8Array(pendingPcmBytes.length + pcmBytes.length);
    combined.set(pendingPcmBytes);
    combined.set(pcmBytes, pendingPcmBytes.length);
    const remainder = combined.length % frameSize;
    const alignedLength = combined.length - remainder;
    pendingPcmBytes =
      remainder > 0 ? combined.slice(alignedLength) : new Uint8Array(0);
    if (alignedLength === 0) {
      return;
    }
    const alignedBytes = combined.slice(0, alignedLength);
    const samples = new Float32Array(alignedBytes.length / 2);
    for (let i = 0; i < alignedBytes.length; i += 2) {
      const int16 = alignedBytes[i] | (alignedBytes[i + 1] << 8);
      const signed = int16 >= 0x8000 ? int16 - 0x10000 : int16;
      samples[i / 2] = signed / 32768;
    }
    sampleQueue.push(samples);
  };

  const waitForDrain = async () =>
    new Promise<void>((resolve) => {
      const checkQueue = () => {
        if (!streamingEnabled || sampleQueue.length === 0) {
          resolve();
          return;
        }
        setTimeout(checkQueue, 100);
      };
      checkQueue();
    });

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }
    onChunk?.(value);

    if (!wavInfo && streamingEnabled) {
      const combined = new Uint8Array(headerBytes.length + value.length);
      combined.set(headerBytes);
      combined.set(value, headerBytes.length);
      headerBytes = combined;
      if (headerBytes.length >= 44) {
        try {
          wavInfo = parseWavHeader(headerBytes);
          if (wavInfo.bitsPerSample !== 16) {
            throw new Error("Only 16-bit PCM WAV streaming is supported.");
          }
          audioContext = new AudioContext({ sampleRate: wavInfo.sampleRate });
          await audioContext.resume();
          streamDestination = audioContext.createMediaStreamDestination();
          activeProcessor = audioContext.createScriptProcessor(
            bufferSize,
            0,
            wavInfo.channels,
          );
          activeProcessor.onaudioprocess = handleAudioProcess;
          activeProcessor.connect(streamDestination);
          if (!playbackStarted) {
            playbackStarted = true;
            onStreamStart?.(streamDestination.stream);
          }
          const pcmStart = headerBytes.slice(wavInfo.dataOffset);
          enqueuePcm(pcmStart);
          headerBytes = new Uint8Array(0);
        } catch {
          streamingEnabled = false;
        }
      }
      continue;
    }

    if (streamingEnabled && !playbackStarted && streamDestination) {
      playbackStarted = true;
      onStreamStart?.(streamDestination.stream);
    }
    if (streamingEnabled) {
      enqueuePcm(value);
    }
  }

  if (streamingEnabled) {
    await waitForDrain();
  }
  if (activeProcessor) {
    activeProcessor.disconnect();
  }
  if (audioContext) {
    audioContext.close().catch(() => {});
  }
};

const buildScriptDownloadFilename = ({
  voice,
  durationMinutes,
  focus,
  now = new Date(),
}: {
  voice: string;
  durationMinutes: number;
  focus: string;
  now?: Date;
}) => buildDownloadFilename({ voice, durationMinutes, focus, now }).replace(/\.[^.]+$/, ".txt");

type PillOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

const pillGroupStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
};

const pillLabelStyle: React.CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
};

const pillInputStyle: React.CSSProperties = {
  position: "absolute",
  opacity: 0,
  pointerEvents: "none",
};

const infoIconStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 18,
  height: 18,
  borderRadius: 999,
  border: `1px solid ${BRAND_COLORS.neutral.black30}`,
  color: BRAND_COLORS.neutral.black,
  fontSize: "0.75rem",
  fontWeight: 600,
  cursor: "help",
  position: "relative",
};

const infoTooltipStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "calc(100% + 8px)",
  left: "50%",
  transform: "translateX(-50%)",
  background: BRAND_COLORS.neutral.black,
  color: BRAND_COLORS.neutral.grayBase,
  padding: "0.4rem 0.6rem",
  borderRadius: 8,
  fontSize: "0.75rem",
  fontWeight: 500,
  whiteSpace: "nowrap",
  pointerEvents: "none",
  transition: "opacity 0.15s ease",
  zIndex: 10,
};

const sectionToggleStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  marginBottom: "1.5rem",
  flexWrap: "wrap",
};

const getSectionToggleButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: "0.5rem 1rem",
  borderRadius: 999,
  border: `1px solid ${active ? BRAND_COLORS.orange.dark : BRAND_COLORS.orange.base}`,
  background: active ? BRAND_COLORS.orange.dark : BRAND_COLORS.neutral.white,
  color: BRAND_COLORS.neutral.black,
  fontWeight: 600,
  cursor: "pointer",
});

const scenarioGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "0.75rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  marginBottom: "1.5rem",
};

const getScenarioCardStyle = (active: boolean): React.CSSProperties => ({
  border: `1px solid ${active ? BRAND_COLORS.orange.dark : BRAND_COLORS.orange.base}`,
  borderRadius: 16,
  padding: "0.9rem",
  background: active ? BRAND_COLORS.orange.light : BRAND_COLORS.neutral.white,
  textAlign: "left",
  cursor: "pointer",
  transition: "border 0.15s ease, box-shadow 0.15s ease",
  boxShadow: active ? "0 6px 16px rgba(0,0,0,0.08)" : "none",
});

const scenarioTitleStyle: React.CSSProperties = {
  fontWeight: 700,
  marginBottom: "0.35rem",
};

const scenarioMetaStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "#333333",
  lineHeight: 1.4,
};

const getPillStyle = (checked: boolean, disabled?: boolean): React.CSSProperties => ({
  padding: "0.5rem 0.9rem",
  borderRadius: 999,
  border: `1px solid ${checked ? BRAND_COLORS.orange.dark : BRAND_COLORS.orange.base}`,
  background: checked ? BRAND_COLORS.orange.dark : BRAND_COLORS.neutral.white,
  color: BRAND_COLORS.neutral.black,
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
  transition: "all 0.15s ease",
});

const PillRadioGroup = ({
  name,
  options,
  value,
  onChange,
  ariaLabel,
}: {
  name: string;
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) => (
  <div role="radiogroup" aria-label={ariaLabel} style={pillGroupStyle}>
    {options.map((option, index) => {
      const checked = option.value === value;
      return (
        <label key={option.value} style={pillLabelStyle}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={checked}
            required={index === 0}
            disabled={option.disabled}
            onChange={() => onChange(option.value)}
            style={pillInputStyle}
          />
          <span style={getPillStyle(checked, option.disabled)}>{option.label}</span>
        </label>
      );
    })}
  </div>
);

export default function HomePage() {
  const [formState, setFormState] = useState<FormState>(DEFAULT_STATE);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showAudioInfo, setShowAudioInfo] = useState(false);
  const [activeSection, setActiveSection] = useState<"quick" | "customize">("quick");
  const audioRef = useRef<HTMLAudioElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);

  const isDevMode = process.env.NODE_ENV !== "production";
  const isLoading = status === "loading";

  useAudioSync(audioRef, result?.audioStream, result?.audioUrl);

  const shouldShowResult = Boolean(
    result?.audioStream || result?.audioUrl || result?.script || result?.ttsPrompt,
  );

  const practiceConfig = useMemo(
    () => derivePracticeConfig(formState.practiceType, formState.durationMinutes),
    [formState.practiceType, formState.durationMinutes],
  );

  const durationConfig = useMemo(
    () => deriveDurationConfig(formState.durationMinutes),
    [formState.durationMinutes],
  );

  const focusOptions = useMemo(() => {
    if (practiceConfig.eyeState === "closed") {
      return ["touch", "hearing", "breath"] as FormState["focus"][];
    }
    return ["touch", "hearing", "sight", "breath"] as FormState["focus"][];
  }, [practiceConfig.eyeState]);

  useEffect(() => {
    return () => {
      if (result?.audioUrl) {
        URL.revokeObjectURL(result.audioUrl);
      }
      if (result?.downloadUrl) {
        URL.revokeObjectURL(result.downloadUrl);
      }
      if (result?.audioStream) {
        result.audioStream.getTracks().forEach((track) => track.stop());
      }
      if (result?.scriptDownloadUrl) {
        URL.revokeObjectURL(result.scriptDownloadUrl);
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, result]);

  useEffect(() => {
    if (!focusOptions.includes(formState.focus)) {
      setFormState((prev) => ({ ...prev, focus: "touch" }));
    }
  }, [focusOptions, formState.focus]);

  const updateFormState = (updates: Partial<FormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  };

  const handleSectionToggle = (section: "quick" | "customize") => {
    setActiveSection(section);
    if (section === "customize") {
      setFormState((prev) => ({ ...prev, scenarioId: undefined }));
    }
  };

  const handleScenarioSelect = (scenarioId: ScenarioId) => {
    const scenario = QUICK_ACCESS_SCENARIOS.find((entry) => entry.id === scenarioId);
    if (!scenario) {
      return;
    }
    setFormState((prev) => ({
      ...prev,
      scenarioId,
      practiceType: scenario.practiceType,
      focus: scenario.primarySense,
      durationMinutes: scenario.durationMinutes,
    }));
  };

  const practiceTypeOptions: PillOption[] = [
    { value: "still_eyes_closed", label: "Still (Eyes closed)" },
    { value: "still_eyes_open", label: "Still (Eyes open)" },
    { value: "moving", label: "Moving" },
    { value: "labeling", label: "Labeling" },
  ];

  const focusPillOptions: PillOption[] = focusOptions.map((option) => ({
    value: option,
    label:
      option === "touch"
        ? "Touch"
        : option === "hearing"
          ? "Hearing"
          : option === "sight"
            ? "Sight"
            : "Breath",
  }));

  const durationPillOptions: PillOption[] = DURATION_OPTIONS.map((option) => ({
    value: String(option),
    label: formatDurationLabel(option),
  }));

  const languagePillOptions: PillOption[] = LANGUAGE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  const voicePillOptions: PillOption[] = [
    {
      value: "female",
      label: capitalize(resolveVoiceForGender("female", formState.language)),
    },
    {
      value: "male",
      label: capitalize(resolveVoiceForGender("male", formState.language)),
    },
  ];
  const audioDeliveryOptions: PillOption[] = [
    { value: "generate", label: "Generate" },
    { value: "stream", label: "Stream" },
  ];

  const validate = (state: FormState) => {
    const nextErrors: string[] = [];

    if (!state.language) {
      nextErrors.push("Please select a language.");
    }

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate(formState);
    setErrors(nextErrors);
    setResult(null);

    if (nextErrors.length > 0) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    const isStreamingAudio = formState.audioDelivery === "stream";
    const effectiveOutputMode = isStreamingAudio ? "audio" : "text-audio";
    const primarySense = focusOptions.includes(formState.focus)
      ? formState.focus
      : "touch";
    const voiceStyle = resolveVoiceForGender(formState.voiceGender, formState.language);
    const senseRotation = deriveSenseRotation(
      formState.practiceType,
      formState.durationMinutes,
    );
    const basePayload = {
      practiceMode: practiceConfig.practiceMode,
      bodyState: practiceConfig.bodyState,
      eyeState: practiceConfig.eyeState,
      primarySense,
      durationMinutes: formState.durationMinutes,
      labelingMode: practiceConfig.labelingMode,
      silenceProfile: durationConfig.silenceProfile,
      normalizationFrequency: durationConfig.normalizationFrequency,
      closingStyle: durationConfig.closingStyle,
      senseRotation,
      scenarioId: formState.scenarioId,
      languages: [formState.language],
      voiceStyle,
      customScenarioLine: formState.customScenarioLine.trim() || undefined,
      ttsNewlinePauseSeconds: formState.ttsNewlinePauseSeconds,
      debugTtsPrompt: formState.debugTtsPrompt,
    };

    const ttsPayload = (script: string) => ({
      script,
      language: formState.language,
      voice: voiceStyle,
      ttsNewlinePauseSeconds: formState.ttsNewlinePauseSeconds,
    });

    const requestJson = async (outputMode: "text" | "text-audio") => {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ ...basePayload, outputMode }),
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as { error?: { message?: string } };
        throw new Error(errorBody.error?.message ?? "The generator failed to respond.");
      }

      return (await response.json()) as { script: string; ttsPrompt?: Record<string, unknown> };
    };

    const requestAudio = async (
      script: string,
      {
        onStreamStart,
        onChunk,
      }: {
        onStreamStart?: (args: {
          mediaUrl?: string;
          mediaStream?: MediaStream;
          contentType: string;
        }) => void;
        onChunk?: (chunk: Uint8Array, data: { contentType: string }) => void;
      } = {},
    ) => {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/wav",
          "x-tts-streaming": "1",
        },
        body: JSON.stringify(ttsPayload(script)),
      });

      if (!response.ok) {
        const errorContentType = response.headers.get("content-type") ?? "";
        if (errorContentType.includes("application/json")) {
          const errorBody = (await response.json()) as { error?: { message?: string } };
          throw new Error(errorBody.error?.message ?? "The generator failed to respond.");
        }
        throw new Error(`The generator failed to respond. (${response.status})`);
      }

      const contentType = response.headers.get("content-type") ?? "audio/wav";
      if (!response.body) {
        const audioBuffer = await response.arrayBuffer();
        return { blob: new Blob([audioBuffer], { type: contentType }), contentType };
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      const streamingMimeType = resolveStreamingMimeType(contentType);
      const canAttemptStream = typeof MediaSource !== "undefined";
      const canWebAudioStream =
        contentType.includes("audio/wav") && typeof AudioContext !== "undefined";

      if (canWebAudioStream) {
        await streamWavViaWebAudio({
          reader,
          onStreamStart: (mediaStream) =>
            onStreamStart?.({ mediaStream, contentType }),
          onChunk: (chunk) => {
            chunks.push(chunk);
            onChunk?.(chunk, { contentType });
          },
        });
        return { blob: new Blob(chunks, { type: contentType }), contentType };
      }

      if (canAttemptStream) {
        const mediaSource = new MediaSource();
        const mediaUrl = URL.createObjectURL(mediaSource);
        let streamStartNotified = false;
        const notifyStreamStart = () => {
          if (streamStartNotified) {
            return;
          }
          streamStartNotified = true;
          onStreamStart?.({ mediaUrl, contentType });
        };

        try {
          notifyStreamStart();
          await new Promise<void>((resolve, reject) => {
            const handleError = () => reject(new Error("Audio stream failed."));

            mediaSource.addEventListener("error", handleError, { once: true });
            mediaSource.addEventListener(
              "sourceopen",
              async () => {
                try {
                  const sourceBuffer = mediaSource.addSourceBuffer(streamingMimeType);
                  const appendChunk = (chunk: Uint8Array) =>
                    new Promise<void>((appendResolve, appendReject) => {
                      const onError = () => appendReject(new Error("Failed to append audio chunk."));
                      const onUpdateEnd = () => appendResolve();
                      sourceBuffer.addEventListener("error", onError, { once: true });
                      sourceBuffer.addEventListener("updateend", onUpdateEnd, { once: true });
                      sourceBuffer.appendBuffer(chunk);
                    });

                  const firstRead = await reader.read();
                  if (firstRead.done || !firstRead.value) {
                    throw new Error("Audio stream ended before data arrived.");
                  }
                  chunks.push(firstRead.value);
                  onChunk?.(firstRead.value, { contentType });
                  await appendChunk(firstRead.value);
                  notifyStreamStart();

                  while (true) {
                    const { value, done } = await reader.read();
                    if (done) {
                      break;
                    }
                    if (value) {
                      chunks.push(value);
                      onChunk?.(value, { contentType });
                      await appendChunk(value);
                    }
                  }

                  if (mediaSource.readyState === "open") {
                    mediaSource.endOfStream();
                  }
                  resolve();
                } catch (streamError) {
                  reject(streamError);
                }
              },
              { once: true },
            );
          });

          const downloadBlob = new Blob(chunks, { type: contentType });
          return { blob: downloadBlob, mediaUrl, contentType };
        } catch (streamError) {
          console.warn("Falling back to buffered WAV playback.", streamError);
        }
      }

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
          chunks.push(value);
          onChunk?.(value, { contentType });
        }
      }
      return { blob: new Blob(chunks, { type: contentType }), contentType };
    };

    try {
      let script: string | undefined;
      let audioUrl: string | undefined;
      let downloadUrl: string | undefined;
      let ttsPrompt: string | undefined;
      let audioContentType: string | undefined;

      if (effectiveOutputMode === "text") {
        const jsonResult = await requestJson("text");
        script = jsonResult.script;
        if (jsonResult.ttsPrompt) {
          ttsPrompt = JSON.stringify(jsonResult.ttsPrompt, null, 2);
        }
      } else if (effectiveOutputMode === "audio") {
        const jsonResult = await requestJson("text");
        script = jsonResult.script;
        if (jsonResult.ttsPrompt) {
          ttsPrompt = JSON.stringify(jsonResult.ttsPrompt, null, 2);
        }
        const cleanedScript = script
          ? script.replace(/\[pause:\d+(?:\.\d+)?\]/g, "").trim()
          : "";
        if (cleanedScript) {
          const scriptDownloadFilename = buildScriptDownloadFilename({
            voice: voiceStyle,
            durationMinutes: formState.durationMinutes,
            focus: primarySense,
          });
          const nextScriptUrl = URL.createObjectURL(
            new Blob([cleanedScript], { type: "text/plain" }),
          );
          setResult((prev) => {
            if (prev?.scriptDownloadUrl && prev.scriptDownloadUrl !== nextScriptUrl) {
              URL.revokeObjectURL(prev.scriptDownloadUrl);
            }
            return {
              audioStream: prev?.audioStream,
              audioUrl: prev?.audioUrl,
              downloadUrl: prev?.downloadUrl,
              script: cleanedScript,
              ttsPrompt,
              downloadFilename: prev?.downloadFilename,
              scriptDownloadFilename,
              scriptDownloadUrl: nextScriptUrl,
            };
          });
        }
        const streamingChunks: Uint8Array[] = [];
        let streamContentType: string | undefined;
        let downloadReady = false;
        const { blob, mediaUrl, contentType } = await requestAudio(script, {
          onStreamStart: ({ mediaUrl: streamUrl, mediaStream, contentType: streamStartType }) => {
            streamContentType = streamStartType;
            const downloadFilename = buildDownloadFilename({
              voice: voiceStyle,
              durationMinutes: formState.durationMinutes,
              focus: primarySense,
              extension: resolveAudioExtension(streamStartType),
            });
            setStatus("success");
            setResult((prev) => {
              if (prev?.audioUrl && prev.audioUrl !== streamUrl) {
                URL.revokeObjectURL(prev.audioUrl);
              }
              if (prev?.downloadUrl) {
                URL.revokeObjectURL(prev.downloadUrl);
              }
              return {
                audioStream: mediaStream ?? prev?.audioStream,
                audioUrl: streamUrl ?? undefined,
                downloadUrl: undefined,
                script: prev?.script,
                ttsPrompt: prev?.ttsPrompt,
                downloadFilename,
                scriptDownloadFilename: prev?.scriptDownloadFilename,
                scriptDownloadUrl: prev?.scriptDownloadUrl,
              };
            });
          },
          onChunk: (chunk, { contentType: chunkContentType }) => {
            streamingChunks.push(chunk);
            if (!streamContentType) {
              streamContentType = chunkContentType;
            }
            if (!downloadReady && streamContentType) {
              downloadReady = true;
              const partialBlob = new Blob(streamingChunks, { type: streamContentType });
              const partialDownloadUrl = URL.createObjectURL(partialBlob);
              const downloadFilename = buildDownloadFilename({
                voice: voiceStyle,
                durationMinutes: formState.durationMinutes,
                focus: primarySense,
                extension: resolveAudioExtension(streamContentType),
              });
              setResult((prev) => {
                if (prev?.downloadUrl && prev.downloadUrl !== partialDownloadUrl) {
                  URL.revokeObjectURL(prev.downloadUrl);
                }
                return {
                  audioStream: prev?.audioStream,
                  audioUrl: prev?.audioUrl,
                  downloadUrl: partialDownloadUrl,
                  script: prev?.script,
                  ttsPrompt: prev?.ttsPrompt,
                  downloadFilename,
                  scriptDownloadFilename: prev?.scriptDownloadFilename,
                  scriptDownloadUrl: prev?.scriptDownloadUrl,
                };
              });
            }
          },
        });
        if (mediaUrl) {
          audioUrl = mediaUrl;
        } else {
          audioUrl = URL.createObjectURL(blob);
        }
        downloadUrl = URL.createObjectURL(blob);
        audioContentType = contentType ?? blob.type;
        const extension = resolveAudioExtension(audioContentType);
        script = jsonResult.script;
        if (jsonResult.ttsPrompt) {
          ttsPrompt = JSON.stringify(jsonResult.ttsPrompt, null, 2);
        }
        const downloadFilename = buildDownloadFilename({
          voice: voiceStyle,
          durationMinutes: formState.durationMinutes,
          focus: primarySense,
          extension,
        });
        const scriptDownloadFilename = buildScriptDownloadFilename({
          voice: voiceStyle,
          durationMinutes: formState.durationMinutes,
          focus: primarySense,
        });
        setResult((prev) => {
          if (prev?.audioUrl && prev.audioUrl !== audioUrl) {
            URL.revokeObjectURL(prev.audioUrl);
          }
          if (prev?.downloadUrl) {
            URL.revokeObjectURL(prev.downloadUrl);
          }
          if (prev?.scriptDownloadUrl) {
            URL.revokeObjectURL(prev.scriptDownloadUrl);
          }
          return {
            audioUrl,
            downloadUrl,
            script: "",
            ttsPrompt,
            downloadFilename,
            scriptDownloadFilename,
            scriptDownloadUrl: undefined,
          };
        });
      } else {
        const jsonResult = (await requestJson("text-audio")) as {
          script: string;
          audioBase64?: string;
          audioContentType?: string;
          ttsPrompt?: Record<string, unknown>;
        };
        script = jsonResult.script;
        if (jsonResult.ttsPrompt) {
          ttsPrompt = JSON.stringify(jsonResult.ttsPrompt, null, 2);
        }
        if (jsonResult.audioBase64) {
          const binary = atob(jsonResult.audioBase64);
          const bytes = new Uint8Array(binary.length);
          for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
          }
          const audioBlob = new Blob([bytes], {
            type: jsonResult.audioContentType ?? "audio/wav",
          });
          audioContentType = jsonResult.audioContentType ?? "audio/wav";
          audioUrl = URL.createObjectURL(audioBlob);
          downloadUrl = URL.createObjectURL(audioBlob);
        }
      }

      const cleanedScript = script
        ? script.replace(/\[pause:\d+(?:\.\d+)?\]/g, "").trim()
        : "";
      const downloadFilename = audioUrl
        ? buildDownloadFilename({
            voice: voiceStyle,
            durationMinutes: formState.durationMinutes,
            focus: primarySense,
            extension: resolveAudioExtension(audioContentType),
          })
        : undefined;
      const scriptDownloadFilename = cleanedScript
        ? buildScriptDownloadFilename({
            voice: voiceStyle,
            durationMinutes: formState.durationMinutes,
            focus: primarySense,
          })
        : undefined;
      const scriptDownloadUrl = cleanedScript
        ? URL.createObjectURL(new Blob([cleanedScript], { type: "text/plain" }))
        : undefined;

        setResult((prev) => {
          if (prev?.audioUrl && prev.audioUrl !== audioUrl) {
            URL.revokeObjectURL(prev.audioUrl);
          }
          if (prev?.downloadUrl) {
            URL.revokeObjectURL(prev.downloadUrl);
          }
          if (prev?.scriptDownloadUrl) {
            URL.revokeObjectURL(prev.scriptDownloadUrl);
          }
          return {
            audioStream: undefined,
            audioUrl,
            downloadUrl: downloadUrl ?? audioUrl,
            script: cleanedScript,
            ttsPrompt,
            downloadFilename,
          scriptDownloadFilename,
          scriptDownloadUrl,
        };
      });

      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrors([
        error instanceof Error
          ? error.message
          : "Something went wrong while generating the audio.",
      ]);
    }
  };

  const handleVoicePreview = async () => {
    const previewAudio = previewAudioRef.current;
    if (!previewAudio) {
      return;
    }
    if (previewLoading) {
      return;
    }
    if (previewPlaying) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
      setPreviewPlaying(false);
      return;
    }
    const language = formState.language;
    const voice = resolveVoiceForGender(formState.voiceGender, language);
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const response = await fetch("/api/voice-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/wav",
        },
        body: JSON.stringify({
          language,
          voice,
        }),
      });
      if (!response.ok) {
        throw new Error(`Preview failed (${response.status}).`);
      }
      const contentType = response.headers.get("content-type") ?? "audio/wav";
      const audioBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: contentType });
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const nextUrl = URL.createObjectURL(audioBlob);
      setPreviewUrl(nextUrl);
      previewAudio.src = nextUrl;
      previewAudio.hidden = false;
      previewAudio.onended = () => {
        setPreviewPlaying(false);
      };
      previewAudio.onpause = () => {
        setPreviewPlaying(false);
      };
      await previewAudio.play();
      setPreviewPlaying(true);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Preview failed.");
      setPreviewPlaying(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const previewIcon = previewLoading ? "⏳" : previewPlaying ? "■" : "▶";

  return (
    <main
      style={{
        fontFamily: "sans-serif",
        padding: "2rem",
        maxWidth: 720,
        margin: "0 auto",
        background: BRAND_COLORS.neutral.white,
        borderRadius: 16,
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>PQ Reps Generator</h1>
      <p style={{ marginBottom: "2rem", color: BRAND_COLORS.neutral.black }}>
        Choose the type of PQ Reps you'd like to practice.
      </p>
      <p style={{ marginBottom: "2rem", color: BRAND_COLORS.neutral.black }}>
        Audio is AI-generated.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.5rem" }}>
        <div>
          <div style={sectionToggleStyle}>
            <button
              type="button"
              style={getSectionToggleButtonStyle(activeSection === "quick")}
              onClick={() => handleSectionToggle("quick")}
            >
              Quick Access
            </button>
            <button
              type="button"
              style={getSectionToggleButtonStyle(activeSection === "customize")}
              onClick={() => handleSectionToggle("customize")}
            >
              Customize
            </button>
          </div>

          {activeSection === "quick" && (
            <div>
              <div style={scenarioGridStyle}>
                {QUICK_ACCESS_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => handleScenarioSelect(scenario.id)}
                    style={getScenarioCardStyle(formState.scenarioId === scenario.id)}
                  >
                    <div style={scenarioTitleStyle}>{scenario.label}</div>
                    <div style={scenarioMetaStyle}>
                      {PRACTICE_TYPE_LABELS[scenario.practiceType]} •{" "}
                      {capitalize(scenario.primarySense)} •{" "}
                      {formatDurationLabel(scenario.durationMinutes)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {activeSection === "customize" && (
          <>
            <label style={{ display: "grid", gap: "0.5rem" }}>
              <span style={{ fontWeight: 600 }}>Practice type</span>
              <PillRadioGroup
                name="practiceType"
                ariaLabel="Practice type"
                options={practiceTypeOptions}
                value={formState.practiceType}
                onChange={(value) =>
                  updateFormState({
                    practiceType: value as FormState["practiceType"],
                    scenarioId: undefined,
                  })
                }
              />
            </label>

            <label style={{ display: "grid", gap: "0.5rem" }}>
              <span style={{ fontWeight: 600 }}>Focus</span>
              <PillRadioGroup
                name="focus"
                ariaLabel="Focus"
                options={focusPillOptions}
                value={formState.focus}
                onChange={(value) =>
                  updateFormState({
                    focus: value as FormState["focus"],
                    scenarioId: undefined,
                  })
                }
              />
            </label>

            <label style={{ display: "grid", gap: "0.5rem" }}>
              <span style={{ fontWeight: 600 }}>Duration</span>
              <PillRadioGroup
                name="durationMinutes"
                ariaLabel="Duration"
                options={durationPillOptions}
                value={String(formState.durationMinutes)}
                onChange={(value) =>
                  updateFormState({
                    durationMinutes: Number(value) as FormState["durationMinutes"],
                    scenarioId: undefined,
                  })
                }
              />
            </label>

            {isDevMode && (
              <>
                <label style={{ display: "grid", gap: "0.5rem" }}>
                  <span style={{ fontWeight: 600 }}>TTS newline pause (seconds)</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={formState.ttsNewlinePauseSeconds}
                    onChange={(event) =>
                      updateFormState({
                        ttsNewlinePauseSeconds:
                          Number.parseFloat(event.target.value) || 0,
                      })
                    }
                    style={{
                      padding: "0.75rem",
                      borderRadius: 6,
                      border: `1px solid ${BRAND_COLORS.neutral.black30}`,
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: "0.5rem" }}>
                  <span style={{ fontWeight: 600 }}>Debug TTS prompt</span>
                  <span style={{ fontSize: "0.9rem", color: BRAND_COLORS.neutral.black }}>
                    Shows the exact TTS payload used for OpenAI audio generation.
                  </span>
                  <input
                    type="checkbox"
                    checked={formState.debugTtsPrompt}
                    onChange={(event) =>
                      updateFormState({ debugTtsPrompt: event.target.checked })
                    }
                    style={{ width: 18, height: 18 }}
                  />
                </label>
              </>
            )}
          </>
        )}

        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Language</span>
          <PillRadioGroup
            name="language"
            ariaLabel="Language"
            options={languagePillOptions}
            value={formState.language}
            onChange={(value) => updateFormState({ language: value })}
          />
        </label>

        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Voice</span>
          <span style={{ fontSize: "0.9rem", color: BRAND_COLORS.neutral.black }}>
            Choose the voice you prefer for guidance.
          </span>
          <PillRadioGroup
            name="voiceGender"
            ariaLabel="Voice"
            options={voicePillOptions}
            value={formState.voiceGender}
            onChange={(value) => updateFormState({ voiceGender: value as FormState["voiceGender"] })}
          />
          <button
            type="button"
            onClick={() => handleVoicePreview()}
            disabled={previewLoading}
            style={{
              justifySelf: "start",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.4rem 0.9rem",
              borderRadius: 999,
              border: `1px solid ${BRAND_COLORS.neutral.black30}`,
              background: BRAND_COLORS.neutral.grayBase,
              color: BRAND_COLORS.neutral.black,
              fontWeight: 500,
              lineHeight: 1.2,
              cursor: previewLoading ? "not-allowed" : "pointer",
            }}
          >
            <span>Preview</span>
            <span aria-hidden="true">{previewIcon}</span>
          </button>
          <audio ref={previewAudioRef} hidden />
          {previewError && (
            <span style={{ fontSize: "0.9rem", color: BRAND_COLORS.orange.dark }}>
              {previewError}
            </span>
          )}
        </label>

        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span
            style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          >
            Audio delivery
            <span
              style={infoIconStyle}
              aria-label="Streaming starts playback sooner but can be less reliable on spotty connections and may limit seeking or offline replay."
              tabIndex={0}
              onMouseEnter={() => setShowAudioInfo(true)}
              onMouseLeave={() => setShowAudioInfo(false)}
              onFocus={() => setShowAudioInfo(true)}
              onBlur={() => setShowAudioInfo(false)}
            >
              i
              <span
                style={{ ...infoTooltipStyle, opacity: showAudioInfo ? 1 : 0 }}
                className="info-tooltip"
                role="tooltip"
              >
                Streaming starts playback sooner but can be less reliable on spotty connections and may limit seeking or offline replay.
              </span>
            </span>
          </span>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <PillRadioGroup
              name="audioDelivery"
              ariaLabel="Audio delivery"
              options={audioDeliveryOptions}
              value={formState.audioDelivery}
              onChange={(value) =>
                updateFormState({ audioDelivery: value as FormState["audioDelivery"] })
              }
            />
          </div>
        </label>

        {errors.length > 0 && (
          <div
            role="alert"
            style={{
              background: BRAND_COLORS.orange.light,
              borderRadius: 8,
              padding: "1rem",
              color: BRAND_COLORS.orange.dark,
            }}
          >
            <strong style={{ display: "block", marginBottom: "0.5rem" }}>Please fix the following:</strong>
            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: "1.1rem 2.25rem",
            background: isLoading ? BRAND_COLORS.neutral.grayMid : BRAND_COLORS.neutral.black,
            color: BRAND_COLORS.neutral.grayBase,
            borderRadius: 999,
            border: "none",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: "1.05rem",
          }}
        >
          {isLoading ? "Preparing PQ Reps…" : "Prepare PQ Reps"}
        </button>
      </form>

      {status === "loading" && (
        <p style={{ marginTop: "1.5rem", color: BRAND_COLORS.neutral.black }}>
          Preparing your PQ Reps session. This can take a few seconds.
        </p>
      )}

      {shouldShowResult && result && (
        <section
          style={{
            marginTop: "2rem",
            padding: "1.5rem",
            borderRadius: 12,
            background: BRAND_COLORS.neutral.grayBase,
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            {isLoading ? "Streaming audio…" : "Your session is ready"}
          </h2>
          {(result.audioStream || result.audioUrl) && (
            <audio
              ref={audioRef}
              controls
              src={result.audioUrl}
              style={{ width: "100%", marginBottom: "1rem" }}
            >
              Your browser does not support the audio element.
            </audio>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1rem" }}>
            <a
              href={result.downloadUrl}
              download={result.downloadFilename ?? "pq-reps.wav"}
              aria-disabled={!result.downloadUrl}
              style={{
                fontWeight: 600,
                color: result.downloadUrl
                  ? BRAND_COLORS.neutral.black
                  : BRAND_COLORS.neutral.black30,
                pointerEvents: result.downloadUrl ? "auto" : "none",
                textDecoration: "none",
              }}
            >
              Download the audio
            </a>
            <span style={{ color: BRAND_COLORS.neutral.black }} aria-hidden="true">
              {" "}
              |{" "}
            </span>
            <a
              href={result.scriptDownloadUrl}
              download={result.scriptDownloadFilename ?? "pq-reps.txt"}
              aria-disabled={!result.scriptDownloadUrl}
              style={{
                fontWeight: 600,
                color: result.scriptDownloadUrl
                  ? BRAND_COLORS.neutral.black
                  : BRAND_COLORS.neutral.black30,
                pointerEvents: result.scriptDownloadUrl ? "auto" : "none",
                textDecoration: "none",
              }}
            >
              Download the text
            </a>
          </div>
          {result.script && (
            <>
              <p style={{ marginTop: "1rem", whiteSpace: "pre-line" }}>{result.script}</p>
            </>
          )}
          {result.ttsPrompt && (
            <div style={{ marginTop: "1.5rem" }}>
              <h3 style={{ marginBottom: "0.5rem" }}>TTS prompt (debug)</h3>
              <pre
                style={{
                  background: BRAND_COLORS.neutral.black,
                  color: BRAND_COLORS.neutral.grayBase,
                  padding: "1rem",
                  borderRadius: 8,
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {result.ttsPrompt}
              </pre>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
