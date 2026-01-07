import { randomUUID } from "crypto";
import dotenv from "dotenv";
import { readFile } from "fs/promises";
import http from "http";
import path from "path";
import { URL, fileURLToPath } from "url";
import generateHandler from "./pages/api/generate";
import ttsHandler from "./pages/api/tts";
import voicePreviewHandler from "./pages/api/voice-preview";
import { DEFAULT_LOCALE, translate } from "./lib/i18n";
import { logger } from "./lib/logger";
import { createRateLimiter } from "./lib/rateLimiter";

dotenv.config({ path: ".env.local" });
dotenv.config();

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uiPath = path.join(__dirname, "ui", "index.html");
const packageJsonPath = path.join(process.cwd(), "package.json");
const rateLimitMaxRequests = Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? "60", 10);
const rateLimitWindowSeconds = Number.parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS ?? "60", 10);
const rateLimiter = createRateLimiter({
  capacity: rateLimitMaxRequests,
  refillPerSecond: rateLimitMaxRequests / rateLimitWindowSeconds,
});

const getRateLimitKey = (req: http.IncomingMessage) => {
  const apiKeyHeader = req.headers["x-api-key"];
  if (typeof apiKeyHeader === "string" && apiKeyHeader.trim().length > 0) {
    return `api-key:${apiKeyHeader.trim()}`;
  }

  const forwardedFor = req.headers["x-forwarded-for"];
  const forwardedIp =
    typeof forwardedFor === "string" ? forwardedFor.split(",")[0]?.trim() : undefined;
  const remoteAddress = req.socket.remoteAddress ?? "unknown";
  return `ip:${forwardedIp || remoteAddress}`;
};
const apiKey = process.env.API_KEY;

const isUiRoute = (pathname: string) => pathname === "/" || /^\/(en|es|fr|de)\/?$/.test(pathname);

const getAuthToken = (req: http.IncomingMessage) => {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string") {
    const [scheme, value] = authHeader.split(" ");
    if (scheme?.toLowerCase() === "bearer" && value) {
      return value;
    }
  }

  const apiKeyHeader = req.headers["x-api-key"];
  if (typeof apiKeyHeader === "string") {
    return apiKeyHeader;
  }

  return undefined;
};

const isAuthorized = (req: http.IncomingMessage) => {
  const token = getAuthToken(req);
  return Boolean(apiKey && token && token === apiKey);
};

const sendJson = (res: http.ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const server = http.createServer(async (req, res) => {
  const requestId = randomUUID();
  const startTime = Date.now();
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const requiresAuth =
    url.pathname === "/version" || url.pathname.startsWith("/api/");
  res.setHeader("X-Request-Id", requestId);
  res.on("finish", () => {
    if (url.pathname.startsWith("/api/")) {
      logger.info("api_request", {
        requestId,
        method: req.method ?? "UNKNOWN",
        path: url.pathname,
        statusCode: res.statusCode,
        durationMs: Date.now() - startTime,
        remoteAddress: req.socket.remoteAddress ?? "unknown",
      });
    }
  });

  if (isUiRoute(url.pathname)) {
    if (url.pathname === "/") {
      res.statusCode = 302;
      res.setHeader("Location", `/en/${url.search}`);
      res.end();
      return;
    }

    if (/^\/(en|es|fr|de)\/?$/.test(url.pathname)) {
      const html = await readFile(uiPath, "utf-8");
      const hydratedHtml = html.replaceAll(
        "__API_KEY__",
        JSON.stringify(apiKey ?? ""),
      );
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(hydratedHtml);
      return;
    }
  }

  if (requiresAuth && !isAuthorized(req)) {
    sendJson(res, 401, {
      error: {
        code: "unauthorized",
        message: translate(DEFAULT_LOCALE, "errors.unauthorized"),
      },
    });
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    const key = getRateLimitKey(req);
    if (!rateLimiter.isAllowed(key)) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: {
            code: "rate_limited",
            message: "Rate limit exceeded. Try again later.",
          },
        }),
      );
      return;
    }
  }

  if (url.pathname === "/api/generate") {
    await generateHandler(req, res);
    return;
  }

  if (url.pathname === "/api/tts") {
    await ttsHandler(req, res);
    return;
  }

  if (url.pathname === "/api/voice-preview") {
    await voicePreviewHandler(req, res);
    return;
  }

  if (url.pathname === "/version") {
    try {
      const packageJson = await readFile(packageJsonPath, "utf-8");
      const { version = "unknown" } = JSON.parse(packageJson) as { version?: string };
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ version }));
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: {
            code: "version_unavailable",
            message:
              error instanceof Error
                ? error.message
                : translate(DEFAULT_LOCALE, "errors.version_unavailable"),
          },
        }),
      );
    }
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      error: {
        code: "not_found",
        message: translate(DEFAULT_LOCALE, "errors.not_found"),
      },
    }),
  );
});

server.listen(port, () => {
  logger.info("server_listening", { port });
});
