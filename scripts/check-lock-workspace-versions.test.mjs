#!/usr/bin/env bun
// Тесты check-lock-workspace-versions.mjs и pre-push-lock-versions-check.sh —
// `bun test scripts/check-lock-workspace-versions.test.mjs`.
//
// Сценарий 2026-10-06: в рабочем дереве submodule лежит версия НОВЕЕ записанного в letar SHA.
// Сверка по рабочему дереву ругалась на чужие расхождения и блокировала правильный коммит lock;
// сверка по индексу/коммиту смотрит на то, что реально увидит сервер.

import { afterEach, describe, expect, test } from 'bun:test'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { catBatch, compareLock, parseLock, parseTreeListing } from './check-lock-workspace-versions.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const CHECKER = join(HERE, 'check-lock-workspace-versions.mjs')
const PUSH_HOOK = join(HERE, 'hooks', 'pre-push-lock-versions-check.sh')
const ZERO = '0'.repeat(40)
const tempDirs = []

afterEach(() => {
  while (tempDirs.length > 0) { rmSync(tempDirs.pop(), { recursive: true, force: true }) }
})

describe('compareLock (чистая функция)', () => {
  const pkgs = (map) => (path) => (path in map ? (map[path].skip ? map[path] : { pkg: map[path] }) : null)

  test('согласованное состояние — без расхождений', () => {
    const r = compareLock({
      lockWorkspaces: { '': { name: 'root' }, 'apps/a': { version: '1.0.0', dependencies: { x: '^1' } } },
      readPackage: pkgs({ '': { name: 'root' }, 'apps/a': { version: '1.0.0', dependencies: { x: '^1' } } }),
      discovered: ['apps/a'],
    })
    expect(r.problems).toEqual([])
    expect(r.checked).toBe(2)
  })

  test('корень без version — не расхождение', () => {
    const r = compareLock({
      lockWorkspaces: { '': {} },
      readPackage: pkgs({ '': { version: '9.9.9' } }),
      discovered: [],
    })
    expect(r.problems).toEqual([])
  })

  test('расхождение version и зависимостей', () => {
    const r = compareLock({
      lockWorkspaces: { 'apps/a': { version: '1.0.0', dependencies: { x: '^1' } } },
      readPackage: pkgs({ 'apps/a': { version: '1.1.0', dependencies: { x: '^2', y: '^1' } } }),
      discovered: ['apps/a'],
    })
    expect(r.problems).toHaveLength(3)
    expect(r.problems[0]).toContain('version package.json=1.1.0 lock=1.0.0')
  })

  test('workspace есть в источнике, в lock нет', () => {
    const r = compareLock({ lockWorkspaces: {}, readPackage: pkgs({}), discovered: ['libs/new'] })
    expect(r.problems).toEqual(['libs/new: package.json есть, записи в bun.lock нет'])
  })

  test('нет пакета: рабочее дерево — пропуск, git-режим — расхождение', () => {
    const base = { lockWorkspaces: { 'apps/gone': { version: '1.0.0' } }, readPackage: pkgs({}), discovered: [] }
    expect(compareLock(base).skipped).toHaveLength(1)
    expect(compareLock(base).problems).toEqual([])
    expect(compareLock({ ...base, absentIsProblem: true }).problems).toHaveLength(1)
  })

  test('skip попадает в неполное покрытие, не в расхождения', () => {
    const r = compareLock({
      lockWorkspaces: { 'apps/a': { version: '1.0.0' } },
      readPackage: pkgs({ 'apps/a': { skip: 'нет объекта' } }),
      discovered: [],
    })
    expect(r.problems).toEqual([])
    expect(r.skipped).toEqual([{ path: 'apps/a', reason: 'нет объекта' }])
    expect(r.checked).toBe(0)
  })
})

