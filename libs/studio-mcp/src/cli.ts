#!/usr/bin/env node
/**
 * Точка входа MCP-сервера studio-mcp.
 * Запускается через stdio (Claude Code → MCP), из корня репозитория:
 *   bunx tsx libs/studio-mcp/src/cli.ts
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { createStudioAdminMcpServer } from './server.js'

const server = createStudioAdminMcpServer()
const transport = new StdioServerTransport()
await server.connect(transport)
