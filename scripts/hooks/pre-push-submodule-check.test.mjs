#!/usr/bin/env bun
// Тесты pre-push-submodule-check.sh — запускать `bun test scripts/hooks/pre-push-submodule-check.test.mjs`.
//
// Сценарий инцидента 2026-10-01: конечные gitlink-и пушимого диапазона на origin submodule, а
// ПРОМЕЖУТОЧНЫЙ коммит letar ссылается на SHA, живущий только в локальной ветке. Сервер достаёт
// все SHA из новых коммитов и падает `not our ref`. Хук обязан ловить такой диапазон.
//
// Проверка «красного» прогона на старой версии: PUSH_CHECK_SRC=<каталог со старыми
// pre-push-submodule-check.sh и check-submodule-push-state.sh>.

import { afterEach, describe, expect, test } from 'bun:test'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = process.env.PUSH_CHECK_SRC ?? null
const HOOK_SRC = SRC ? join(SRC, 'pre-push-submodule-check.sh') : join(HERE, 'pre-push-submodule-check.sh')
const CHECKER_SRC = SRC
  ? join(SRC, 'check-submodule-push-state.sh')
  : join(HERE, '..', 'check-submodule-push-state.sh')
const ZERO = '0'.repeat(40)
const tempDirs = []

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop(), { recursive: true, force: true })
  }
})

function run(cmd, cwd, env = {}, input) {
  const r = Bun.spawnSync(cmd, {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: input === undefined ? undefined : Buffer.from(input),
    env: { ...process.env, GIT_ALLOW_UNPUSHED_SUBMODULES: '', ...env },
  })
  return { code: r.exitCode, out: r.stdout.toString('utf8'), err: r.stderr.toString('utf8') }
}

