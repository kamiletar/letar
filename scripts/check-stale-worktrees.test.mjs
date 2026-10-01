#!/usr/bin/env bun
// Тесты для check-stale-worktrees.mjs — запускать `bun test scripts/check-stale-worktrees.test.mjs`.
//
// Скрипт определяет корень репозитория по собственному расположению, поэтому тест копирует его
// в `scripts/` временного git-репозитория и запускает там. Регрессия 2026-10-01: ветка, выписанная
// в другом worktree, даёт в `git branch` маркер `+ `, и разбор падал на `fatal: ambiguous argument`.

import { afterEach, describe, expect, test } from 'bun:test'
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_SRC = fileURLToPath(new URL('./check-stale-worktrees.mjs', import.meta.url))

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

function makeRepo() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'stale-wt-')))
  tempDirs.push(root)
  const repo = join(root, 'repo')
  mkdirSync(join(repo, 'scripts'), { recursive: true })
  git(repo, ['init', '-b', 'main'])
  git(repo, ['config', 'user.email', 't@example.com'])
  git(repo, ['config', 'user.name', 't'])
  copyFileSync(SCRIPT_SRC, join(repo, 'scripts', 'check-stale-worktrees.mjs'))
  git(repo, ['add', '.'])
  git(repo, ['commit', '-m', 'init'])
  git(repo, ['update-ref', 'refs/remotes/origin/main', 'HEAD'])
  return { root, repo }
}

function runScript(repo) {
  const r = Bun.spawnSync(['bun', join(repo, 'scripts', 'check-stale-worktrees.mjs')], {
    cwd: repo,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return { out: r.stdout.toString('utf8'), err: r.stderr.toString('utf8'), code: r.exitCode }
}

describe('check-stale-worktrees: разбор имён веток', () => {
  test('ветка, выписанная в другом worktree (маркер `+`), не даёт fatal и не считается сиротой', () => {
    const { root, repo } = makeRepo()
    git(repo, ['branch', 'worktree-agent-linked'])
    git(repo, ['worktree', 'add', join(root, 'other-wt'), 'worktree-agent-linked'])
    // подтверждаем, что исходная причина воспроизводится: `git branch` ставит `+ `
    expect(git(repo, ['branch', '--list', 'worktree-agent-*'])).toContain('+ worktree-agent-linked')

    const { out, err } = runScript(repo)
    expect(err).not.toContain('fatal')
    expect(out).not.toContain('fatal')
    expect(out).not.toContain('worktree-agent-linked')
  })

  test('текущая ветка (маркер `*`) не даёт fatal', () => {
    const { repo } = makeRepo()
    git(repo, ['checkout', '-b', 'worktree-agent-current'])
    const { out, err } = runScript(repo)
    expect(err).not.toContain('fatal')
    expect(out).not.toContain('fatal')
  })

  test('настоящая ветка-сирота попадает в отчёт под чистым именем', () => {
    const { repo } = makeRepo()
    git(repo, ['branch', 'worktree-agent-orphan'])
    const { out, err } = runScript(repo)
    expect(err).not.toContain('fatal')
    expect(out).toContain('worktree-agent-orphan')
    expect(out).not.toContain('+ worktree-agent-orphan')
  })
})
