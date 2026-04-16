import { query, type Options, type SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";

export interface AgentRequirement {
  task: string;
  cwd?: string;
  maxTurns?: number;
}

export interface AgentProfile {
  name: string;
  systemPrompt: string;
  allowedTools: string[];
  permissionMode: "default" | "acceptEdits" | "plan" | "bypassPermissions";
}

/**
 * Determines the right agent profile based on the task description.
 * Uses Claude Opus to reason about what tools and permissions are needed.
 */
function buildAgentProfile(task: string): AgentProfile {
  const lower = task.toLowerCase();

  // Code review / analysis — read-only
  if (/review|analyze|audit|inspect|check/.test(lower) && !/fix|refactor|edit|write/.test(lower)) {
    return {
      name: "Code Analyst",
      systemPrompt:
        "You are an expert code analyst. Read and analyze the codebase thoroughly. " +
        "Provide clear, actionable feedback with specific file and line references.",
      allowedTools: ["Read", "Glob", "Grep"],
      permissionMode: "default",
    };
  }

  // Web research
  if (/research|search|find|look up|browse|web/.test(lower)) {
    return {
      name: "Research Agent",
      systemPrompt:
        "You are a thorough research assistant. Search the web and gather accurate, " +
        "well-sourced information. Summarize key findings concisely.",
      allowedTools: ["WebSearch", "WebFetch"],
      permissionMode: "default",
    };
  }

  // Refactoring / code editing
  if (/refactor|clean|improve|rename|restructure/.test(lower)) {
    return {
      name: "Refactoring Agent",
      systemPrompt:
        "You are a senior engineer specializing in code quality. Make targeted, " +
        "minimal changes. Prefer editing existing files over creating new ones. " +
        "Always explain the reasoning behind changes.",
      allowedTools: ["Read", "Glob", "Grep", "Edit"],
      permissionMode: "acceptEdits",
    };
  }

  // Bug fixing
  if (/fix|bug|error|crash|broken|failing/.test(lower)) {
    return {
      name: "Bug Fixer",
      systemPrompt:
        "You are an expert debugger. Diagnose the root cause before making any changes. " +
        "Make the minimal fix necessary. Run relevant commands to verify the fix works.",
      allowedTools: ["Read", "Glob", "Grep", "Edit", "Bash"],
      permissionMode: "acceptEdits",
    };
  }

  // File generation / scaffolding
  if (/create|generate|scaffold|build|write|add/.test(lower)) {
    return {
      name: "Code Generator",
      systemPrompt:
        "You are a skilled software engineer. Generate clean, well-structured code. " +
        "Follow existing conventions in the codebase. Add comments where logic is non-obvious.",
      allowedTools: ["Read", "Glob", "Grep", "Write", "Edit", "Bash"],
      permissionMode: "acceptEdits",
    };
  }

  // Shell / automation tasks
  if (/run|execute|install|deploy|setup|configure/.test(lower)) {
    return {
      name: "Automation Agent",
      systemPrompt:
        "You are a DevOps and automation expert. Run commands carefully. " +
        "Verify prerequisites before executing. Report results clearly.",
      allowedTools: ["Read", "Bash", "Write"],
      permissionMode: "default",
    };
  }

  // Default: general-purpose agent
  return {
    name: "General Agent",
    systemPrompt:
      "You are a helpful, expert software engineer. " +
      "Use the tools available to complete the task accurately and efficiently.",
    allowedTools: ["Read", "Glob", "Grep", "Edit", "Write", "Bash"],
    permissionMode: "default",
  };
}

/**
 * Creates and runs an agent for the given requirement.
 * Streams output to stdout and returns the final result.
 */
export async function runAgent(req: AgentRequirement): Promise<string> {
  const profile = buildAgentProfile(req.task);

  console.log(`\n🤖 Agent: ${profile.name}`);
  console.log(`📋 Task: ${req.task}`);
  console.log(`🔧 Tools: ${profile.allowedTools.join(", ")}\n`);
  console.log("─".repeat(60));

  const options: Options = {
    systemPrompt: profile.systemPrompt,
    allowedTools: profile.allowedTools,
    permissionMode: profile.permissionMode,
    maxTurns: req.maxTurns ?? 20,
    ...(req.cwd ? { cwd: req.cwd } : {}),
  };

  let finalResult = "";

  for await (const message of query({ prompt: req.task, options })) {
    const msg = message as SDKResultMessage;
    if (msg.type === "result" && msg.subtype === "success") {
      finalResult = msg.result;
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log("✅ Done\n");
  return finalResult;
}