const git = (cwd, ...args) => {
  const r = run(['git', '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], cwd)
  if (r.code !== 0) { throw new Error(`git ${args.join(' ')} → ${r.err}`) }
  return r.out.trim()
}

const commitFile = (cwd, name, text) => {
  writeFileSync(join(cwd, name), text)
  git(cwd, 'add', name)
  git(cwd, 'commit', '-q', '-m', text)
  return git(cwd, 'rev-parse', 'HEAD')
}

/**
 * letar с submodule `sub`: у submodule есть bare-origin, у letar — свой bare-origin.
 * `base` — первый коммит letar, уже отправленный на origin.
 */
function setup() {
  const root = mkdtempSync(join(tmpdir(), 'pre-push-check-'))
  tempDirs.push(root)
  const subOrigin = join(root, 'sub-origin.git')
  const letarOrigin = join(root, 'letar-origin.git')
  const letar = join(root, 'letar')
  git(root, 'init', '-q', '--bare', '-b', 'main', subOrigin)
  git(root, 'init', '-q', '--bare', '-b', 'main', letarOrigin)
  git(root, 'init', '-q', '-b', 'main', letar)
  git(letar, 'remote', 'add', 'origin', letarOrigin)

  // submodule: клон со стартовым коммитом, запушенным на origin
  const sub = join(letar, 'sub')
  git(root, 'clone', '-q', subOrigin, sub)
  git(sub, 'checkout', '-q', '-b', 'main')
  commitFile(sub, 'a.txt', 'a')
  git(sub, 'push', '-q', 'origin', 'main')

  writeFileSync(
    join(letar, '.gitmodules'),
    `[submodule "sub"]\n\tpath = sub\n\turl = ${subOrigin.replaceAll('\\', '/')}\n`,
  )
  git(letar, 'add', '.gitmodules', 'sub')
  git(letar, 'commit', '-q', '-m', 'base')
  const base = git(letar, 'rev-parse', 'HEAD')
  git(letar, 'push', '-q', 'origin', 'main')

  // Хук и чекер — в один каталог: чекер берётся как `_check-submodule-push-state.sh` рядом с хуком
  // (в временном репо каталога scripts/ нет).
  const hooks = join(root, 'hooks')
  mkdirSync(hooks)
  copyFileSync(HOOK_SRC, join(hooks, 'pre-push-submodule-check.sh'))
  copyFileSync(CHECKER_SRC, join(hooks, '_check-submodule-push-state.sh'))
  return { root, letar, sub, hooks, base }
}

/** Два коммита letar: первый → неотправленный SHA, второй → отправленный (не потомок первого). */
function twoCommits(env) {
  const { letar, sub, base } = env
  const unpushed = commitFile(sub, 'u.txt', 'u')
  git(letar, 'add', 'sub')
  git(letar, 'commit', '-q', '-m', 'intermediate: unpushed gitlink')
  // второй gitlink — от стартового коммита, на другой ветке, и он уходит на origin
  git(sub, 'checkout', '-q', '-B', 'other', 'origin/main')
  const pushed = commitFile(sub, 'p.txt', 'p')
  git(sub, 'push', '-q', 'origin', 'other:refs/heads/other')
  git(letar, 'add', 'sub')
  git(letar, 'commit', '-q', '-m', 'tip: pushed gitlink')
  return { unpushed, pushed, base, tip: git(letar, 'rev-parse', 'HEAD') }
}

function runHook(env, stdin, extraEnv = {}) {
  return run(['bash', join(env.hooks, 'pre-push-submodule-check.sh')], env.letar, extraEnv, stdin)
}

describe('pre-push-submodule-check: gitlink-и промежуточных коммитов', () => {
  test('промежуточный коммит ссылается на неотправленный SHA — push блокируется', () => {
    const env = setup()
    const c = twoCommits(env)
    const r = runHook(env, `refs/heads/main ${c.tip} refs/heads/main ${c.base}\n`)
    expect(r.code).toBe(1)
    expect(r.err).toContain(c.unpushed)
    expect(r.err).toContain('sub')
  })

  test('сообщение называет коммит letar, где появилась пара', () => {
    const env = setup()
    const c = twoCommits(env)
    const mid = git(env.letar, 'rev-parse', `${c.tip}^`)
    const r = runHook(env, `refs/heads/main ${c.tip} refs/heads/main ${c.base}\n`)
    expect(r.err).toContain(mid.slice(0, 9))
  })

  test('всё отправлено — проходит', () => {
    const env = setup()
    const { letar, sub, base } = env
    commitFile(sub, 'x.txt', 'x')
    git(sub, 'push', '-q', 'origin', 'main')
    git(letar, 'add', 'sub')
    git(letar, 'commit', '-q', '-m', 'bump')
    const tip = git(letar, 'rev-parse', 'HEAD')
    const r = runHook(env, `refs/heads/main ${tip} refs/heads/main ${base}\n`)
    expect(r.code).toBe(0)
  })

  test('новая ветка без remote oid — диапазон считается от origin', () => {
    const env = setup()
    const c = twoCommits(env)
    const r = runHook(env, `refs/heads/feature ${c.tip} refs/heads/feature ${ZERO}\n`)
    expect(r.code).toBe(1)
    expect(r.err).toContain(c.unpushed)
  })

  test('GIT_ALLOW_UNPUSHED_SUBMODULES=1 — блок превращается в предупреждение', () => {
    const env = setup()
    const c = twoCommits(env)
    const r = runHook(env, `refs/heads/main ${c.tip} refs/heads/main ${c.base}\n`, {
      GIT_ALLOW_UNPUSHED_SUBMODULES: '1',
    })
    expect(r.code).toBe(0)
    expect(r.err).toContain(c.unpushed)
    expect(r.err).toContain('GIT_ALLOW_UNPUSHED_SUBMODULES')
  })

  test('удаление ветки (local oid из нулей) — хук молча выходит', () => {
    const env = setup()
    expect(runHook(env, `(delete) ${ZERO} refs/heads/x ${env.base}\n`).code).toBe(0)
  })
})
