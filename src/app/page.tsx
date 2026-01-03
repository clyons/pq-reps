"use client";

import { useEffect, useMemo, useState } from "react";

type GenerationResult = {
  audioUrl?: string;
  script?: string;
  ttsPrompt?: string;
};

type FormState = {
  practiceType: "still_eyes_closed" | "still_eyes_open" | "moving" | "labeling";
  focus: "touch" | "hearing" | "sight" | "breath";
  durationMinutes: 1 | 2 | 5 | 12;
  language: string;
  voiceGender: "female" | "male";
  ttsNewlinePauseSeconds: number;
  debugTtsPrompt: boolean;
};

const DEFAULT_STATE: FormState = {
  practiceType: "still_eyes_closed",
  focus: "touch",
  durationMinutes: 2,
  language: "en",
  voiceGender: "female",
  ttsNewlinePauseSeconds: 1,
  debugTtsPrompt: false,
};

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];

const DURATION_OPTIONS: FormState["durationMinutes"][] = [1, 2, 5, 12];

const formatDurationLabel = (minutes: number) =>
  `${minutes} minute${minutes === 1 ? "" : "s"}`;

export default function HomePage() {
  const [formState, setFormState] = useState<FormState>(DEFAULT_STATE);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const isDevMode = process.env.NODE_ENV !== "production";
  const isLoading = status === "loading";

  const sightAllowed = useMemo(
    () => formState.practiceType === "still_eyes_open" || formState.practiceType === "moving",
    [formState.practiceType],
  );
  const focusOptions = useMemo(() => {
    if (!sightAllowed) {
      return ["touch", "hearing", "breath"] as FormState["focus"][];
    }
    return ["touch", "hearing", "sight", "breath"] as FormState["focus"][];
  }, [sightAllowed]);

  useEffect(() => {
    return () => {
      if (result?.audioUrl) {
        URL.revokeObjectURL(result.audioUrl);
      }
    };
  }, [result]);

  useEffect(() => {
    if (!focusOptions.includes(formState.focus)) {
      setFormState((prev) => ({ ...prev, focus: "touch" }));
    }
  }, [focusOptions, formState.focus]);

  const updateFormState = (updates: Partial<FormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  };

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

    const effectiveOutputMode = formState.debugTtsPrompt ? "text-audio" : "audio";
    const payload = {
      practiceType: formState.practiceType,
      focus: focusOptions.includes(formState.focus) ? formState.focus : "touch",
      durationMinutes: formState.durationMinutes,
      language: formState.language,
      voiceGender: formState.voiceGender,
      outputMode: effectiveOutputMode,
      ...(isDevMode ? { ttsNewlinePauseSeconds: formState.ttsNewlinePauseSeconds } : {}),
      ...(formState.debugTtsPrompt ? { debugTtsPrompt: true } : {}),
    };

    const requestJson = async () => {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as { error?: { message?: string } };
        throw new Error(errorBody.error?.message ?? "The generator failed to respond.");
      }

      return (await response.json()) as { script: string; ttsPrompt?: Record<string, unknown> };
    };

    const requestAudio = async () => {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/wav",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorContentType = response.headers.get("content-type") ?? "";
        if (errorContentType.includes("application/json")) {
          const errorBody = (await response.json()) as { error?: { message?: string } };
          throw new Error(errorBody.error?.message ?? "The generator failed to respond.");
        }
        throw new Error(`The generator failed to respond. (${response.status})`);
      }

      const audioBuffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") ?? "audio/wav";
      return new Blob([audioBuffer], { type: contentType });
    };

    try {
      let script: string | undefined;
      let audioUrl: string | undefined;
      let ttsPrompt: string | undefined;

      if (effectiveOutputMode === "text") {
        const jsonResult = await requestJson();
        script = jsonResult.script;
        if (jsonResult.ttsPrompt) {
          ttsPrompt = JSON.stringify(jsonResult.ttsPrompt, null, 2);
        }
      } else if (effectiveOutputMode === "audio") {
        const audioBlob = await requestAudio();
        audioUrl = URL.createObjectURL(audioBlob);
      } else {
        const jsonResult = (await requestJson()) as {
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
            type: jsonResult.audioContentType ?? "audio/mpeg",
          });
          audioUrl = URL.createObjectURL(audioBlob);
        }
      }

      setResult((prev) => {
        if (prev?.audioUrl) {
          URL.revokeObjectURL(prev.audioUrl);
        }
        return { audioUrl, script, ttsPrompt };
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

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>PQ Reps Generator</h1>
      <p style={{ marginBottom: "2rem", color: "#555" }}>
        Choose the type of PQ Reps you'd like to practice.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.5rem" }}>
        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Practice type</span>
          <select
            name="practiceType"
            value={formState.practiceType}
            onChange={(event) =>
              updateFormState({
                practiceType: event.target.value as FormState["practiceType"],
              })
            }
            style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
          >
            <option value="still_eyes_closed">Still (Eyes closed)</option>
            <option value="still_eyes_open">Still (Eyes open)</option>
            <option value="moving">Moving</option>
            <option value="labeling">Labeling</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Focus</span>
          <select
            name="focus"
            value={formState.focus}
            onChange={(event) =>
              updateFormState({
                focus: event.target.value as FormState["focus"],
              })
            }
            style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
          >
            {focusOptions.map((option) => (
              <option key={option} value={option}>
                {option === "touch"
                  ? "Touch"
                  : option === "hearing"
                    ? "Hearing"
                    : option === "sight"
                      ? "Sight"
                      : "Breath"}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Duration</span>
          <select
            name="durationMinutes"
            value={formState.durationMinutes}
            onChange={(event) =>
              updateFormState({
                durationMinutes: Number(event.target.value) as FormState["durationMinutes"],
              })
            }
            style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
          >
            {DURATION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {formatDurationLabel(option)}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Language</span>
          <select
            name="language"
            value={formState.language}
            onChange={(event) => updateFormState({ language: event.target.value })}
            style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Voice</span>
          <span style={{ fontSize: "0.9rem", color: "#555" }}>
            Choose the voice you prefer for guidance.
          </span>
          <select
            name="voiceGender"
            value={formState.voiceGender}
            onChange={(event) =>
              updateFormState({ voiceGender: event.target.value as FormState["voiceGender"] })
            }
            style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
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
                    ttsNewlinePauseSeconds: Number.parseFloat(event.target.value) || 0,
                  })
                }
                style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
              />
            </label>

            <label style={{ display: "grid", gap: "0.5rem" }}>
              <span style={{ fontWeight: 600 }}>Debug TTS prompt</span>
              <span style={{ fontSize: "0.9rem", color: "#555" }}>
                Shows the exact TTS payload used for OpenAI audio generation.
              </span>
              <input
                type="checkbox"
                checked={formState.debugTtsPrompt}
                onChange={(event) => updateFormState({ debugTtsPrompt: event.target.checked })}
                style={{ width: 18, height: 18 }}
              />
            </label>
          </>
        )}

        {errors.length > 0 && (
          <div
            role="alert"
            style={{ background: "#ffecec", borderRadius: 8, padding: "1rem", color: "#b30000" }}
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
            padding: "0.85rem 1.5rem",
            background: isLoading ? "#999" : "#111",
            color: "#fff",
            borderRadius: 999,
            border: "none",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {isLoading ? "Generating…" : "Generate"}
        </button>
      </form>

      {status === "loading" && (
        <p style={{ marginTop: "1.5rem", color: "#555" }}>
          Generating your session. This can take a few seconds.
        </p>
      )}

      {status === "success" && result && (
        <section style={{ marginTop: "2rem", padding: "1.5rem", borderRadius: 12, background: "#f7f7f7" }}>
          <h2 style={{ marginTop: 0 }}>Your session is ready</h2>
          {result.audioUrl && (
            <>
              <audio controls style={{ width: "100%", marginBottom: "1rem" }}>
                <source src={result.audioUrl} />
                Your browser does not support the audio element.
              </audio>
              <a href={result.audioUrl} download="pq-reps.wav" style={{ fontWeight: 600 }}>
                Download the WAV
              </a>
            </>
          )}
          {result.script && (
            <p style={{ marginTop: "1rem", whiteSpace: "pre-line" }}>{result.script}</p>
          )}
          {result.ttsPrompt && (
            <div style={{ marginTop: "1.5rem" }}>
              <h3 style={{ marginBottom: "0.5rem" }}>TTS prompt (debug)</h3>
              <pre
                style={{
                  background: "#111",
                  color: "#f5f5f5",
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
