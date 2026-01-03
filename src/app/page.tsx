"use client";

import { useEffect, useMemo, useState } from "react";

type GenerationResult = {
  audioUrl?: string;
  script?: string;
};

type FormState = {
  sense: "calm" | "energizing" | "focus" | "uplifting";
  durationSeconds: number;
  language: string;
  topic: string;
  outputMode: "text" | "audio" | "text-audio";
};

const DEFAULT_STATE: FormState = {
  sense: "calm",
  durationSeconds: 120,
  language: "en",
  topic: "",
  outputMode: "audio",
};

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];

const SENSE_OPTIONS: FormState["sense"][] = [
  "calm",
  "energizing",
  "focus",
  "uplifting",
];

export default function HomePage() {
  const [formState, setFormState] = useState<FormState>(DEFAULT_STATE);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const isLoading = status === "loading";

  const durationLabel = useMemo(
    () => `${formState.durationSeconds} seconds`,
    [formState.durationSeconds],
  );

  useEffect(() => {
    return () => {
      if (result?.audioUrl) {
        URL.revokeObjectURL(result.audioUrl);
      }
    };
  }, [result]);

  const updateFormState = (updates: Partial<FormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  };

  const validate = (state: FormState) => {
    const nextErrors: string[] = [];

    if (state.durationSeconds < 30 || state.durationSeconds > 900) {
      nextErrors.push("Duration must be between 30 and 900 seconds.");
    }

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

    const payload = {
      sense: formState.sense,
      languages: [formState.language],
      durationSeconds: formState.durationSeconds,
      topic: formState.topic || undefined,
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

      return (await response.json()) as { script: string };
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

      if (formState.outputMode === "text" || formState.outputMode === "text-audio") {
        const jsonResult = await requestJson();
        script = jsonResult.script;
      }

      if (formState.outputMode === "audio" || formState.outputMode === "text-audio") {
        const audioBlob = await requestAudio();
        audioUrl = URL.createObjectURL(audioBlob);
      }

      setResult((prev) => {
        if (prev?.audioUrl) {
          URL.revokeObjectURL(prev.audioUrl);
        }
        return { audioUrl, script };
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
        Create a guided prompt based on a sense focus and get instant audio playback.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.5rem" }}>
        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Sense</span>
          <select
            name="sense"
            value={formState.sense}
            onChange={(event) =>
              updateFormState({ sense: event.target.value as FormState["sense"] })
            }
            style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
          >
            {SENSE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Topic (optional)</span>
          <input
            type="text"
            name="topic"
            value={formState.topic}
            onChange={(event) => updateFormState({ topic: event.target.value })}
            placeholder="e.g. building focus"
            style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Duration</span>
          <input
            type="range"
            min={30}
            max={900}
            step={30}
            value={formState.durationSeconds}
            onChange={(event) =>
              updateFormState({ durationSeconds: Number(event.target.value) })
            }
          />
          <span style={{ color: "#555" }}>{durationLabel}</span>
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
          <span style={{ fontWeight: 600 }}>Output</span>
          <select
            name="outputMode"
            value={formState.outputMode}
            onChange={(event) =>
              updateFormState({ outputMode: event.target.value as FormState["outputMode"] })
            }
            style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
          >
            <option value="text">Text only</option>
            <option value="audio">Audio only</option>
            <option value="text-audio">Text + audio</option>
          </select>
        </label>

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
        </section>
      )}
    </main>
  );
}
