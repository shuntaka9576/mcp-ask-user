#!/usr/bin/env node
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { z } from "zod";

const useStdio = process.argv.includes("--stdio");

const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "..", "dist")
  : import.meta.dirname;

const RESOURCE_URI = "ui://ask-user/mcp-app.html";

const server = new McpServer({
  name: "Ask User MCP Server",
  version: "1.0.0",
});

const OptionSchema = z.object({
  label: z.string().describe("The display text for this option"),
  description: z.string().optional().describe("Explanation of what this option means"),
});

const QuestionSchema = z.object({
  question: z.string().describe("The complete question to ask the user"),
  header: z.string().max(12).describe("Short label displayed as a chip/tag (max 12 chars)"),
  options: z.array(OptionSchema).min(2).max(4).describe("Available choices (2-4 options)"),
  multiSelect: z.boolean().default(false).describe("Allow multiple selections if true"),
});

registerAppTool(
  server,
  "ask-user",
  {
    title: "Ask User",
    description:
      "Opens an interactive form UI to ask the user questions with selectable options. Use this when you need user input, preferences, or decisions. Returns the user's selected answers.",
    inputSchema: {
      questions: z
        .array(QuestionSchema)
        .min(1)
        .max(4)
        .describe("List of questions to ask (1-4 questions)"),
    },
    _meta: { ui: { resourceUri: RESOURCE_URI } },
  },
  async ({ questions }): Promise<CallToolResult> => ({
    content: [
      {
        type: "text",
        text: `Asking user ${questions.length} question(s). Waiting for response...`,
      },
    ],
    structuredContent: { questions },
  }),
);

registerAppResource(
  server,
  RESOURCE_URI,
  RESOURCE_URI,
  { mimeType: RESOURCE_MIME_TYPE },
  async (): Promise<ReadResourceResult> => {
    const html = await fs.readFile(path.join(DIST_DIR, "mcp-app.html"), "utf-8");
    return {
      contents: [{ uri: RESOURCE_URI, mimeType: RESOURCE_MIME_TYPE, text: html }],
    };
  },
);

if (useStdio) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
} else {
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, mcp-session-id, Last-Event-ID, mcp-protocol-version",
    );
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id, mcp-protocol-version");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url !== "/mcp") {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (req.method === "DELETE") {
      if (sessionId && transports.has(sessionId)) {
        const transport = transports.get(sessionId)!;
        await transport.close();
        transports.delete(sessionId);
      }
      res.writeHead(204);
      res.end();
      return;
    }

    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports.has(sessionId)) {
      transport = transports.get(sessionId)!;
    } else if (req.method === "POST" && !sessionId) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (newSessionId) => {
          transports.set(newSessionId, transport);
        },
      });

      transport.onclose = () => {
        const sid = [...transports.entries()].find(([_, t]) => t === transport)?.[0];
        if (sid) transports.delete(sid);
      };

      await server.connect(transport);
    } else {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Invalid session" }));
      return;
    }

    await transport.handleRequest(req, res);
  });

  const PORT = 54217;
  httpServer.listen(PORT, () => {
    console.log(`MCP Server listening on http://localhost:${PORT}/mcp`);
  });
}
