#!/usr/bin/env node
/**
 * Точка входа MCP-сервера glitchtip-mcp.
 * Запускается через stdio (Claude Code → MCP), из корня репозитория:
 *   bunx tsx libs/glitchtip-mcp/src/cli.ts
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { createGlitchtipMcpServer } from './server.js'

const server = createGlitchtipMcpServer()
const transport = new StdioServerTransport()
await server.connect(transport)
