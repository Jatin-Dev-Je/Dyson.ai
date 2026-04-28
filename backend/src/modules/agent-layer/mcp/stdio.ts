#!/usr/bin/env node
/**
 * Dyson MCP — stdio entry. Install into Claude Desktop, Cursor, Continue, or
 * any MCP-compatible client.
 *
 * Required env vars:
 *   DYSON_API_URL   — e.g. https://api.dyson.ai
 *   DYSON_API_KEY   — dys_… (create at app.dyson.ai/settings/api-keys)
 *
 * Example Claude Desktop config (claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "dyson": {
 *         "command": "npx",
 *         "args": ["-y", "@dyson-ai/mcp"],
 *         "env": {
 *           "DYSON_API_URL": "https://api.dyson.ai",
 *           "DYSON_API_KEY": "dys_xxxxxxxx"
 *         }
 *       }
 *     }
 *   }
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createDysonMcpServer } from './server.js'
import { createProxyHandlers }  from './handlers.proxy.js'

async function main() {
  const apiUrl = process.env.DYSON_API_URL
  const apiKey = process.env.DYSON_API_KEY

  if (!apiUrl || !apiKey) {
    process.stderr.write(
      'dyson-mcp: missing required env vars\n' +
      '  DYSON_API_URL  — e.g. https://api.dyson.ai\n' +
      '  DYSON_API_KEY  — dys_… (create at https://app.dyson.ai/settings/api-keys)\n'
    )
    process.exit(1)
  }

  const handlers  = createProxyHandlers({ apiUrl, apiKey })
  const server    = createDysonMcpServer(handlers)
  const transport = new StdioServerTransport()

  // Quiet logs — anything on stdout corrupts JSON-RPC; use stderr if needed
  await server.connect(transport)

  // Keep the process alive until stdin closes
  process.stdin.on('close', () => {
    void server.close()
    process.exit(0)
  })
}

main().catch((err: unknown) => {
  process.stderr.write(`dyson-mcp: fatal — ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
