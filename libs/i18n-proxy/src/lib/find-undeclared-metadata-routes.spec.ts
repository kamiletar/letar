import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { findUndeclaredMetadataRoutes } from './find-undeclared-metadata-routes'

describe('findUndeclaredMetadataRoutes', () => {
  let appDir: string

  beforeEach(() => {
    appDir = mkdtempSync(join(tmpdir(), 'i18n-proxy-test-'))
  })

  afterEach(() => {
    rmSync(appDir, { recursive: true, force: true })
  })

  it('ничего не находит для пустого каталога', () => {
    expect(findUndeclaredMetadataRoutes(appDir, [])).toEqual([])
  })

  it('находит незадекларированный icon.tsx', () => {
    writeFileSync(join(appDir, 'icon.tsx'), '')

    expect(findUndeclaredMetadataRoutes(appDir, [])).toEqual(['icon'])
  })

  it('не жалуется, если роут явно задекларирован', () => {
    writeFileSync(join(appDir, 'apple-icon.png'), '')

    expect(findUndeclaredMetadataRoutes(appDir, ['apple-icon'])).toEqual([])
  })

  it('игнорирует несуществующий каталог (например, приложение целиком под [locale])', () => {
    expect(findUndeclaredMetadataRoutes(join(appDir, 'does-not-exist'), [])).toEqual([])
  })

  it('игнорирует файлы, не относящиеся к metadata-роутам', () => {
    mkdirSync(join(appDir, '[locale]'))
    writeFileSync(join(appDir, 'robots.ts'), '')

    expect(findUndeclaredMetadataRoutes(appDir, [])).toEqual([])
  })
})
