import { createHash } from "crypto";
import type { IncomingMessage, ServerResponse } from "http";
import {
  DEFAULT_LOCALE,
  resolveLocale,
  translate,
} from "../../lib/i18n/index.js";
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

const resolveLocaleFromRequest = (req: IncomingMessage) => {
  const url = new URL(req.url ?? "", `http://${req.headers.host ?? "localhost"}`);
  const queryLocale = url.searchParams.get("locale");
  if (queryLocale) {
    return resolveLocale(queryLocale);
  }
  const acceptLanguage = req.headers["accept-language"];
  if (typeof acceptLanguage === "string" && acceptLanguage.length > 0) {
    return resolveLocale(acceptLanguage.split(",")[0]?.trim());
  }
  if (Array.isArray(acceptLanguage) && acceptLanguage.length > 0) {
    return resolveLocale(acceptLanguage[0]);
  }
  return DEFAULT_LOCALE;
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

  const locale = resolveLocaleFromRequest(req);
  const scenarios: ScenarioResponse[] = SCENARIOS.map((scenario) => ({
    id: scenario.id,
    label: translate(locale, `scenario.${scenario.id}`),
    practiceType: scenario.practiceType,
    primarySense: scenario.primarySense,
    durationMinutes: scenario.durationMinutes,
  }));
  const body = JSON.stringify({ scenarios });
  const etag = `"${createHash("sha256").update(body).digest("hex")}"`;

  res.setHeader("Cache-Control", "public, max-age=3600");
  res.setHeader("ETag", etag);

  if (req.headers["if-none-match"] === etag) {
    res.statusCode = 304;
    res.end();
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(body);
}
