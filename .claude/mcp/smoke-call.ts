#!/usr/bin/env bun
/** Разовый вызов инструмента через реальный stdio-процесс. Usage: bun smoke-call.ts <file> <tool> [argsJson] */
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')

const [, , file, tool, argsJson] = process.argv
if (!file || !tool) {
  console.error('Usage: bun smoke-call.ts <file> <tool> [argsJson]')
  process.exit(1)
}

const transport = new StdioClientTransport({
  command: 'bun',
  args: [join(__dirname, `${file}.ts`)],
  cwd: REPO_ROOT,
  stderr: 'inherit',
})
const client = new Client({ name: 'smoke-call', version: '0.0.0' })
await client.connect(transport)
const result = await client.callTool({ name: tool, arguments: argsJson ? JSON.parse(argsJson) : {} })
console.log(JSON.stringify(result, null, 2))
await client.close()
