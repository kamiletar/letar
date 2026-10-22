#!/usr/bin/env bun
// Тесты для check-stale-worktrees.mjs — запускать `bun test scripts/check-stale-worktrees.test.mjs`.
//
// Скрипт определяет корень репозитория по собственному расположению, поэтому тест копирует его
// в `scripts/` временного git-репозитория и запускает там. Регрессия 2026-10-01: ветка, выписанная
// в другом worktree, даёт в `git branch` маркер `+ `, и разбор падал на `fatal: ambiguous argument`.

import { afterEach, describe, expect, test } from 'bun:test'
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
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

/** Брошенный worktree в .claude/worktrees/: HEAD старше порога. `extra` дополняет каталог до `git add`. */
function makeStaleWorktree(repo, name, extra = () => {}) {
  const old = '2020-01-01T00:00:00Z'
  const env = { ...process.env, GIT_AUTHOR_DATE: old, GIT_COMMITTER_DATE: old }
  const wt = join(repo, '.claude', 'worktrees', name)
  git(repo, ['branch', `old-${name}`])
  git(repo, ['worktree', 'add', wt, `old-${name}`])
  extra(wt)
  git(wt, ['add', '-A'])
  Bun.spawnSync(['git', 'commit', '--allow-empty', '-m', 'old'], { cwd: wt, env, stdout: 'pipe', stderr: 'pipe' })
  git(repo, ['update-ref', 'refs/remotes/origin/main', `old-${name}`])
  return wt
}

describe('check-stale-worktrees: совет по уборке', () => {
  test('без junction и submodule — простой порядок, без rmdir и проверки submodule', () => {
    const { repo } = makeRepo()
    makeStaleWorktree(repo, 'plain')
    const { out } = runScript(repo)
    expect(out).toContain('git worktree remove --force')
    expect(out).toContain('git branch -d old-plain')
    expect(out).toContain('git worktree prune')
    expect(out).toContain('worktree-removal-junction-submodule.md')
    expect(out).not.toContain('cmd /c rmdir')
    expect(out).not.toContain('--not --remotes')
  })

  test('с junction node_modules — сначала rmdir ссылки, потом остальное', () => {
    const { root, repo } = makeRepo()
    const target = join(root, 'real-node-modules')
    mkdirSync(target)
    makeStaleWorktree(repo, 'junc')
    symlinkSync(target, join(repo, '.claude', 'worktrees', 'junc', 'node_modules'), 'junction')
    const { out } = runScript(repo)
    expect(out).toContain('cmd /c rmdir')
    expect(out).toContain('node_modules')
    expect(out.indexOf('git worktree prune')).toBeLessThan(out.indexOf('cmd /c rmdir'))
    expect(out.indexOf('cmd /c rmdir')).toBeLessThan(out.indexOf('Remove-Item'))
  })

  test('с submodule — первым шагом проверка неотправленных коммитов', () => {
    const { repo } = makeRepo()
    makeStaleWorktree(repo, 'sub', (wt) => {
      writeFileSync(join(wt, '.gitmodules'), '[submodule "apps/foo"]\n\tpath = apps/foo\n\turl = ../foo.git\n')
    })
    const { out } = runScript(repo)
    expect(out).toContain('--not --remotes')
    expect(out).toContain('apps/foo')
    expect(out.indexOf('--not --remotes')).toBeLessThan(out.indexOf('git worktree remove --force'))
  })
})

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
