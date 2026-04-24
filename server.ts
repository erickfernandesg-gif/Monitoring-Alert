import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import process from "process";
import fs from "fs";
import { runCronJob } from "./src/services/cronService.js";

// Load environment variables if they exist in a .env file (handled by standard env setup, but for local:
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());
const PORT = 3000;

// === API ROUTES ===
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// A route that can be hit by Vercel Cron, or manually triggered
app.post("/api/cron/process-alerts", async (req, res) => {
  try {
    const result = await runCronJob();
    res.json({ success: true, result });
  } catch (err: any) {
    console.error("Cron Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Trigger a local cron interval for demonstration since not deployed on Vercel yet
// Every 15 minutes = 15 * 60 * 1000
setInterval(() => {
  console.log("Triggering local cron schedule...");
  runCronJob().catch(console.error);
}, 15 * 60 * 1000);

// === VITE MIDDLEWARE SETUP ===
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve("dist");
    app.use(express.static(distPath));
    // For React Router Catch-All
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
