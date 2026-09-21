#!/usr/bin/env bun
// Тесты для deploy-release-entry.sh — запускать `bun test scripts/deploy-release-entry.test.mjs`.
//
// Скрипт — forced-command ограниченного SSH-ключа s1→s2 (PLAN-INFRA-6.md §157): единственное, что
// стоит между ключом и исполнением на проде, поэтому его белый список проверяется тестом, а не
// глазами. Настоящий deploy-release.sh делает git pull и трогает docker, так что в каждом тесте
// он подменяется заглушкой, которая лишь печатает свои аргументы.

import { afterEach, describe, expect, test } from 'bun:test'
import { copyFileSync, chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ENTRY_SOURCE = fileURLToPath(new URL('./deploy-release-entry.sh', import.meta.url))

const tempDirs = []

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop(), { recursive: true, force: true })
  }
})

/** Временное дерево `<tmp>/scripts/{deploy-release-entry.sh,deploy-release.sh(заглушка)}`. */
function makeTree() {
  const root = mkdtempSync(join(tmpdir(), 'release-entry-'))
  tempDirs.push(root)
  mkdirSync(join(root, 'scripts'))
  copyFileSync(ENTRY_SOURCE, join(root, 'scripts', 'deploy-release-entry.sh'))
  writeFileSync(join(root, 'scripts', 'deploy-release.sh'), '#!/bin/bash\necho "STUB-CALLED: $*"\n')
  chmodSync(join(root, 'scripts', 'deploy-release.sh'), 0o755)
  return root
}

/** Запускает точку входа так, как это делает sshd: команда клиента — в SSH_ORIGINAL_COMMAND. */
function runEntry(originalCommand) {
  const root = makeTree()
  const env = { ...process.env }
  delete env.SSH_ORIGINAL_COMMAND
  if (originalCommand !== undefined) {
    env.SSH_ORIGINAL_COMMAND = originalCommand
  }
  const result = Bun.spawnSync(['bash', join(root, 'scripts', 'deploy-release-entry.sh')], {
    cwd: root,
    env,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return {
    code: result.exitCode,
    stdout: result.stdout.toString('utf8'),
    stderr: result.stderr.toString('utf8'),
  }
}

describe('допустимые команды', () => {
  test('release <app> <sha> доходит до deploy-release.sh с теми же аргументами', () => {
    const r = runEntry('release letar-landing 1a2b3c4')
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('STUB-CALLED: release letar-landing 1a2b3c4')
  })

  test('dump <app> <sha> доходит до deploy-release.sh', () => {
    const r = runEntry('dump kami abcdef1234567890abcdef1234567890abcdef12')
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('STUB-CALLED: dump kami abcdef1234567890abcdef1234567890abcdef12')
  })
})

describe('отказы (deploy-release.sh не вызывается)', () => {
  const cases = [
    ['интерактивный вход без команды', undefined],
    ['пустая команда', ''],
    ['неизвестная подкоманда', 'shell kami 1a2b3c4'],
    ['только подкоманда', 'release'],
    ['нет sha', 'release kami'],
    ['лишний аргумент', 'release kami 1a2b3c4 --seed'],
    ['имя с заглавными буквами', 'release Kami 1a2b3c4'],
    ['имя с путём наружу', 'release ../etc 1a2b3c4'],
    ['имя со слешем', 'release apps/kami 1a2b3c4'],
    ['имя с ;', 'release kami;id 1a2b3c4'],
    ['sha короче 7', 'release kami 1a2b3c'],
    ['sha длиннее 40', `release kami ${'a'.repeat(41)}`],
    ['sha не hex', 'release kami zzzzzzz'],
    ['sha с заглавными', 'release kami 1A2B3C4'],
    ['подстановка команды в sha', 'release kami $(id)'],
    ['подстановка в имени', 'release $(id) 1a2b3c4'],
    ['перевод строки внутри', 'release kami 1a2b3c4\nid'],
  ]

  for (const [name, command] of cases) {
    test(name, () => {
      const r = runEntry(command)
      expect(r.code).not.toBe(0)
      expect(r.stdout).not.toContain('STUB-CALLED')
    })
  }
})
