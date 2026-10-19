// Тесты check-npm-package-integrity.mjs — `bun test scripts/check-npm-package-integrity.test.mjs`.
// Фикстуры dist собираются во временном каталоге: импорт в комментарии и шаблонной строке не считается,
// настоящий необъявленный — ошибка, workspace:, 'use client', приватные имена, рассинхрон с workflow.

import { afterEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  checkDist,
  checkOptionalPeers,
  checkWorkflowSync,
  extractExternalImports,
  privateNamesFromGitmodules,
} from './check-npm-package-integrity.mjs'

const tempDirs = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) { rmSync(dir, { recursive: true, force: true }) }
})

/** Создаёт dist с минимальным корректным пакетом; `files` дополняют и перекрывают базовые. */
function makeDist({ pkg = {}, files = {} } = {}) {
  const dist = mkdtempSync(join(tmpdir(), 'npm-integrity-test-'))
  tempDirs.push(dist)
  const manifest = {
    name: '@letar/demo',
    version: '1.0.0',
    type: 'module',
    exports: { '.': { types: './index.d.ts', import: './index.js' }, './package.json': './package.json' },
    peerDependencies: { react: '>=18' },
    publishConfig: { access: 'public', tag: 'next' },
    ...pkg,
  }
  const all = {
    'package.json': JSON.stringify(manifest, null, 2),
    LICENSE: 'MIT',
    'README.md': '# demo',
    'index.js': "import { useState } from 'react'\nexport const a = useState\n",
    'index.d.ts': "export declare const a: typeof import('react').useState\n",
    ...files,
  }
  for (const [rel, content] of Object.entries(all)) {
    const full = join(dist, rel)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, content)
  }
  return dist
}

const check = (dist, extra = {}) => checkDist({ dist, srcVersion: '1.0.0', privateNames: ['aboi', 'studio'], ...extra })

describe('extractExternalImports', () => {
  test('импорт в JSDoc-комментарии не считается', () => {
    const src = "/**\n * @example\n * import { x } from 'fake-in-jsdoc'\n */\nimport { y } from 'real-one'\n"
    expect([...extractExternalImports(src)]).toEqual(['real-one'])
  })

  test('импорт в строчном комментарии не считается', () => {
    expect(extractExternalImports("// import a from 'nope'\nexport const x = 1\n").size).toBe(0)
  })

  test('импорт внутри многострочной шаблонной строки не считается', () => {
    const src =
      "export const example = `import { z } from 'zod/v4'\nimport { Form } from '@letar/forms'\n`\nimport q from 'real'\n"
    expect([...extractExternalImports(src)]).toEqual(['real'])
  })

  test('динамический import() и реэкспорт считаются, встроенные модули Node и относительные пути — нет', () => {
    const src = [
      "export { a } from '@scope/pkg/sub'",
      "const m = await import('lazy-dep')",
      "import fs from 'node:fs'",
      "import path from 'path'",
      "import local from './local.js'",
      "import type { T } from 'types-only'",
    ].join('\n')
    expect([...extractExternalImports(src)].sort()).toEqual(['@scope/pkg', 'lazy-dep', 'types-only'])
  })

  test('import в .d.ts: import("m").Type', () => {
    expect([...extractExternalImports("export declare const a: import('react').FC\n")]).toEqual(['react'])
  })

  test('многострочный import { … } from', () => {
    expect([...extractExternalImports("import {\n  a,\n  b,\n} from 'multi'\n")]).toEqual(['multi'])
  })

  test('кавычка внутри регулярного литерала не ломает разбор', () => {
    const src = "const re = /['\"]use client['\"]/\nimport x from 'after-regex'\n"
    expect([...extractExternalImports(src)]).toEqual(['after-regex'])
  })
})

