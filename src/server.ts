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
import { randomUUID } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { Request, Response } from "express";

import { existsSync } from "fs";

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
