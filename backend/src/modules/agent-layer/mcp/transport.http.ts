import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { validateApiKey } from '@/modules/api-keys/apikeys.service.js'
import { UnauthorizedError } from '@/shared/errors.js'
import { createDysonMcpServer }  from './server.js'
import { createDirectHandlers } from './handlers.direct.js'

/**
 * Mount the Dyson MCP server on Fastify at /mcp via the Streamable HTTP transport.
 *
 * Auth: Bearer dys_… API key (same as /api/v1/agent/*). One McpServer instance
 * per connection — created lazily after auth so the handlers close over the
 * tenant resolved from the API key, never trusting a tenantId from the wire.
 *
 * Endpoint:
 *   POST /mcp        — initialize + JSON-RPC requests
 *   GET  /mcp        — server-initiated SSE stream (notifications)
 *   DELETE /mcp      — terminate session
 *
 * For now we run "stateless" — each POST creates a fresh transport+server.
 * Cleaner than session management for a workload where every call is
 * idempotent and tenant-scoped. Switch to session mode if/when we add
 * server→client notifications that need to span multiple POSTs.
 */
export default async function mcpRoutes(app: FastifyInstance) {

  async function authenticateApiKey(request: FastifyRequest): Promise<{ tenantId: string; scopes: string[] }> {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError()
    const rawKey = authHeader.slice(7)
    if (!rawKey.startsWith('dys_')) throw new UnauthorizedError()
    const ctx = await validateApiKey(rawKey)
    if (!ctx) throw new UnauthorizedError()
    return ctx
  }

  // ── POST /mcp — JSON-RPC requests ──────────────────────────────────────
  app.post('/', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    schema: {
      tags: ['Agent · MCP'],
      summary: 'MCP — Streamable HTTP endpoint (JSON-RPC requests)',
      description: 'Model Context Protocol over Streamable HTTP. Auth: Bearer dys_… API key.',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = await authenticateApiKey(request)

    const handlers  = createDirectHandlers(tenantId, request.log)
    const mcpServer = createDysonMcpServer(handlers)

    // Stateless mode — sessionIdGenerator omitted entirely (TS exactOptionalPropertyTypes)
    // Cast: SDK accepts undefined at runtime to mean "no session id"
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined as unknown as () => string,
      enableJsonResponse: true,
    })

    reply.raw.on('close', () => {
      void transport.close()
      void mcpServer.close()
    })

    await mcpServer.connect(transport as unknown as Parameters<typeof mcpServer.connect>[0])
    await transport.handleRequest(request.raw, reply.raw, request.body)
  })

  // ── GET /mcp — SSE notifications (rarely used in stateless mode) ───────
  app.get('/', {
    schema: {
      tags: ['Agent · MCP'],
      summary: 'MCP — Streamable HTTP SSE channel',
    },
  }, async (request, reply) => {
    await authenticateApiKey(request)
    // Stateless server has no notifications to push — return 405 per MCP spec
    return reply.status(405).send({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Stateless MCP server does not support server-initiated streams' },
    })
  })

  // ── DELETE /mcp — explicit teardown (no-op in stateless mode) ──────────
  app.delete('/', {
    schema: {
      tags: ['Agent · MCP'],
      summary: 'MCP — terminate session',
    },
  }, async (_request, reply) => {
    return reply.status(204).send()
  })
}
