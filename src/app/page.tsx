"use client";

import { useMemo, useState } from "react";

type GenerationResult = {
  audioUrl: string;
  transcript: string;
};

type FormState = {
  sense: string;
  eyes: "open" | "closed";
  duration: number;
  language: string;
};

const DEFAULT_STATE: FormState = {
  sense: "",
  eyes: "open",
  duration: 30,
  language: "en",
};

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
];

export default function HomePage() {
  const [formState, setFormState] = useState<FormState>(DEFAULT_STATE);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const isLoading = status === "loading";

  const durationLabel = useMemo(() => `${formState.duration} seconds`, [formState.duration]);

  const updateFormState = (updates: Partial<FormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  };

  const validate = (state: FormState) => {
    const nextErrors: string[] = [];

    if (!state.sense.trim()) {
      nextErrors.push("Please enter the sense or focus you want to generate.");
    }

    if (state.duration < 5 || state.duration > 120) {
      nextErrors.push("Duration must be between 5 and 120 seconds.");
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

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      if (!response.ok) {
        throw new Error("The generator failed to respond.");
      }

      const data = (await response.json()) as GenerationResult;
      setResult(data);
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
          <span style={{ fontWeight: 600 }}>Sense focus</span>
          <input
            type="text"
            name="sense"
            value={formState.sense}
            onChange={(event) => updateFormState({ sense: event.target.value })}
            placeholder="e.g. warmth in your hands"
            style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
          />
        </label>

        <fieldset style={{ border: "1px solid #eee", padding: "1rem", borderRadius: 8 }}>
          <legend style={{ fontWeight: 600, padding: "0 0.5rem" }}>Eyes</legend>
          <label style={{ marginRight: "1rem" }}>
            <input
              type="radio"
              name="eyes"
              value="open"
              checked={formState.eyes === "open"}
              onChange={() => updateFormState({ eyes: "open" })}
            />{" "}
            Open
          </label>
          <label>
            <input
              type="radio"
              name="eyes"
              value="closed"
              checked={formState.eyes === "closed"}
              onChange={() => updateFormState({ eyes: "closed" })}
            />{" "}
            Closed
          </label>
        </fieldset>

        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Duration</span>
          <input
            type="range"
            min={5}
            max={120}
            step={5}
            value={formState.duration}
            onChange={(event) => updateFormState({ duration: Number(event.target.value) })}
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
          <audio controls style={{ width: "100%", marginBottom: "1rem" }}>
            <source src={result.audioUrl} />
            Your browser does not support the audio element.
          </audio>
          <p style={{ margin: 0, whiteSpace: "pre-line" }}>{result.transcript}</p>
        </section>
      )}
    </main>
  );
}
