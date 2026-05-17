#!/usr/bin/env node
/**
 * Точка входа MCP-сервера letar-consultant.
 * Запускается через stdio (Claude Code → MCP).
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { createLetarConsultantServer } from './server.js'

const server = createLetarConsultantServer({
  model: process.env['LETAR_CONSULTANT_MODEL'] ?? 'qwen2.5-coder:14b',
  ollamaUrl: process.env['OLLAMA_URL'] ?? 'http://localhost:11434',
  qdrantUrl: process.env['QDRANT_URL'] ?? 'http://localhost:6333',
})

const transport = new StdioServerTransport()
await server.connect(transport)