describe('checkDist', () => {
  test('корректный пакет без ошибок', () => {
    expect(check(makeDist())).toEqual([])
  })

  test('настоящий необъявленный импорт — ошибка', () => {
    const dist = makeDist({ files: { 'index.js': "import x from 'undeclared-pkg'\nexport const a = x\n" } })
    const errors = check(dist)
    expect(errors.some((e) => e.includes('необъявленный импорт undeclared-pkg'))).toBe(true)
  })

  test('импорт в комментарии и шаблонной строке — не ошибка', () => {
    const dist = makeDist({
      files: {
        'index.d.ts': "/**\n * import { a } from 'only-in-jsdoc'\n */\nexport declare const a: number\n",
        'index.js':
          "import { useState } from 'react'\nexport const t = `import q from 'only-in-template'`\nexport { useState }\n",
      },
    })
    expect(check(dist)).toEqual([])
  })

  test('workspace: в манифесте', () => {
    const dist = makeDist({ pkg: { dependencies: { '@letar/forms-core': 'workspace:^' } } })
    const errors = check(dist)
    expect(errors.some((e) => e.includes('workspace:'))).toBe(true)
  })

  test('не тот publishConfig.tag, нет LICENSE, чужая версия', () => {
    const dist = makeDist({ pkg: { publishConfig: { access: 'public', tag: 'beta' }, version: '9.9.9' } })
    rmSync(join(dist, 'LICENSE'))
    const errors = check(dist)
    expect(errors.some((e) => e.includes('ожидается next'))).toBe(true)
    expect(errors.some((e) => e.includes('нет LICENSE'))).toBe(true)
    expect(errors.some((e) => e.includes('9.9.9'))).toBe(true)
  })

  test('exports ссылается на несуществующий файл', () => {
    const dist = makeDist({ pkg: { exports: { '.': { import: './missing.js' } } } })
    expect(check(dist).some((e) => e.includes('./missing.js'))).toBe(true)
  })

  test("клиентский чанк без 'use client' — ошибка, нейтральный entry с директивой — ошибка", () => {
    const dist = makeDist({
      files: {
        'index.js': "'use client'\nimport { useState } from 'react'\nexport { useState }\n",
        'chunk-abc.js': "import { useState } from 'react'\nexport { useState }\n",
        'server.js': "'use client'\nexport const s = 1\n",
      },
    })
    const errors = check(dist, { useClient: { neutral: ['server.js'] } })
    expect(errors.some((e) => e.includes("chunk-abc.js: нет 'use client'"))).toBe(true)
    expect(errors.some((e) => e.includes('server.js: нейтральный entry'))).toBe(true)
  })

  test('все клиентские файлы с директивой, нейтральный без — без ошибок', () => {
    const dist = makeDist({
      files: {
        'index.js': "'use client'\nimport { useState } from 'react'\nexport { useState }\n",
        'server.js': 'export const s = 1\n',
      },
    })
    expect(check(dist, { useClient: { neutral: ['server.js'] } })).toEqual([])
  })

  test('приватное имя в .map — ошибка', () => {
    const dist = makeDist({ files: { 'index.js.map': '{"sourcesContent":["// used by aboi app"]}' } })
    expect(check(dist).some((e) => e.includes('index.js.map') && e.includes('aboi'))).toBe(true)
  })

  test('«Studio» с большой буквы и составные слова — не ошибка', () => {
    const dist = makeDist({ files: { 'README.md': '# Prisma Studio, studio-time, studios' } })
    expect(check(dist)).toEqual([])
  })

  test('privateNamesAllow снимает совпадение', () => {
    const dist = makeDist({ files: { 'README.md': 'run db:studio' } })
    expect(check(dist).length).toBe(1)
    expect(check(dist, { privateAllow: ['studio'] })).toEqual([])
  })
})

describe('checkOptionalPeers', () => {
  const optionalMeta = { 'heavy-lib': { optional: true } }

  test('optional peer, статически достижимый через чанк из entry, — ошибка', () => {
    const dist = makeDist({
      pkg: { peerDependencies: { react: '>=18', 'heavy-lib': '>=1' }, peerDependenciesMeta: optionalMeta },
      files: {
        'index.js': "import { a } from './chunk-1.js'\nexport { a }\n",
        'chunk-1.js': "import { h } from 'heavy-lib'\nexport const a = h\n",
      },
    })
    const errors = checkOptionalPeers(dist, JSON.parse(readFileSync(join(dist, 'package.json'), 'utf8')))
    expect(errors.length).toBe(1)
    expect(errors[0]).toContain('heavy-lib')
    expect(errors[0]).toContain('chunk-1.js')
  })

  test('optional peer только через динамический import() — не ошибка', () => {
    const dist = makeDist({
      pkg: { peerDependencies: { react: '>=18', 'heavy-lib': '>=1' }, peerDependenciesMeta: optionalMeta },
      files: {
        'index.js': "export const load = () => import('./lazy.js')\n",
        'lazy.js': "import { h } from 'heavy-lib'\nexport const a = h\n",
      },
    })
    expect(checkOptionalPeers(dist, JSON.parse(readFileSync(join(dist, 'package.json'), 'utf8')))).toEqual([])
  })

  test('обычный (не optional) peer со статическим импортом — не ошибка', () => {
    const dist = makeDist({
      pkg: { peerDependencies: { react: '>=18', 'heavy-lib': '>=1' } },
      files: { 'index.js': "import { h } from 'heavy-lib'\nexport const a = h\n" },
    })
    expect(checkOptionalPeers(dist, JSON.parse(readFileSync(join(dist, 'package.json'), 'utf8')))).toEqual([])
  })
})

describe('checkWorkflowSync', () => {
  const workflow = (tags, options = tags) => `
on:
  push:
    tags:
${tags.map((t) => `      - '${t}-v*.*.*'`).join('\n')}
  workflow_dispatch:
    inputs:
      project:
        type: choice
        options:
${options.map((t) => `          - '${t}'`).join('\n')}
jobs: {}
`

  test('списки совпадают', () => {
    expect(checkWorkflowSync(workflow(['forms', 'forms-core']), ['forms', 'forms-core'])).toEqual([])
  })

  test('в workflow не хватает пакета', () => {
    const errors = checkWorkflowSync(workflow(['forms']), ['forms', 'forms-core'])
    expect(errors.length).toBe(2)
    expect(errors.every((e) => e.includes('forms-core'))).toBe(true)
  })

  test('в workflow лишний триггер и лишний вариант', () => {
    const errors = checkWorkflowSync(workflow(['forms', 'old-pkg'], ['forms', 'other']), ['forms'])
    expect(errors.some((e) => e.includes("триггер 'old-pkg-v*.*.*'"))).toBe(true)
    expect(errors.some((e) => e.includes("вариант 'other'"))).toBe(true)
  })
})

describe('privateNamesFromGitmodules', () => {
  test('последний сегмент пути, без -e2e и .claude/private', () => {
    const text = [
      '[submodule "a"]',
      '\tpath = apps/aboi',
      '[submodule "b"]',
      '\tpath = apps/aboi-e2e',
      '[submodule "c"]',
      '\tpath = .claude/private',
      '[submodule "d"]',
      '\tpath = libs/driving-school-db',
    ].join('\n')
    expect(privateNamesFromGitmodules(text).sort()).toEqual(['aboi', 'driving-school-db'])
  })
})
