#!/usr/bin/env node
/**
 * Точка входа MCP-сервера deploy-mcp.
 * Запускается через stdio (Claude Code → MCP), из корня репозитория:
 *   bunx tsx libs/deploy-mcp/src/cli.ts
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { createDeployMcpServer } from './server.js'

const server = createDeployMcpServer()
const transport = new StdioServerTransport()
await server.connect(transport)
