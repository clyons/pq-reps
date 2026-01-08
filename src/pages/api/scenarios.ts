import type { IncomingMessage, ServerResponse } from "http";
import { DEFAULT_LOCALE, translate } from "../../lib/i18n.js";
import { SCENARIOS } from "../../lib/promptBuilder.js";

type ScenarioResponse = {
  id: string;
  label: string;
  practiceType: string;
  primarySense: string;
  durationMinutes: number;
};

const sendJson = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "GET") {
    sendJson(res, 405, {
      error: {
        code: "method_not_allowed",
        message: translate(DEFAULT_LOCALE, "errors.method_not_allowed"),
      },
    });
    return;
  }

  const scenarios: ScenarioResponse[] = SCENARIOS.map((scenario) => ({
    id: scenario.id,
    label: scenario.label,
    practiceType: scenario.practiceType,
    primarySense: scenario.primarySense,
    durationMinutes: scenario.durationMinutes,
  }));

  sendJson(res, 200, { scenarios });
}
