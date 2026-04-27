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

async function fetchWithRetry(url: string, retries = 3, backoff = 1000): Promise<Response> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      console.warn(`[Proxy-gov] Falha na tentativa ${attempt + 1}. HTTP Status: ${response.status}`);
      if (attempt === retries - 1) return response;
    } catch (error: any) {
      if (error?.cause?.code === 'ENOTFOUND') {
        console.warn(`[Proxy-gov] Domínio não encontrado: ${url}`);
        throw error;
      }
      console.warn(`[Proxy-gov] Erro de rede na tentativa ${attempt + 1}:`, error);
      if (attempt === retries - 1) throw error;
    }
    const delay = backoff * Math.pow(2, attempt);
    await new Promise(res => setTimeout(res, delay));
    attempt++;
  }
  throw new Error("Maximum retries reached");
}

// A route that can be hit by Vercel Cron, or manually triggered
app.get("/api/proxy-gov", async (req, res) => {
  try {
    const targetUrl = req.query.url as string;
    
    if (!targetUrl) {
      return res.status(400).json({ error: "Parâmetro 'url' não fornecido" });
    }

    const inmetResponse = await fetchWithRetry(targetUrl);
    if (!inmetResponse.ok) {
      return res.status(inmetResponse.status).json({ error: `Erro ${inmetResponse.status}: Servidor do órgão governamental sobrecarregado ou indisponível` });
    }
    
    const contentType = inmetResponse.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return res.status(502).json({ error: "Erro 502: Resposta do servidor não é um JSON válido" });
    }
    
    const data = await inmetResponse.json();
    res.json(data);
  } catch (error: any) {
    if (error?.cause?.code === 'ENOTFOUND') {
      return res.status(404).json({ error: "API indisponível (Domínio não encontrado)" });
    }
    console.error("Internal Proxy Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/cron/process-alerts", async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return res.status(500).json({ error: "CRON_SECRET não configurado no servidor" });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    const result = await runCronJob();
    res.json({ success: true, result });
  } catch (err: any) {
    console.error("Cron Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// A route to manually trigger a test email
app.post("/api/test-email", async (req, res) => {
  try {
    // Import here to avoid top-level issues if env is missing
    const { supabaseAdmin } = await import("./src/services/supabaseAdmin.js");
    const { sendAlertEmail } = await import("./src/services/emailService.js");

    const { data: subscribers, error } = await supabaseAdmin.from("team_subscribers").select("email");
    
    if (error) throw error;
    if (!subscribers || subscribers.length === 0) {
      return res.status(400).json({ error: "Não há destinatários cadastrados." });
    }
    
    const emails = subscribers.map((s: any) => s.email);

    const fakeAlert = {
      externalId: "TEST-000",
      source: "DEFESA_CIVIL",
      severity: "Crítica",
      region: "Servidor Local",
      city: "Cidade Teste",
      disasterType: "TESTE DE SISTEMA",
      description: "Este é um e-mail de teste manual para verificar a estabilidade do pipeline de mensagens.",
      issuedAt: new Date(),
    };

    await sendAlertEmail(emails, fakeAlert as any);
    res.json({ success: true, message: "E-mail de teste enviado para " + emails.length + " destinatários." });
  } catch (err: any) {
    console.error("Test Email Error:", err);
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
