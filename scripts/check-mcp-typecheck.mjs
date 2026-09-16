#!/usr/bin/env bun
// typecheck для root-level MCP-агрегаторов .claude/mcp/*.ts (letar.ts, letar-db.ts, smoke*.ts).
//
// Зачем отдельный скрипт: у этих файлов нет project.json — они вне графа Nx, поэтому
// `nx run-many -t typecheck:tsgo` их не видит и никогда не видел. letar.ts — реально
// используемый агрегатор MCP-сервера `letar` (низкоуровневый Server с ручными
// setRequestHandler по 'tools/call' и т.п.), letar-db.ts — сервер `letar-db`. Оба
// подключены в .mcp.json и вызываются в каждой сессии, но правки в них расходились с
// типами @modelcontextprotocol/server незамеченными — обнаружено при миграции SDK
// v1→v2 (PLAN-INFRA-6.md §184): letar.ts возвращал Promise<unknown> из хендлеров вместо
// строго типизированного CallToolResult/ReadResourceResult/GetPromptResult и т.п.,
// letar-db.ts падал TS2769 на registerTool('dbs', ...). Функционально всё работало
// (bun выполняет .ts без проверки типов), но без typecheck — без сети безопасности.
//
// tsconfig — .claude/mcp/tsconfig.json, extends корневой tsconfig.base.json, rootDir
// поднят до корня репо (иначе TS6059 на импортах из libs/*, см. комментарий в файле).
//
// Использование: bun scripts/check-mcp-typecheck.mjs (тоже самое, что руками —
// tsgo --noEmit -p .claude/mcp/tsconfig.json из корня репозитория).

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const tsgoBin = join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tsgo.exe' : 'tsgo')

const result = Bun.spawnSync([tsgoBin, '--noEmit', '-p', '.claude/mcp/tsconfig.json'], {
  cwd: repoRoot,
  stdout: 'inherit',
  stderr: 'inherit',
})

if (result.exitCode !== 0) {
  console.error('\n❌ typecheck .claude/mcp/*.ts упал — правки разошлись с типами SDK, см. вывод выше')
  process.exit(1)
}

console.log('✅ .claude/mcp/*.ts: типы сходятся с @modelcontextprotocol/server')
