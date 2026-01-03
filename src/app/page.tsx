"use client";

import { useEffect, useMemo, useState } from "react";

type GenerationResult = {
  audioUrl?: string;
  script?: string;
};

type FormState = {
  practiceMode:
    | "tactile"
    | "tense_relax"
    | "moving"
    | "sitting"
    | "label_with_anchor"
    | "label_while_scanning";
  bodyState: "still_seated" | "still_seated_closed_eyes" | "moving";
  eyeState: "closed" | "open_focused" | "open_diffused";
  primarySense:
    | "touch"
    | "hearing"
    | "sight"
    | "breath"
    | "body_weight"
    | "smell"
    | "taste";
  durationMinutes: 1 | 2 | 5 | 12;
  labelingMode: "none" | "breath_anchor" | "scan_and_label";
  silenceProfile: "none" | "short_pauses" | "extended_silence";
  normalizationFrequency: "once" | "periodic" | "repeated";
  closingStyle: "minimal" | "pq_framed" | "pq_framed_with_progression";
  senseRotation?: "none" | "guided_rotation" | "free_choice";
  language: string;
  outputMode: "text" | "audio" | "text-audio";
};

const DEFAULT_STATE: FormState = {
  practiceMode: "tactile",
  bodyState: "still_seated_closed_eyes",
  eyeState: "closed",
  primarySense: "touch",
  durationMinutes: 2,
  labelingMode: "none",
  silenceProfile: "short_pauses",
  normalizationFrequency: "once",
  closingStyle: "minimal",
  senseRotation: "none",
  language: "en",
  outputMode: "audio",
};

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];

const PRACTICE_MODE_OPTIONS: FormState["practiceMode"][] = [
  "tactile",
  "tense_relax",
  "moving",
  "sitting",
  "label_with_anchor",
  "label_while_scanning",
];

const PRIMARY_SENSE_OPTIONS: FormState["primarySense"][] = [
  "touch",
  "hearing",
  "sight",
  "breath",
  "body_weight",
  "smell",
  "taste",
];

const DURATION_OPTIONS: FormState["durationMinutes"][] = [1, 2, 5, 12];

const formatDurationLabel = (minutes: number) =>
  `${minutes} minute${minutes === 1 ? "" : "s"}`;

const SILENCE_PROFILE_OPTIONS: FormState["silenceProfile"][] = [
  "none",
  "short_pauses",
  "extended_silence",
];

const SENSE_ROTATION_OPTIONS: NonNullable<FormState["senseRotation"]>[] = [
  "none",
  "guided_rotation",
  "free_choice",
];

