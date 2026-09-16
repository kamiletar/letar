#!/usr/bin/env bun
/**
 * Смоук-проверка letar / letar-db без Claude Code: поднимает сервер как реальный дочерний
 * stdio-процесс (bun .claude/mcp/<file>.ts) и печатает listTools/listResources/listPrompts.
 * Запуск: bun .claude/mcp/smoke.ts [letar|letar-db]
 */
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')

async function smoke(file: string) {
  console.log(`\n=== ${file} ===`)
  const transport = new StdioClientTransport({
    command: 'bun',
    args: [join(__dirname, `${file}.ts`)],
    cwd: REPO_ROOT,
    stderr: 'inherit',
  })
  const client = new Client({ name: 'smoke', version: '0.0.0' })
  const start = Date.now()
  await client.connect(transport)
  console.log(`подключился за ${Date.now() - start}мс`)

  try {
    const { tools } = await client.listTools()
    console.log(`инструментов: ${tools.length}`)
    console.log(tools.map((t) => t.name).sort().join(', '))
  } catch (err) {
    console.log('listTools упал:', err)
  }

  try {
    const { resources } = await client.listResources()
    console.log(`ресурсов: ${resources.length}`)
  } catch {
    console.log('resources: не поддерживается')
  }

  try {
    const { prompts } = await client.listPrompts()
    console.log(`промптов: ${prompts.length}`)
  } catch {
    console.log('prompts: не поддерживается')
  }

  await client.close()
}

const target = process.argv[2]
if (!target) {
  console.error('Usage: bun smoke.ts <letar|letar-db>')
  process.exit(1)
}
await smoke(target)
