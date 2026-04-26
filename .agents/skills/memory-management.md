---
name: "Memory Management (Token Saver)"
description: "Rules for hierarchical (L0/L1/L2) memory retrieval using OpenViking or Local Fallback to save context tokens."
---

# Agent Memory Management (Token Saver Protocol)

This repository uses a hierarchical context retrieval system inspired by OpenViking to prevent token explosion. Agents must NOT load large numbers of `docs/` or `.agents/` files into their prompt at once.

## The L0/L1/L2 Loading Protocol

When you need to retrieve historical context, architectural rules, or past bug fixes, you must follow this tiered sequence:

### Step 1: L0 & L1 (Abstracts & Overviews)
- Before reading full files, you must fetch the **L1 Memory Index**.
- The index contains **L0 Abstracts** (1-sentence YAML descriptions) for all memory files.
- *If the `agent-kanban_memory_index` tool is available, use it.*
- *If not, use workspace search tools (`grep_search`) to scan ONLY the YAML frontmatter or `#` headings of files in `docs/decisions/` and `.agents/skills/`.*

### Step 2: L2 (Deep Detail Retrieval)
- Review the L0/L1 abstracts.
- Identify the **1 to 3 specific files** that are actually relevant to your current task.
- ONLY load those specific L2 files using your `view_file` tool.
- DO NOT load unrelated documentation.

## Local Server Only Architecture

This repository strictly enforces a **Local Server Only** memory architecture. We do not sync context to external cloud databases.

1. **Local File System as Database:** All memory extracted during the `Compound` phase must be written exclusively to the local Markdown file system (`docs/` and `.agents/skills/`).
2. **Git for Synchronization:** Memory is synchronized across the team entirely via standard Git commits. Do not attempt to push memory to external APIs or remote vector databases.
3. **Local MCP Indexing:** Rely on the local `agent-kanban_memory_index` tool to fetch the L1 overview instantly and privately.

## Token Saver Monitor (Kanban Extension)
Keep in mind that the user's VS Code Kanban extension is monitoring which L2 files you explicitly load. By strictly following this L0/L1/L2 protocol, the Kanban monitor will correctly report "Tokens Saved," demonstrating efficiency. Do not bypass the L1 abstraction layer.
