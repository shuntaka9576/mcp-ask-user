# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies
bun install

# Run all checks
bun run lint              # OxLint
bun run fmt               # OxFmt check
bun run type-check        # TypeScript (via Turbo)
bun run spell-check       # CSpell

# Fix issues
bun run lint:fix          # Auto-fix lint issues
bun run fmt:fix           # Auto-format files
```

## Architecture

This is a Bun monorepo using Turbo for task orchestration.

### Key Patterns

- All packages use ESM (`"type": "module"`)
- Zod for runtime validation (config schemas, MCP tool inputs)
- Pre-commit hooks via Lefthook (lint, format, spell-check)
