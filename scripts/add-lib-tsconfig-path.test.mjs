// Тесты add-lib-tsconfig-path.mjs — `bun test scripts/add-lib-tsconfig-path.test.mjs`.
// Скрипт считает корень репо от своего расположения, поэтому тест собирает в temp-каталоге мини-репо:
// копию скрипта с `lib/fs-walk.mjs`, два приложения (публичное и submodule из `.gitmodules`) и библиотеку.

import { afterEach, describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPTS = dirname(fileURLToPath(import.meta.url))
const tempDirs = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

const TSCONFIG = `{
  "compilerOptions": {
    "paths": {
      "@letar/forms": ["../../libs/forms/src/index.ts"],
      "@letar/forms/offline": ["../../libs/forms/src/lib/offline/index.ts"]
    }
  }
}
`

/** Мини-репо: `apps/pub` — публичное, `apps/priv` — submodule, `libs/other` — библиотека-потребитель */
function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), 'altp-test-'))
  tempDirs.push(root)
  mkdirSync(join(root, 'scripts', 'lib'), { recursive: true })
  copyFileSync(join(SCRIPTS, 'add-lib-tsconfig-path.mjs'), join(root, 'scripts', 'add-lib-tsconfig-path.mjs'))
  copyFileSync(join(SCRIPTS, 'lib', 'fs-walk.mjs'), join(root, 'scripts', 'lib', 'fs-walk.mjs'))
  for (const dir of ['apps/pub', 'apps/priv', 'libs/other']) {
    mkdirSync(join(root, dir), { recursive: true })
    writeFileSync(join(root, dir, 'tsconfig.json'), TSCONFIG)
  }
  writeFileSync(
    join(root, '.gitmodules'),
    '[submodule "apps/priv"]\n\tpath = apps/priv\n\turl = git@example.com:x/priv.git\n',
  )
  return root
}

function run(root, extra) {
  return spawnSync(
    process.execPath,
    [
      join(root, 'scripts', 'add-lib-tsconfig-path.mjs'),
      '--package',
      '@letar/forms/sortable',
      '--target',
      'libs/forms/src/entries/sortable.ts',
      '--after',
      '@letar/forms/offline',
      ...extra,
    ],
    { cwd: root, encoding: 'utf8' },
  )
}

const read = (root, file) => readFileSync(join(root, file), 'utf8')

describe('add-lib-tsconfig-path --skip-submodules', () => {
  test('без флага строка добавляется и в submodule', () => {
    const root = makeRepo()
    const result = run(root, [])
    expect(result.status).toBe(0)
    expect(read(root, 'apps/pub/tsconfig.json')).toContain(
      '"@letar/forms/sortable": ["../../libs/forms/src/entries/sortable.ts"]',
    )
    expect(read(root, 'apps/priv/tsconfig.json')).toContain('"@letar/forms/sortable"')
  })

  test('с флагом submodule не трогается, остальные потребители получают строку', () => {
    const root = makeRepo()
    const result = run(root, ['--skip-submodules'])
    expect(result.status).toBe(0)
    expect(read(root, 'apps/pub/tsconfig.json')).toContain('"@letar/forms/sortable"')
    expect(read(root, 'libs/other/tsconfig.json')).toContain('"@letar/forms/sortable"')
    expect(read(root, 'apps/priv/tsconfig.json')).toBe(TSCONFIG)
    expect(result.stdout).toContain('Пропущены submodule')
  })

  test('флаг не съедает следующий аргумент', () => {
    const root = makeRepo()
    // флаг стоит перед --package: если бы он брал значение, --package пропал бы и скрипт вышел с кодом 1
    const result = spawnSync(
      process.execPath,
      [
        join(root, 'scripts', 'add-lib-tsconfig-path.mjs'),
        '--skip-submodules',
        '--package',
        '@letar/forms/debug',
        '--target',
        'libs/forms/src/entries/debug.ts',
      ],
      { cwd: root, encoding: 'utf8' },
    )
    expect(result.status).toBe(0)
    expect(read(root, 'apps/pub/tsconfig.json')).toContain('"@letar/forms/debug"')
    expect(read(root, 'apps/priv/tsconfig.json')).toBe(TSCONFIG)
  })
})
