// Тесты write-publish-package-json.mjs — `bun test scripts/write-publish-package-json.test.mjs`.
// Замена `workspace:^` на `^<версия>`: найденный пакет, ненайденный, остаток `workspace:`.

import { afterEach, describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectLibVersions, resolveWorkspaceDeps } from './write-publish-package-json.mjs'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'write-publish-package-json.mjs')
const tempDirs = []

function tmp() {
  const dir = mkdtempSync(join(tmpdir(), 'wppj-test-'))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('resolveWorkspaceDeps', () => {
  const versions = new Map([['@letar/forms-core', '0.30.1'], ['@letar/forms-react', '0.26.2']])

  test('workspace:^ в dependencies заменяется на ^версия', () => {
    const { result, errors } = resolveWorkspaceDeps(
      { dependencies: { '@letar/forms-core': 'workspace:^', '@letar/forms-react': 'workspace:^' } },
      versions,
    )
    expect(errors).toEqual([])
    expect(result.dependencies).toEqual({ '@letar/forms-core': '^0.30.1', '@letar/forms-react': '^0.26.2' })
  })

  test('peerDependencies и optionalDependencies тоже обрабатываются, обычные диапазоны не трогаются', () => {
    const { result, errors } = resolveWorkspaceDeps(
      {
        peerDependencies: { '@letar/forms-core': 'workspace:^', react: '>=18.0.0' },
        optionalDependencies: { '@letar/forms-react': 'workspace:^' },
      },
      versions,
    )
    expect(errors).toEqual([])
    expect(result.peerDependencies).toEqual({ '@letar/forms-core': '^0.30.1', react: '>=18.0.0' })
    expect(result.optionalDependencies).toEqual({ '@letar/forms-react': '^0.26.2' })
  })

  test('пакет не найден — ошибка с именем зависимости', () => {
    const { errors } = resolveWorkspaceDeps({ dependencies: { '@letar/nope': 'workspace:^' } }, versions)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('@letar/nope')
  })

  test('остаток workspace:* — ошибка', () => {
    const { errors } = resolveWorkspaceDeps({ dependencies: { '@letar/forms-core': 'workspace:*' } }, versions)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('workspace:*')
  })

  test('шаблон не мутируется', () => {
    const template = { dependencies: { '@letar/forms-core': 'workspace:^' } }
    resolveWorkspaceDeps(template, versions)
    expect(template.dependencies['@letar/forms-core']).toBe('workspace:^')
  })
})

describe('collectLibVersions', () => {
  test('ищет по полю name, а не по имени каталога', () => {
    const libs = tmp()
    mkdirSync(join(libs, 'dir-a'))
    writeFileSync(join(libs, 'dir-a', 'package.json'), JSON.stringify({ name: '@letar/other-name', version: '1.2.3' }))
    mkdirSync(join(libs, 'no-pkg'))
    expect(collectLibVersions(libs).get('@letar/other-name')).toBe('1.2.3')
  })
})

describe('CLI', () => {
  function lib(publish) {
    const dir = tmp()
    mkdirSync(join(dir, 'dist'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: '@letar/x', version: '9.9.9' }))
    writeFileSync(join(dir, 'package.publish.json'), JSON.stringify(publish))
    return dir
  }
  const run = (cwd) => spawnSync('node', [SCRIPT], { cwd, encoding: 'utf8' })

  test('версия берётся из package.json, без workspace: — код 0', () => {
    const dir = lib({ name: '@letar/x', version: '0.0.0', dependencies: { zod: '^4.0.0' } })
    const r = run(dir)
    expect(r.status).toBe(0)
    const out = JSON.parse(readFileSync(join(dir, 'dist/package.json'), 'utf8'))
    expect(out.version).toBe('9.9.9')
  })

  test('ненайденный workspace-пакет — exit 1 и имя в stderr', () => {
    const dir = lib({ name: '@letar/x', dependencies: { '@letar/definitely-missing': 'workspace:^' } })
    const r = run(dir)
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('@letar/definitely-missing')
  })
})
