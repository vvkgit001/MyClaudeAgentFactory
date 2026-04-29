/**
 * agentRunner.ts
 *
 * Spawnable script invoked by server.ts as a child process.
 *
 * Protocol
 * ─────────
 * stdin  (line-delimited)
 *   line 0  : initial JSON payload  { epicLink, figmaUrl, … }
 *   line 1+ : user replies during the conversation
 *
 * stdout (line-delimited)
 *   regular lines  : agent text output
 *   \x01AWAIT_REPLY : agent finished a turn; waiting for user input
 *
 * Multi-turn loop:
 *   1. Run query()  → emit result lines
 *   2. Emit \x01AWAIT_REPLY
 *   3. Wait up to 5 min for next stdin line
 *   4. If reply arrives → build continuation prompt → goto 1
 *   5. If timeout / EOF → exit
 */

import { query, type Options, type SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

interface RunnerInput {
  mode?: "epic" | "single";
  epicLink?: string;
  storyBrief?: string;
  epicParent?: string;
  additionalNotes?: string;
  figmaUrl?: string;
  confluenceUrls?: string[];
  customInstructions?: string;
  targetProject?: string;
}

function buildTaskPrompt(input: RunnerInput): string {
  const mode = input.mode ?? "epic";

  if (mode === "single") {
    const lines: string[] = [
      "Please create a single standalone user story based on the following brief.",
      "",
      "MODE: SINGLE_STORY",
      "",
      `Story Brief: ${input.storyBrief ?? ""}`,
    ];
    if (input.targetProject) lines.push(`Target Jira Project: ${input.targetProject}`);
    if (input.figmaUrl) lines.push(`Figma Design: ${input.figmaUrl}`);
    if (input.confluenceUrls && input.confluenceUrls.length > 0) {
      lines.push("Supporting Documentation:");
      for (const url of input.confluenceUrls) lines.push(`  - ${url}`);
    }
    if (input.additionalNotes) {
      lines.push("", "Additional Notes (raw requirements, meeting outputs, etc.):");
      lines.push(input.additionalNotes);
    }
    lines.push(
      "",
      `Optional EPIC Parent: ${input.epicParent ? input.epicParent : "None — create as standalone story with no parent"}`
    );
    if (input.customInstructions) {
      lines.push("", `Additional Instructions: ${input.customInstructions}`);
    }
    return lines.join("\n");
  }

  // Epic Stories mode (default)
  const lines: string[] = [
    "Please generate user stories for the following EPIC.",
    "",
    "MODE: EPIC_STORIES",
    "",
    `EPIC Link: ${input.epicLink ?? ""}`,
  ];
  if (input.targetProject) lines.push(`Target Jira Project: ${input.targetProject}`);
  if (input.figmaUrl) lines.push(`Figma Design: ${input.figmaUrl}`);
  if (input.confluenceUrls && input.confluenceUrls.length > 0) {
    lines.push("Supporting Documentation:");
    for (const url of input.confluenceUrls) lines.push(`  - ${url}`);
  }
  if (input.customInstructions) {
    lines.push("", `Additional Instructions: ${input.customInstructions}`);
  }
  return lines.join("\n");
}

// ─── Line-by-line stdin reader ────────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, terminal: false, crlfDelay: Infinity });
const lineQueue: string[] = [];
const lineWaiters: Array<(line: string | null) => void> = [];

rl.on("line", (raw) => {
  const line = raw.trim();
  if (lineWaiters.length > 0) {
    lineWaiters.shift()!(line);
  } else {
    lineQueue.push(line);
  }
});

rl.on("close", () => {
  for (const waiter of lineWaiters.splice(0)) {
    waiter(null);
  }
});

function readLine(timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    if (lineQueue.length > 0) {
      resolve(lineQueue.shift()!);
      return;
    }
    let settled = false;
    const settle = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const idx = lineWaiters.indexOf(settle);
      if (idx !== -1) lineWaiters.splice(idx, 1);
      resolve(value);
    };
    const timer = setTimeout(() => settle(null), timeoutMs);
    lineWaiters.push(settle);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // First line is always the initial JSON payload
  const firstLine = await readLine(30_000);
  if (!firstLine) {
    process.stderr.write("agentRunner: timeout waiting for initial input\n");
    process.exit(1);
  }

  let input: RunnerInput;
  try {
    input = JSON.parse(firstLine) as RunnerInput;
  } catch {
    process.stderr.write("agentRunner: failed to parse stdin JSON\n");
    process.exit(1);
  }

  const mode = input.mode ?? "epic";
  if (mode === "epic" && !input.epicLink) {
    process.stderr.write("agentRunner: epicLink is required for Epic Stories mode\n");
    process.exit(1);
  }
  if (mode === "single" && !input.storyBrief) {
    process.stderr.write("agentRunner: storyBrief is required for Single Story mode\n");
    process.exit(1);
  }

  const originalTask = buildTaskPrompt(input);
  const options: Options = {
    agent: "user-story-creator",
    permissionMode: "default",
    maxTurns: 40,
    cwd: PROJECT_ROOT,
  };

  // Accumulate conversation history for multi-turn context
  const history: Array<{ role: "assistant" | "user"; content: string }> = [];
  let currentPrompt = originalTask;

  while (true) {
    let lastResult = "";

    for await (const message of query({ prompt: currentPrompt, options })) {
      const msg = message as SDKResultMessage;
      if (msg.type === "result" && msg.subtype === "success" && msg.result) {
        lastResult = msg.result;
        process.stdout.write(msg.result + "\n");
      }
    }

    if (lastResult) {
      history.push({ role: "assistant", content: lastResult });
    }

    // Signal that we are ready for user input
    process.stdout.write("\x01AWAIT_REPLY\n");

    // Wait up to 5 minutes for the user's reply
    const reply = await readLine(5 * 60 * 1000);
    if (!reply) break; // timeout or EOF — exit cleanly

    history.push({ role: "user", content: reply });

    // Build the continuation prompt with full conversation history so far
    const historyText = history
      .map((m) =>
        m.role === "assistant"
          ? `ASSISTANT:\n${m.content}`
          : `USER:\n${m.content}`
      )
      .join("\n\n---\n\n");

    currentPrompt =
      `${originalTask}\n\n` +
      `===== CONVERSATION HISTORY =====\n` +
      `${historyText}\n` +
      `=================================\n\n` +
      `Continue the task based on the user's latest reply shown above. ` +
      `Do not restart from scratch — build on the work already completed.`;
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`agentRunner error: ${String(err)}\n`);
  process.exit(1);
});
