#!/usr/bin/env bun

/**
 * Синхронизирует навыки Claude Code с общим каталогом `.agents/skills/`.
 * Редактировать нужно только `.agents/skills/`; `.claude/skills/` — производная копия.
 * `--check` сравнивает файлы без изменений, обычный запуск пересобирает копию.
 */

import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const source = join(root, '.agents', 'skills')
const target = join(root, '.claude', 'skills')
const check = process.argv.includes('--check')

async function files(dir: string, base = dir): Promise<string[]> {
  if (!existsSync(dir)) { return [] }
  const result: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) { result.push(...await files(path, base)) }
    else if (entry.isFile()) { result.push(relative(base, path)) }
  }
  return result
}

if (!existsSync(source)) {
  console.error('Нет исходного каталога .agents/skills/')
  process.exit(1)
}

const sourceFiles = await files(source)
const sourceSet = new Set(sourceFiles)
const targetFiles = await files(target)
const stale = targetFiles.filter((file) => !sourceSet.has(file))
const changed: string[] = []

for (const file of sourceFiles) {
  const from = join(source, file)
  const to = join(target, file)
  const content = await readFile(from)
  const old = existsSync(to) ? await readFile(to) : null
  if (old?.equals(content)) { continue }
  changed.push(file)
  if (check) { continue }
  await mkdir(dirname(to), { recursive: true })
  await writeFile(to, content)
}

if (!check) {
  for (const file of stale) { await rm(join(target, file)) }
}

if (changed.length || stale.length) {
  console.log(`Навыки изменены: ${changed.length}; устаревшие в Claude: ${stale.length}`)
  if (check) {
    for (const file of changed) { console.log(`  отсутствует или отличается: ${file}`) }
    for (const file of stale) { console.log(`  лишний: ${file}`) }
    process.exit(1)
  }
}

console.log(`Навыки синхронизированы: ${sourceFiles.length} файлов`)
