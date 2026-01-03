import dotenv from "dotenv";
import http from "http";
import { URL } from "url";
import handler from "./pages/api/generate";

dotenv.config({ path: ".env.local" });
dotenv.config();

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname === "/api/generate") {
    await handler(req, res);
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: { code: "not_found", message: "Route not found." } }));
});

server.listen(port, () => {
  console.log(`PQ Reps API running on http://localhost:${port}`);
});