describe('вспомогательные разборщики', () => {
  test('parseLock терпит хвостовые запятые', () => {
    expect(parseLock('{"workspaces": {"": {"a": [1, 2,],},},}')).toEqual({ workspaces: { '': { a: [1, 2] } } })
  })

  test('parseTreeListing: индекс и дерево', () => {
    const idx = parseTreeListing('160000 abc123 0\tapps/sub\n100644 def456 0\tlibs/x/package.json\n', 'index')
    expect(idx.get('apps/sub')).toEqual({ mode: '160000', sha: 'abc123' })
    const tree = parseTreeListing('160000 commit abc123\tapps/sub\n040000 tree def456\tlibs/x\n', 'tree')
    expect(tree.get('libs/x')).toEqual({ mode: '040000', sha: 'def456' })
  })
})

function run(cmd, cwd, env = {}, input) {
  const r = Bun.spawnSync(cmd, {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: input === undefined ? undefined : Buffer.from(input),
    env: { ...process.env, GIT_ALLOW_LOCK_VERSION_DRIFT: '', ...env },
  })
  return { code: r.exitCode, out: r.stdout.toString('utf8'), err: r.stderr.toString('utf8') }
}

const git = (cwd, ...args) => {
  const r = run(['git', '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], cwd)
  if (r.code !== 0) { throw new Error(`git ${args.join(' ')} → ${r.err}`) }
  return r.out.trim()
}

const writeJson = (path, obj) => writeFileSync(path, JSON.stringify(obj, null, 2))

const lockText = (subVersion, libVersion) =>
  `{
  "lockfileVersion": 1,
  "workspaces": {
    "": { "name": "root", },
    "apps/sub": { "name": "sub", "version": "${subVersion}", "dependencies": { "x": "^1.0.0", }, },
    "libs/lib": { "name": "lib", "version": "${libVersion}", },
  },
  "packages": {},
}
`

/**
 * Мини-letar: submodule `apps/sub` (свой origin), обычный пакет `libs/lib`, bun.lock.
 * Коммит `base`: sub 1.0.0, lib 1.0.0, lock 1.0.0/1.0.0 — всё согласовано.
 */
function setup() {
  const root = mkdtempSync(join(tmpdir(), 'lock-versions-'))
  tempDirs.push(root)
  const subOrigin = join(root, 'sub-origin.git')
  const letarOrigin = join(root, 'letar-origin.git')
  const letar = join(root, 'letar')
  git(root, 'init', '-q', '--bare', '-b', 'main', subOrigin)
  git(root, 'init', '-q', '--bare', '-b', 'main', letarOrigin)
  git(root, 'init', '-q', '-b', 'main', letar)
  git(letar, 'remote', 'add', 'origin', letarOrigin)

  mkdirSync(join(letar, 'apps'))
  const sub = join(letar, 'apps', 'sub')
  git(root, 'clone', '-q', subOrigin, sub)
  git(sub, 'checkout', '-q', '-b', 'main')
  writeJson(join(sub, 'package.json'), { name: 'sub', version: '1.0.0', dependencies: { x: '^1.0.0' } })
  git(sub, 'add', 'package.json')
  git(sub, 'commit', '-q', '-m', 'sub 1.0.0')
  const subRecorded = git(sub, 'rev-parse', 'HEAD')
  git(sub, 'push', '-q', 'origin', 'main')

  mkdirSync(join(letar, 'libs', 'lib'), { recursive: true })
  writeJson(join(letar, 'package.json'), { name: 'root', workspaces: ['apps/*', 'libs/*'] })
  writeJson(join(letar, 'libs', 'lib', 'package.json'), { name: 'lib', version: '1.0.0' })
  writeFileSync(join(letar, 'bun.lock'), lockText('1.0.0', '1.0.0'))
  writeFileSync(
    join(letar, '.gitmodules'),
    `[submodule "apps/sub"]\n\tpath = apps/sub\n\turl = ${subOrigin.replaceAll('\\', '/')}\n`,
  )
  git(letar, 'add', '.gitmodules', 'package.json', 'bun.lock', 'apps/sub', 'libs/lib/package.json')
  git(letar, 'commit', '-q', '-m', 'base')
  git(letar, 'push', '-q', 'origin', 'main')

  return { root, letar, sub, subRecorded }
}

/** Новый коммит в submodule (рабочее дерево уезжает вперёд записанного SHA). */
function bumpSubInWorktree(sub, version) {
  writeJson(join(sub, 'package.json'), { name: 'sub', version, dependencies: { x: '^1.0.0' } })
  git(sub, 'add', 'package.json')
  git(sub, 'commit', '-q', '-m', `sub ${version}`)
  return git(sub, 'rev-parse', 'HEAD')
}

const check = (letar, ...args) => run(['bun', CHECKER, ...args], letar, { LOCK_CHECK_REPO_ROOT: letar })

describe('режимы источника (временный репозиторий с submodule)', () => {
  test('всё согласовано — три режима зелёные', () => {
    const { letar } = setup()
    for (const args of [[], ['--index'], ['--ref=HEAD']]) {
      const r = check(letar, ...args)
      expect(r.code).toBe(0)
      expect(r.out).toContain('✅')
    }
  })

  test('submodule в рабочем дереве новее записанного SHA: worktree красный, index/ref зелёные', () => {
    const { letar, sub } = setup()
    bumpSubInWorktree(sub, '1.1.0')

    const wt = check(letar)
    expect(wt.code).toBe(1)
    expect(wt.out).toContain('apps/sub: version package.json=1.1.0 lock=1.0.0')

    expect(check(letar, '--index').code).toBe(0)
    expect(check(letar, '--ref=HEAD').code).toBe(0)
  })

  test('в индекс записан новый SHA submodule, lock старый — index красный, и это видно до коммита', () => {
    const { letar, sub } = setup()
    bumpSubInWorktree(sub, '1.1.0')
    git(letar, 'add', 'apps/sub')

    const r = check(letar, '--index')
    expect(r.code).toBe(1)
    expect(r.out).toContain('apps/sub: version package.json=1.1.0 lock=1.0.0')
    // HEAD ещё старый — по коммиту всё согласовано
    expect(check(letar, '--ref=HEAD').code).toBe(0)
  })

  test('индекс: правильный lock проходит, даже если ЧУЖОЙ workspace в рабочем дереве расходится', () => {
    const { letar, sub } = setup()
    bumpSubInWorktree(sub, '1.1.0') // чужая работа в submodule, в letar не записана
    writeFileSync(join(letar, 'bun.lock'), lockText('1.0.0', '1.0.1'))
    writeJson(join(letar, 'libs', 'lib', 'package.json'), { name: 'lib', version: '1.0.1' })
    git(letar, 'add', 'bun.lock', 'libs/lib/package.json')
    expect(check(letar, '--index').code).toBe(0)
  })

  test('обычный пакет: версия в индексе новее lock — красный, незастейдженная правка не мешает', () => {
    const { letar } = setup()
    writeJson(join(letar, 'libs', 'lib', 'package.json'), { name: 'lib', version: '2.0.0' })
    expect(check(letar, '--index').code).toBe(0) // не застейджено — сервер этого не увидит
    git(letar, 'add', 'libs/lib/package.json')
    const r = check(letar, '--index')
    expect(r.code).toBe(1)
    expect(r.out).toContain('libs/lib: version package.json=2.0.0 lock=1.0.0')
  })

  test('записанного SHA нет в локальном submodule: неполное покрытие вслух, код 0', () => {
    const { letar } = setup()
    git(letar, 'update-index', '--cacheinfo', `160000,${'a'.repeat(40)},apps/sub`)
    const r = check(letar, '--index')
    expect(r.code).toBe(0)
    expect(r.out).toContain('неполное покрытие')
    expect(r.out).toContain('apps/sub')
    expect(r.out).toContain('проверено 2 workspace') // корень и libs/lib
  })

  test('submodule не выкачан: неполное покрытие', () => {
    const { letar } = setup()
    rmSync(join(letar, 'apps', 'sub', '.git'), { recursive: true, force: true })
    const r = check(letar, '--ref=HEAD')
    expect(r.code).toBe(0)
    expect(r.out).toContain('не выкачан')
  })

  test('новый workspace в индексе без записи в lock', () => {
    const { letar } = setup()
    mkdirSync(join(letar, 'libs', 'fresh'))
    writeJson(join(letar, 'libs', 'fresh', 'package.json'), { name: 'fresh', version: '0.1.0' })
    git(letar, 'add', 'libs/fresh/package.json')
    const r = check(letar, '--index')
    expect(r.code).toBe(1)
    expect(r.out).toContain('libs/fresh: package.json есть, записи в bun.lock нет')
  })

  test('catBatch: отсутствующий объект — null, порядок сохраняется', () => {
    const { letar } = setup()
    const [a, b, c] = catBatch(letar, ['HEAD:libs/lib/package.json', 'HEAD:нет/такого', 'HEAD:package.json'])
    expect(JSON.parse(a).name).toBe('lib')
    expect(b).toBeNull()
    expect(JSON.parse(c).name).toBe('root')
  })
})

describe('pre-push-lock-versions-check.sh', () => {
  /** Хук с копией чекера рядом (как после install.sh). */
  function installHook(root) {
    const hooks = join(root, 'hooks')
    mkdirSync(hooks, { recursive: true })
    copyFileSync(PUSH_HOOK, join(hooks, '_pre-push-lock-versions-check.sh'))
    copyFileSync(CHECKER, join(hooks, '_check-lock-workspace-versions.mjs'))
    return join(hooks, '_pre-push-lock-versions-check.sh')
  }

  /** Коммит letar, где sub записан на 1.1.0, а lock остался 1.0.0 (инцидент 2026-10-06). */
  function driftCommit({ letar, sub }) {
    bumpSubInWorktree(sub, '1.1.0')
    git(letar, 'add', 'apps/sub')
    git(letar, 'commit', '-q', '-m', 'bump sub')
    return git(letar, 'rev-parse', 'HEAD')
  }

  const line = (ref, oid) => `${ref} ${oid} refs/heads/main ${ZERO}\n`

  test('main с расходящимся lock — блок', () => {
    const ctx = setup()
    const hook = installHook(ctx.root)
    const oid = driftCommit(ctx)
    const r = run(['bash', hook], ctx.letar, {}, line('refs/heads/main', oid))
    expect(r.code).toBe(1)
    expect(r.err).toContain('apps/sub: version package.json=1.1.0 lock=1.0.0')
    expect(r.err).toContain('GIT_ALLOW_LOCK_VERSION_DRIFT=1')
  })

  test('обход флагом — предупреждение, код 0', () => {
    const ctx = setup()
    const hook = installHook(ctx.root)
    const oid = driftCommit(ctx)
    const r = run(['bash', hook], ctx.letar, { GIT_ALLOW_LOCK_VERSION_DRIFT: '1' }, line('refs/heads/main', oid))
    expect(r.code).toBe(0)
    expect(r.err).toContain('ФЛАГ GIT_ALLOW_LOCK_VERSION_DRIFT')
  })

  test('согласованный коммит проходит', () => {
    const ctx = setup()
    const hook = installHook(ctx.root)
    const head = git(ctx.letar, 'rev-parse', 'HEAD')
    expect(run(['bash', hook], ctx.letar, {}, line('refs/heads/main', head)).code).toBe(0)
  })

  test('не main, удаление ветки и пустой stdin — не проверяются', () => {
    const ctx = setup()
    const hook = installHook(ctx.root)
    const oid = driftCommit(ctx)
    expect(run(['bash', hook], ctx.letar, {}, `refs/heads/feat ${oid} refs/heads/feat ${ZERO}\n`).code).toBe(0)
    expect(run(['bash', hook], ctx.letar, {}, `(delete) ${ZERO} refs/heads/main ${oid}\n`).code).toBe(0)
    expect(run(['bash', hook], ctx.letar, {}, '').code).toBe(0)
  })

  test('исправленный lock в вершине — проходит, хотя промежуточный коммит расходился', () => {
    const ctx = setup()
    const hook = installHook(ctx.root)
    driftCommit(ctx)
    writeFileSync(join(ctx.letar, 'bun.lock'), lockText('1.1.0', '1.0.0'))
    git(ctx.letar, 'add', 'bun.lock')
    git(ctx.letar, 'commit', '-q', '-m', 'lock')
    const head = git(ctx.letar, 'rev-parse', 'HEAD')
    expect(run(['bash', hook], ctx.letar, {}, line('refs/heads/main', head)).code).toBe(0)
  })
})
