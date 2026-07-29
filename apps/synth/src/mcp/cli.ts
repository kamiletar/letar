#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSynthMcpServer } from './server.js'

// Резолвим patches/ от расположения файла, а не process.cwd() — MCP-клиент может
// запускать процесс из корня монорепо, а не из apps/synth (см. .mcp.json)
const __dirname = dirname(fileURLToPath(import.meta.url))
const patchesDir = join(__dirname, '..', '..', 'patches')

const baseUrl = process.env.SYNTH_MENTOR_URL ?? 'http://localhost:3022'
const token = process.env.SYNTH_MENTOR_TOKEN

// Без top-level await: apps/synth не объявляет "type": "module" в package.json
// (это Next.js-приложение, менять module-режим ради MCP-скрипта рискованно) —
// esbuild/tsx транспилирует файл в CJS, где top-level await недоступен.
async function main() {
  const server = createSynthMcpServer({
    baseUrl,
    token,
    patchesDir,
    name: '@letar/synth-mcp',
    version: '1.0.0',
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

void main()
