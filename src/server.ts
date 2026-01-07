import dotenv from "dotenv";
import { readFile } from "fs/promises";
import http from "http";
import path from "path";
import { URL, fileURLToPath } from "url";
import generateHandler from "./pages/api/generate";
import ttsHandler from "./pages/api/tts";
import voicePreviewHandler from "./pages/api/voice-preview";
import { DEFAULT_LOCALE, translate } from "./lib/i18n";

dotenv.config({ path: ".env.local" });
dotenv.config();

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uiPath = path.join(__dirname, "ui", "index.html");
const packageJsonPath = path.join(process.cwd(), "package.json");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname === "/") {
    res.statusCode = 302;
    res.setHeader("Location", `/en/${url.search}`);
    res.end();
    return;
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

  if (/^\/(en|es|fr|de)\/?$/.test(url.pathname)) {
    const html = await readFile(uiPath, "utf-8");
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
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
  console.log(`PQ Reps API running on http://localhost:${port}`);
});
