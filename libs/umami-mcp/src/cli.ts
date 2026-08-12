#!/usr/bin/env node
/**
 * Точка входа MCP-сервера umami-mcp.
 * Запускается через stdio (Claude Code → MCP), из корня репозитория:
 *   bunx tsx libs/umami-mcp/src/cli.ts
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { createUmamiMcpServer } from './server.js'

const server = createUmamiMcpServer()
const transport = new StdioServerTransport()
await server.connect(transport)
