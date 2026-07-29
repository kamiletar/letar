#!/usr/bin/env node
/**
 * Точка входа MCP-сервера studio-time-mcp.
 * Запускается через stdio (Claude Code → MCP), из корня репозитория:
 *   bunx tsx libs/studio-time-mcp/src/cli.ts
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { createStudioTimeMcpServer } from './server.js'

const server = createStudioTimeMcpServer()
const transport = new StdioServerTransport()
await server.connect(transport)
