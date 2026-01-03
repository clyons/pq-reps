import dotenv from "dotenv";
import { readFile } from "fs/promises";
import http from "http";
import path from "path";
import { URL, fileURLToPath } from "url";
import handler from "./pages/api/generate";

dotenv.config({ path: ".env.local" });
dotenv.config();

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uiPath = path.join(__dirname, "ui", "index.html");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname === "/api/generate") {
    await handler(req, res);
    return;
  }

  if (url.pathname === "/") {
    const html = await readFile(uiPath, "utf-8");
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: { code: "not_found", message: "Route not found." } }));
});

server.listen(port, () => {
  console.log(`PQ Reps API running on http://localhost:${port}`);
});
