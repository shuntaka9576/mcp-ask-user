# mcp-ask-user

An MCP App that allows LLMs to ask users questions.

## Installation

```bash
npm install -g mcp-ask-user
```

## Configuration

Add to `claude_desktop_config.json`.

**stdio**

```json
{
  "mcpServers": {
    "ask-user": {
      "command": "mcp-ask-user",
      "args": ["--stdio"]
    }
  }
}
```

**HTTP** (requires `mcp-ask-user` running on localhost)

```json
{
  "mcpServers": {
    "ask-user": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:54217/mcp"]
    }
  }
}
```

## Troubleshooting

If the command is not found, specify the full path or set PATH in `env`.

```json
{
  "mcpServers": {
    "ask-user": {
      "command": "/Users/username/.local/share/pnpm/mcp-ask-user",
      "args": ["--stdio"],
      "env": {
        "PATH": "/Users/username/.local/share/mise/installs/node/24.13.0/bin:/usr/bin:/bin"
      }
    }
  }
}
```
