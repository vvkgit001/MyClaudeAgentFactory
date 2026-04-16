import { runAgent } from "./agentFactory.js";

// ── Example usage ─────────────────────────────────────────────────────────────
// Run this file directly:
//   npm run dev
//
// Or import runAgent in your own code:
//   import { runAgent } from "./agentFactory.js";

const examples: Array<{ task: string; cwd?: string }> = [
  {
    task: "Review the code in this project and identify any potential issues or improvements",
    cwd: process.cwd(),
  },
  // Uncomment to try other agent types:
  // { task: "Research the latest TypeScript 5.x features and summarize the key changes" },
  // { task: "Fix the failing tests in this project", cwd: process.cwd() },
  // { task: "Create a utility function that debounces async functions", cwd: process.cwd() },
];

async function main() {
  // Pick the task from a CLI arg or use the first example
  const taskArg = process.argv.slice(2).join(" ").trim();

  if (taskArg) {
    const result = await runAgent({ task: taskArg, cwd: process.cwd() });
    console.log(result);
  } else {
    // Run the first example by default
    const result = await runAgent(examples[0]);
    console.log(result);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
