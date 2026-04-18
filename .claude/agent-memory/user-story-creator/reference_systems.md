---
name: External System References
description: Pointers to Atlassian MCP endpoint and Jira automation API for this workspace
type: reference
---

**Atlassian MCP endpoint:** https://mcp.atlassian.com/v1/mcp  
Auth: OAuth 2.1 (configured via `/mcp` authentication flow in Claude Code)

**Jira Automation API (SCRUM project):**  
`https://vaibhavkadam.atlassian.net/gateway/api/automation/internal-api/jira/9a8d3bdb-9759-485e-b372-10ddce18918e/pro/rest/GLOBAL/rule?projectKey=SCRUM`  
Use this to check existing automation rules before suggesting workflow automation in stories.
