#!/usr/bin/env bun
// Тесты check-lock-subset.mjs — `bun test scripts/check-lock-subset.test.mjs`.

import { describe, expect, test } from 'bun:test'
import { compareLockSubset } from './check-lock-subset.mjs'
import { parseLock } from './check-lock-workspace-versions.mjs'

const make = (over = {}) => ({
  lockfileVersion: 3,
  configVersion: 1,
  workspaces: {
    '': { name: 'root', dependencies: { zod: '^4.0.0' } },
    'libs/forms': { name: '@letar/forms', version: '1.0.0' },
    'apps/x': { name: 'x', version: '0.1.0', dependencies: { left: '^1.0.0' } },
  },
  packages: {
    zod: ['zod@4.6.5', '', {}, 'sha512-zod'],
    left: ['left@1.0.0', '', {}, 'sha512-left'],
    '@letar/forms': ['@letar/forms@workspace:libs/forms'],
    x: ['x@workspace:apps/x'],
    'a/dep': ['dep@2.0.0', '', {}, 'sha512-dep'],
  },
  ...over,
})
const clone = (o) => JSON.parse(JSON.stringify(o))

describe('compareLockSubset', () => {
  test('одинаковые файлы — ok', () => {
    const r = compareLockSubset(make(), make())
    expect(r.ok).toBe(true)
    expect(r.removed).toEqual({ packages: 0, workspaces: 0, other: 0 })
  })

  test('удалён workspace и его эксклюзивные пакеты — ok, removed посчитан', () => {
    const n = make()
    delete n.workspaces['apps/x']
    delete n.packages.x
    delete n.packages.left
    const r = compareLockSubset(make(), n)
    expect(r.ok).toBe(true)
    expect(r.removed.workspaces).toBe(1)
    expect(r.removed.packages).toBe(2)
  })

  test('переподъём a/dep → dep с тем же ident/integrity — ok', () => {
    const n = make()
    delete n.packages['a/dep']
    n.packages.dep = ['dep@2.0.0', '', {}, 'sha512-dep']
    expect(compareLockSubset(make(), n).ok).toBe(true)
  })

  test('новый пакет — нарушение', () => {
    const n = make()
    n.packages.fresh = ['fresh@1.0.0', '', {}, 'sha512-fresh']
    const r = compareLockSubset(make(), n)
    expect(r.ok).toBe(false)
    expect(r.violations[0]).toContain('+ fresh: fresh@1.0.0')
  })

  test('тот же ключ, другая версия — нарушение с подсказкой', () => {
    const n = make()
    n.packages.zod = ['zod@4.5.0', '', {}, 'sha512-zod45']
    const r = compareLockSubset(make(), n)
    expect(r.ok).toBe(false)
    expect(r.violations[0]).toContain('+ zod: zod@4.5.0')
    expect(r.violations[0]).toContain('(в lock: zod@4.6.5)')
  })

  test('та же версия, другой integrity — нарушение', () => {
    const n = make()
    n.packages.zod = ['zod@4.6.5', '', {}, 'sha512-other']
    const r = compareLockSubset(make(), n)
    expect(r.ok).toBe(false)
    expect(r.violations[0]).toContain('другой integrity')
  })

  test('изменилась запись оставшегося workspace — нарушение', () => {
    const n = make()
    n.workspaces['libs/forms'].version = '1.0.1'
    const r = compareLockSubset(make(), n)
    expect(r.ok).toBe(false)
    expect(r.violations[0]).toContain('workspace libs/forms')
  })

  test('новый workspace — нарушение', () => {
    const n = make()
    n.workspaces['libs/new'] = { name: 'new' }
    expect(compareLockSubset(make(), n).ok).toBe(false)
  })

  test('другой lockfileVersion — нарушение', () => {
    const r = compareLockSubset(make(), make({ lockfileVersion: 4 }))
    expect(r.ok).toBe(false)
    expect(r.violations[0]).toContain('другой версией bun')
  })

  test('overrides: новый ключ — нарушение, удалённый — ok', () => {
    const b = make({ overrides: { a: '1', b: '2' } })
    const okLock = clone(b)
    delete okLock.overrides.b
    expect(compareLockSubset(b, okLock).ok).toBe(true)
    const bad = clone(b)
    bad.overrides.c = '3'
    expect(compareLockSubset(b, bad).ok).toBe(false)
  })

  test('хвостовые запятые (JSONC) разбираются', () => {
    const text = '{\n  "lockfileVersion": 3,\n  "packages": {\n    "a": ["a@1.0.0", "", {}, "sha512-a",],\n  },\n}\n'
    const lock = parseLock(text)
    expect(compareLockSubset(lock, lock).ok).toBe(true)
  })
})
