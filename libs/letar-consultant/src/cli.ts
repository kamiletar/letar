#!/usr/bin/env node
/**
 * Точка входа MCP-сервера letar-consultant.
 * Запускается через stdio (Claude Code → MCP).
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { createLetarConsultantServer } from './server.js'

const server = createLetarConsultantServer({
  model: process.env['LETAR_CONSULTANT_MODEL'] ?? 'gemma-4',
  // llama.cpp server слушает на 8080; Ollama fallback — 11434
  ollamaUrl: process.env['OLLAMA_URL'] ?? 'http://localhost:8080',
  qdrantUrl: process.env['QDRANT_URL'] ?? 'http://localhost:6333',
})

const transport = new StdioServerTransport()
await server.connect(transport)