export default function HomePage() {
  const [formState, setFormState] = useState<FormState>(DEFAULT_STATE);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const isLoading = status === "loading";

  const allowedBodyStates = useMemo(() => {
    if (formState.practiceMode === "moving") {
      return ["moving"] as FormState["bodyState"][];
    }
    if (formState.practiceMode === "tactile") {
      return ["still_seated_closed_eyes"] as FormState["bodyState"][];
    }
    return ["still_seated", "still_seated_closed_eyes"] as FormState["bodyState"][];
  }, [formState.practiceMode]);

  const allowedEyeStates = useMemo(() => {
    if (formState.practiceMode === "moving" || formState.practiceMode === "sitting") {
      return ["open_focused", "open_diffused"] as FormState["eyeState"][];
    }
    if (formState.practiceMode === "tactile") {
      return ["closed"] as FormState["eyeState"][];
    }
    return ["closed", "open_focused", "open_diffused"] as FormState["eyeState"][];
  }, [formState.practiceMode]);

  const allowedLabelingModes = useMemo(() => {
    if (formState.practiceMode === "label_with_anchor") {
      return ["breath_anchor"] as FormState["labelingMode"][];
    }
    if (formState.practiceMode === "label_while_scanning") {
      return ["scan_and_label"] as FormState["labelingMode"][];
    }
    return ["none"] as FormState["labelingMode"][];
  }, [formState.practiceMode]);

  const allowedSilenceProfiles = useMemo(() => {
    if (formState.durationMinutes === 1 || formState.durationMinutes === 2) {
      return ["none", "short_pauses"] as FormState["silenceProfile"][];
    }
    return SILENCE_PROFILE_OPTIONS;
  }, [formState.durationMinutes]);

  const requiredNormalizationFrequency = useMemo(() => {
    if (formState.durationMinutes === 1 || formState.durationMinutes === 2) {
      return "once";
    }
    if (formState.durationMinutes === 5) {
      return "periodic";
    }
    return "repeated";
  }, [formState.durationMinutes]);

  const requiredClosingStyle = useMemo(() => {
    if (formState.durationMinutes === 1 || formState.durationMinutes === 2) {
      return "minimal";
    }
    if (formState.durationMinutes === 5) {
      return "pq_framed";
    }
    return "pq_framed_with_progression";
  }, [formState.durationMinutes]);

  useEffect(() => {
    return () => {
      if (result?.audioUrl) {
        URL.revokeObjectURL(result.audioUrl);
      }
    };
  }, [result]);

  useEffect(() => {
    setFormState((prev) => {
      let next = prev;
      let changed = false;

      if (!allowedBodyStates.includes(prev.bodyState)) {
        next = { ...next, bodyState: allowedBodyStates[0] };
        changed = true;
      }

      if (!allowedEyeStates.includes(prev.eyeState)) {
        next = { ...next, eyeState: allowedEyeStates[0] };
        changed = true;
      }

      if (!allowedLabelingModes.includes(prev.labelingMode)) {
        next = { ...next, labelingMode: allowedLabelingModes[0] };
        changed = true;
      }

      if (!allowedSilenceProfiles.includes(prev.silenceProfile)) {
        next = { ...next, silenceProfile: allowedSilenceProfiles[0] };
        changed = true;
      }

      if (prev.normalizationFrequency !== requiredNormalizationFrequency) {
        next = { ...next, normalizationFrequency: requiredNormalizationFrequency };
        changed = true;
      }

      if (prev.closingStyle !== requiredClosingStyle) {
        next = { ...next, closingStyle: requiredClosingStyle };
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [
    allowedBodyStates,
    allowedEyeStates,
    allowedLabelingModes,
    allowedSilenceProfiles,
    requiredNormalizationFrequency,
    requiredClosingStyle,
  ]);

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

    const payload = {
      practiceMode: formState.practiceMode,
      bodyState: formState.bodyState,
      eyeState: formState.eyeState,
      primarySense: formState.primarySense,
      durationMinutes: formState.durationMinutes,
      labelingMode: formState.labelingMode,
      silenceProfile: formState.silenceProfile,
      normalizationFrequency: formState.normalizationFrequency,
      closingStyle: formState.closingStyle,
      senseRotation: formState.senseRotation,
      languages: [formState.language],
      durationSeconds: formState.durationSeconds,
      topic: formState.topic || undefined,
      outputMode: formState.outputMode,
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

      if (formState.outputMode === "text") {
        const jsonResult = await requestJson();
        script = jsonResult.script;
      } else if (formState.outputMode === "audio") {
        const audioBlob = await requestAudio();
        audioUrl = URL.createObjectURL(audioBlob);
      } else {
        const jsonResult = (await requestJson()) as {
          script: string;
          audioBase64?: string;
          audioContentType?: string;
        };
        script = jsonResult.script;
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
        Build guided PQ Reps sessions that sharpen the PQ brain with tactile, breath, or visual
        focus. Choose how you are practicing (like tactile PQ reps), then set the duration to
        match how long you want the rep to last.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.5rem" }}>
        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Practice Mode</span>
          <select
            name="practiceMode"
            value={formState.practiceMode}
            onChange={(event) =>
              updateFormState({
                practiceMode: event.target.value as FormState["practiceMode"],
              })
            }
            style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
          >
            {PRACTICE_MODE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Body State</span>
          <select
            name="bodyState"
            value={formState.bodyState}
            onChange={(event) =>
              updateFormState({ bodyState: event.target.value as FormState["bodyState"] })
            }
            style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
          >
            {allowedBodyStates.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Eye State</span>
          <select
            name="eyeState"
            value={formState.eyeState}
            onChange={(event) =>
              updateFormState({ eyeState: event.target.value as FormState["eyeState"] })
            }
            style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
          >
            {allowedEyeStates.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Primary Sense</span>
          <select
            name="primarySense"
            value={formState.primarySense}
            onChange={(event) =>
              updateFormState({
                primarySense: event.target.value as FormState["primarySense"],
              })
            }
            style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
          >
            {PRIMARY_SENSE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, " ")}
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
          <span style={{ fontWeight: 600 }}>Labeling Mode</span>
          <select
            name="labelingMode"
            value={formState.labelingMode}
            onChange={(event) =>
              updateFormState({
                labelingMode: event.target.value as FormState["labelingMode"],
              })
            }
            style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
          >
            {allowedLabelingModes.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Silence Profile</span>
          <select
            name="silenceProfile"
            value={formState.silenceProfile}
            onChange={(event) =>
              updateFormState({
                silenceProfile: event.target.value as FormState["silenceProfile"],
              })
            }
            style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
          >
            {allowedSilenceProfiles.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Normalization Frequency</span>
          <select
            name="normalizationFrequency"
            value={formState.normalizationFrequency}
            onChange={(event) =>
              updateFormState({
                normalizationFrequency: event.target.value as FormState["normalizationFrequency"],
              })
            }
            style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
          >
            {[requiredNormalizationFrequency].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Closing Style</span>
          <select
            name="closingStyle"
            value={formState.closingStyle}
            onChange={(event) =>
              updateFormState({
                closingStyle: event.target.value as FormState["closingStyle"],
              })
            }
            style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
          >
            {[requiredClosingStyle].map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Sense Rotation</span>
          <select
            name="senseRotation"
            value={formState.senseRotation ?? "none"}
            onChange={(event) =>
              updateFormState({
                senseRotation: event.target.value as FormState["senseRotation"],
              })
            }
            style={{ padding: "0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
          >
            {SENSE_ROTATION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, " ")}
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
