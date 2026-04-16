/**
 * Examples showing how to use runAgent programmatically.
 * Run with: npx tsx src/examples.ts
 */
import { runAgent } from "./agentFactory.js";

async function main() {
  // 1. Code review agent — automatically picks read-only tools
  await runAgent({
    task: "Review the TypeScript files in this project and identify any type safety issues",
    cwd: process.cwd(),
    maxTurns: 15,
  });

  // 2. Research agent — automatically picks WebSearch + WebFetch
  await runAgent({
    task: "Research the best practices for error handling in Node.js 2025",
  });

  // 3. Bug fix agent — picks Edit + Bash tools
  await runAgent({
    task: "Fix the TypeScript compilation errors in src/index.ts",
    cwd: process.cwd(),
  });

  // 4. Code generation agent — picks Write + Edit tools
  await runAgent({
    task: "Create a TypeScript utility that retries async functions with exponential backoff",
    cwd: process.cwd(),
  });
}

main().catch(console.error);
