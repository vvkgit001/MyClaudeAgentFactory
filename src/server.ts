/**
 * server.ts
 *
 * Express API server on port 3001.
 *
 * POST /api/generate  — validates inputs, spawns agentRunner as a child
 *                       process, buffers stdout, returns { jobId }
 * GET  /api/stream/:jobId — SSE endpoint that streams buffered + live lines
 * GET  /api/health    — liveness check for Vite proxy
 */

import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import { randomUUID, randomBytes, createHash } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { Request, Response } from "express";

import { existsSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UI_DIST = join(__dirname, "..", "ui", "dist");

const app = express();
app.use(cors());
app.use(express.json());

// Serve the built React UI if it exists
if (existsSync(UI_DIST)) {
  app.use(express.static(UI_DIST));
}

// ─── Job store ────────────────────────────────────────────────────────────────

interface Job {
  lines: string[];      // text lines for SSE replay; \x02-prefixed = user message
  done: boolean;
  error: string | null;
  awaitingReply: boolean;
  child: ReturnType<typeof spawn> | null;
  listeners: Set<(line: string) => void>;
}

const jobs = new Map<string, Job>();

// ─── POST /api/generate ───────────────────────────────────────────────────────

interface GenerateBody {
  epicLink?: string;
  figmaUrl?: string;
  confluenceUrls?: string[];
  jiraProject?: string;
  customInstructions?: string;
}

app.post("/api/generate", (req: Request, res: Response) => {
  const body = req.body as GenerateBody;

  if (!body.epicLink || !body.epicLink.trim()) {
    res.status(400).json({ error: "epicLink is required" });
    return;
  }

  const jobId = randomUUID();
  const job: Job = {
    lines: [],
    done: false,
    error: null,
    awaitingReply: false,
    child: null,
    listeners: new Set(),
  };
  jobs.set(jobId, job);

  // Spawn agentRunner as a child process
  const runnerPath = join(__dirname, "agentRunner.ts");
  const child = spawn("npx", ["tsx", runnerPath], {
    cwd: join(__dirname, ".."),
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
  });
  job.child = child;

  // Write initial JSON as first line — keep stdin open for follow-up replies
  child.stdin.write(
    JSON.stringify({
      epicLink: body.epicLink.trim(),
      figmaUrl: body.figmaUrl?.trim() || undefined,
      confluenceUrls: body.confluenceUrls?.filter((u) => u.trim()) ?? [],
      jiraProject: body.jiraProject?.trim() || undefined,
      customInstructions: body.customInstructions?.trim() || undefined,
    }) + "\n"
  );

  // Buffer stdout and notify listeners
  let partial = "";
  child.stdout.on("data", (chunk: Buffer) => {
    partial += chunk.toString("utf-8");
    const parts = partial.split("\n");
    partial = parts.pop() ?? "";
    for (const line of parts) {
      if (line === "\x01AWAIT_REPLY") {
        // Agent finished a turn — waiting for user input
        job.awaitingReply = true;
        for (const listener of job.listeners) {
          listener("\x01AWAIT_REPLY");
        }
      } else {
        job.lines.push(line);
        for (const listener of job.listeners) {
          listener(line);
        }
      }
    }
  });

  // Forward stderr to server stderr for debugging
  child.stderr.on("data", (chunk: Buffer) => {
    process.stderr.write(`[job ${jobId}] ${chunk.toString("utf-8")}`);
  });

  child.on("close", (code) => {
    // Flush any remaining partial line
    if (partial) {
      job.lines.push(partial);
      for (const listener of job.listeners) {
        listener(partial);
      }
    }

    if (code !== 0) {
      job.error = `Agent process exited with code ${code ?? "unknown"}`;
    }
    job.done = true;

    // Notify all listeners that the stream is finished
    for (const listener of job.listeners) {
      listener("\x00DONE");
    }
    job.listeners.clear();
  });

  res.json({ jobId });
});

// ─── GET /api/stream/:jobId ───────────────────────────────────────────────────

app.get("/api/stream/:jobId", (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering if behind proxy
  res.flushHeaders();

  const sendEvent = (type: string, content?: string) => {
    const payload = content !== undefined ? JSON.stringify({ type, content }) : JSON.stringify({ type });
    res.write(`data: ${payload}\n\n`);
  };

  // Flush already-buffered lines (text + user messages)
  for (const line of job.lines) {
    if (line.startsWith("\x02")) {
      sendEvent("user_message", line.slice(1));
    } else {
      sendEvent("text", line);
    }
  }

  // If already awaiting a reply (and not yet done), replay the signal
  if (job.awaitingReply && !job.done) {
    sendEvent("await_reply");
  }

  // If already done, close immediately
  if (job.done) {
    if (job.error) {
      sendEvent("error", job.error);
    } else {
      sendEvent("done");
    }
    res.end();
    return;
  }

  // Register listener for new lines
  const listener = (line: string) => {
    if (line === "\x00DONE") {
      if (job.error) {
        sendEvent("error", job.error);
      } else {
        sendEvent("done");
      }
      res.end();
    } else if (line === "\x01AWAIT_REPLY") {
      sendEvent("await_reply");
    } else if (line.startsWith("\x02")) {
      sendEvent("user_message", line.slice(1));
    } else {
      sendEvent("text", line);
    }
  };

  job.listeners.add(listener);

  // Clean up on client disconnect
  req.on("close", () => {
    job.listeners.delete(listener);
  });
});

// ─── POST /api/jobs/:jobId/message ───────────────────────────────────────────

app.post("/api/jobs/:jobId/message", (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job || job.done) {
    res.status(404).json({ error: "Job not found or already completed" });
    return;
  }

  if (!job.awaitingReply || !job.child?.stdin?.writable) {
    res.status(400).json({ error: "Agent is not currently waiting for a reply" });
    return;
  }

  const { message } = req.body as { message?: string };
  if (!message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const text = message.trim();

  // Write reply as next stdin line
  job.child.stdin.write(text + "\n");
  job.awaitingReply = false;

  // Store and broadcast the user message so it appears in the output stream
  const userLine = "\x02" + text;
  job.lines.push(userLine);
  for (const listener of job.listeners) {
    listener(userLine);
  }

  res.json({ ok: true });
});

// ─── Atlassian OAuth ──────────────────────────────────────────────────────────

const CREDENTIALS_PATH = join(homedir(), ".claude", ".credentials.json");
const ATLASSIAN_MCP_URL = "https://mcp.atlassian.com/v1/mcp";
const ATLASSIAN_AUTH_ENDPOINT = "https://mcp.atlassian.com/v1/authorize";
const ATLASSIAN_TOKEN_ENDPOINT = "https://cf.mcp.atlassian.com/v1/token";
const ATLASSIAN_REGISTER_ENDPOINT = "https://cf.mcp.atlassian.com/v1/register";
const ATLASSIAN_REDIRECT_URI = "http://localhost:3001/api/atlassian/callback";

interface PkceState {
  clientId: string;
  codeVerifier: string;
  state: string;
}
let pendingAtlassianPkce: PkceState | null = null;

function readCredentials(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(CREDENTIALS_PATH, "utf-8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

app.get("/api/atlassian/status", (_req: Request, res: Response) => {
  const creds = readCredentials();
  const mcpOAuth = (creds.mcpOAuth ?? {}) as Record<string, { serverName: string; accessToken: string; expiresAt: number }>;
  const entry = Object.values(mcpOAuth).find((v) => v.serverName === "atlassian");
  if (entry?.accessToken && entry.expiresAt > Date.now()) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

app.get("/api/atlassian/auth-url", async (_req: Request, res: Response) => {
  try {
    const regRes = await fetch(ATLASSIAN_REGISTER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        redirect_uris: [ATLASSIAN_REDIRECT_URI],
        client_name: "User Story Creator",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        code_challenge_method: "S256",
      }),
    });
    const client = await regRes.json() as { client_id: string };

    const codeVerifier = randomBytes(32).toString("base64url");
    const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
    const state = randomBytes(16).toString("hex");

    pendingAtlassianPkce = { clientId: client.client_id, codeVerifier, state };

    const authUrl = new URL(ATLASSIAN_AUTH_ENDPOINT);
    authUrl.searchParams.set("client_id", client.client_id);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", ATLASSIAN_REDIRECT_URI);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", state);

    res.json({ url: authUrl.toString() });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get("/api/atlassian/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query as { code?: string; state?: string };

  if (!code || !pendingAtlassianPkce || state !== pendingAtlassianPkce.state) {
    res.status(400).send("Invalid or expired OAuth callback.");
    return;
  }

  try {
    const tokenRes = await fetch(ATLASSIAN_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: ATLASSIAN_REDIRECT_URI,
        client_id: pendingAtlassianPkce.clientId,
        code_verifier: pendingAtlassianPkce.codeVerifier,
      }),
    });
    const token = await tokenRes.json() as {
      access_token: string;
      expires_in?: number;
      refresh_token?: string;
    };

    const creds = readCredentials();
    const mcpOAuth = (creds.mcpOAuth ?? {}) as Record<string, unknown>;
    const existingKey = Object.keys(mcpOAuth).find(
      (k) => (mcpOAuth[k] as { serverName: string }).serverName === "atlassian"
    );
    const key = existingKey ?? `atlassian|${randomBytes(8).toString("hex")}`;

    mcpOAuth[key] = {
      ...(mcpOAuth[key] as object ?? {}),
      serverName: "atlassian",
      serverUrl: ATLASSIAN_MCP_URL,
      clientId: pendingAtlassianPkce.clientId,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? "",
      expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : Date.now() + 3_600_000,
      discoveryState: { authorizationServerUrl: "https://mcp.atlassian.com/", oauthMetadataFound: true },
    };
    creds.mcpOAuth = mcpOAuth;

    writeFileSync(CREDENTIALS_PATH, JSON.stringify(creds, null, 2));

    // Clear the needs-auth cache
    try {
      const cachePath = join(homedir(), ".claude", "mcp-needs-auth-cache.json");
      const cache = JSON.parse(readFileSync(cachePath, "utf-8")) as Record<string, unknown>;
      delete cache.atlassian;
      writeFileSync(cachePath, JSON.stringify(cache));
    } catch { /* ignore */ }

    pendingAtlassianPkce = null;

    res.send(`<!DOCTYPE html>
<html>
<head><title>Authorized</title>
<style>body{font-family:system-ui,sans-serif;background:#0d1117;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}</style>
</head>
<body>
  <div style="text-align:center">
    <div style="font-size:56px;margin-bottom:16px">✓</div>
    <h2 style="margin:0 0 8px">Atlassian Authorized</h2>
    <p style="color:#64748b">You can close this window.</p>
    <script>
      if(window.opener){window.opener.postMessage({type:'atlassian-auth-success'},'*');}
      setTimeout(()=>window.close(),2000);
    </script>
  </div>
</body>
</html>`);
  } catch (err) {
    res.status(500).send(`Token exchange failed: ${String(err)}`);
  }
});

// ─── GET /api/health ─────────────────────────────────────────────────────────

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// ─── SPA fallback (must come after all API routes) ───────────────────────────

if (existsSync(UI_DIST)) {
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(join(UI_DIST, "index.html"));
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = 3001;
const server = app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[server] Port ${PORT} is already in use.\n` +
        `Run: powershell -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force"`
    );
  } else {
    console.error("[server] Server error:", err.message);
  }
  process.exit(1);
});
