#!/usr/bin/env bun
// Тесты для check-schema-migration.mjs — запускать `bun test scripts/check-schema-migration.test.mjs`.
//
// Скрипт читает staged git diff через Bun.spawnSync, поэтому вместо мокания git каждый тест
// поднимает изолированный временный git-репозиторий (тот же приём, которым фикс §154
// (PLAN-INFRA-6.md, коммит c15677d2) был проверен вручную) и запускает проверяемый скрипт
// как отдельный процесс с cwd внутри этого репозитория.

import { afterEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_PATH = fileURLToPath(new URL('./check-schema-migration.mjs', import.meta.url))

const tempDirs = []

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop(), { recursive: true, force: true })
  }
})

function git(cwd, args) {
  const result = Bun.spawnSync(['git', ...args], { cwd, stdout: 'pipe', stderr: 'pipe' })
  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(' ')} failed:\n${result.stderr.toString('utf8')}`)
  }
  return result.stdout.toString('utf8')
}

function initRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'schema-migration-test-'))
  tempDirs.push(dir)
  git(dir, ['init', '-q'])
  git(dir, ['config', 'user.email', 'test@example.invalid'])
  git(dir, ['config', 'user.name', 'Test'])
  return dir
}

function writeRepoFile(dir, relPath, content) {
  const full = join(dir, relPath)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content)
}

function commitAll(dir, message) {
  git(dir, ['add', '-A'])
  git(dir, ['commit', '-q', '-m', message])
}

function stageAll(dir) {
  git(dir, ['add', '-A'])
}

function runChecker(dir) {
  const result = Bun.spawnSync(['bun', SCRIPT_PATH], { cwd: dir, stdout: 'pipe', stderr: 'pipe' })
  return { exitCode: result.exitCode, stderr: result.stderr.toString('utf8') }
}

const ROOT_SCHEMA = `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
`

describe('check-schema-migration.mjs', () => {
  test('структурное изменение во фрагменте multi-file схемы без миграции — блокирует', () => {
    const dir = initRepo()
    writeRepoFile(dir, 'schema.zmodel', `${ROOT_SCHEMA}import "./schema/fragment.zmodel"\n`)
    writeRepoFile(
      dir,
      'schema/fragment.zmodel',
      `model House {\n  id   String @id @default(cuid())\n  name String\n}\n`,
    )
    commitAll(dir, 'init')

    writeRepoFile(
      dir,
      'schema/fragment.zmodel',
      `model House {\n  id      String @id @default(cuid())\n  name    String\n  address String\n}\n`,
    )
    stageAll(dir)

    const { exitCode, stderr } = runChecker(dir)
    expect(exitCode).toBe(1)
    expect(stderr).toContain('schema/fragment.zmodel')
    expect(stderr).toContain('+ address String')
  })

  test('тот же случай, но с добавленной папкой миграции — пропускает', () => {
    const dir = initRepo()
    writeRepoFile(dir, 'schema.zmodel', `${ROOT_SCHEMA}import "./schema/fragment.zmodel"\n`)
    writeRepoFile(
      dir,
      'schema/fragment.zmodel',
      `model House {\n  id   String @id @default(cuid())\n  name String\n}\n`,
    )
    commitAll(dir, 'init')

    writeRepoFile(
      dir,
      'schema/fragment.zmodel',
      `model House {\n  id      String @id @default(cuid())\n  name    String\n  address String\n}\n`,
    )
    writeRepoFile(
      dir,
      'prisma/migrations/20260101000000_add_address/migration.sql',
      'ALTER TABLE "House" ADD COLUMN "address" TEXT NOT NULL;\n',
    )
    stageAll(dir)

    const { exitCode } = runChecker(dir)
    expect(exitCode).toBe(0)
  })

  test('атрибутивная правка существующего поля (тот же name+type) — пропускает', () => {
    const dir = initRepo()
    writeRepoFile(dir, 'schema.zmodel', `${ROOT_SCHEMA}import "./schema/fragment.zmodel"\n`)
    writeRepoFile(
      dir,
      'schema/fragment.zmodel',
      `model House {\n  id      String @id @default(cuid())\n  name    String\n  address String\n}\n`,
    )
    commitAll(dir, 'init')

    writeRepoFile(
      dir,
      'schema/fragment.zmodel',
      `model House {\n  id      String @id @default(cuid())\n  name    String\n  address String @default("")\n}\n`,
    )
    stageAll(dir)

    const { exitCode } = runChecker(dir)
    expect(exitCode).toBe(0)
  })

  test('регрессия: обычная одиночная schema.zmodel без декомпозиции работает как раньше', () => {
    const dir = initRepo()
    writeRepoFile(
      dir,
      'schema.zmodel',
      `${ROOT_SCHEMA}\nmodel House {\n  id   String @id @default(cuid())\n  name String\n}\n`,
    )
    commitAll(dir, 'init')

    writeRepoFile(
      dir,
      'schema.zmodel',
      `${ROOT_SCHEMA}\nmodel House {\n  id      String @id @default(cuid())\n  name    String\n  address String\n}\n`,
    )
    stageAll(dir)

    const blocked = runChecker(dir)
    expect(blocked.exitCode).toBe(1)
    expect(blocked.stderr).toContain('schema.zmodel')

    writeRepoFile(
      dir,
      'prisma/migrations/20260101000000_add_address/migration.sql',
      'ALTER TABLE "House" ADD COLUMN "address" TEXT NOT NULL;\n',
    )
    stageAll(dir)

    const passed = runChecker(dir)
    expect(passed.exitCode).toBe(0)
  })

  test('findSchemaRootDir резолвит корень для фрагмента на глубокой вложенности', () => {
    const dir = initRepo()
    writeRepoFile(dir, 'apps/testapp/schema.zmodel', `${ROOT_SCHEMA}import "./schema/nested/deep/frag.zmodel"\n`)
    writeRepoFile(
      dir,
      'apps/testapp/schema/nested/deep/frag.zmodel',
      `model House {\n  id   String @id @default(cuid())\n  name String\n}\n`,
    )
    commitAll(dir, 'init')

    writeRepoFile(
      dir,
      'apps/testapp/schema/nested/deep/frag.zmodel',
      `model House {\n  id      String @id @default(cuid())\n  name    String\n  address String\n}\n`,
    )
    stageAll(dir)

    const blocked = runChecker(dir)
    expect(blocked.exitCode).toBe(1)
    expect(blocked.stderr).toContain('apps/testapp/prisma/migrations')

    writeRepoFile(
      dir,
      'apps/testapp/prisma/migrations/20260101000000_add_address/migration.sql',
      'ALTER TABLE "House" ADD COLUMN "address" TEXT NOT NULL;\n',
    )
    stageAll(dir)

    const passed = runChecker(dir)
    expect(passed.exitCode).toBe(0)
  })
})
