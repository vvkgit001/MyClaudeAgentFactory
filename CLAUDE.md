# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build      # Compile TypeScript to dist/
npm run start      # Run compiled output (node dist/index.js)
npm run dev        # Run TypeScript directly via tsx (development)
npm run dev "task" # Run with a task description, e.g. npm run dev "review src/index.ts"
```

No test or lint scripts are configured.

## Architecture

This project is an **AI Agent Factory** — a CLI and library that dynamically creates and executes Claude agents based on task descriptions. It uses the `@anthropic-ai/claude-agent-sdk` package.

### Core flow (`src/agentFactory.ts`)

1. **`buildAgentProfile(task)`** — pattern-matches keywords in the task string to select one of 7 agent profiles. Each profile defines a system prompt, allowed tools, and permission mode.
2. **`runAgent(req: AgentRequirement)`** — executes the selected agent via the SDK's `query()` function, streaming output to stdout.

### Agent profiles (auto-selected by keyword)

| Profile | Detection keywords | Permission mode |
|---|---|---|
| Code Analyst | review, analyze, audit, inspect, check | default |
| Research Agent | research, search, find, look up, browse, web | default |
| Refactoring Agent | refactor, clean, improve, rename, restructure | acceptEdits |
| Bug Fixer | fix, bug, error, crash, broken, failing | acceptEdits |
| Code Generator | create, generate, scaffold, build, write, add | acceptEdits |
| Automation Agent | run, execute, install, deploy, setup, configure | default |
| General Agent | (fallback) | default |

### Entry point (`src/index.ts`)

CLI wrapper — reads task from `process.argv[2]`, falls back to a default code review task, calls `runAgent()`.

### Custom agent definition

`.claude/agents/user-story-creator.md` defines a specialized agent for converting Jira EPICs into developer-ready User Stories. It integrates with Atlassian MCP, Figma MCP, and Confluence MCP. This agent is invoked from within the Claude Code UI via the custom agents system, not through the factory code.

### TypeScript config

- Module system: NodeNext (ESM) — all local imports must use `.js` extensions
- Output: `dist/` from `src/`
- Strict mode enabled
