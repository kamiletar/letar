import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadEnvCascade } from './env-load'

describe('loadEnvCascade', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'env-load-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
    delete process.env.ENV_LOAD_TEST_SHARED
    delete process.env.ENV_LOAD_TEST_LOCAL_ONLY
    delete process.env.ENV_LOAD_TEST_BASE_ONLY
  })

  it('.env.local имеет приоритет над .env для общих ключей', () => {
    writeFileSync(join(dir, '.env.local'), 'ENV_LOAD_TEST_SHARED=from-local\n')
    writeFileSync(join(dir, '.env'), 'ENV_LOAD_TEST_SHARED=from-base\n')

    loadEnvCascade(dir)

    expect(process.env.ENV_LOAD_TEST_SHARED).toBe('from-local')
  })

  it('подхватывает переменные, заданные только в .env', () => {
    writeFileSync(join(dir, '.env.local'), 'ENV_LOAD_TEST_LOCAL_ONLY=local\n')
    writeFileSync(join(dir, '.env'), 'ENV_LOAD_TEST_BASE_ONLY=base\n')

    loadEnvCascade(dir)

    expect(process.env.ENV_LOAD_TEST_LOCAL_ONLY).toBe('local')
    expect(process.env.ENV_LOAD_TEST_BASE_ONLY).toBe('base')
  })

  it('не падает, если оба файла отсутствуют', () => {
    expect(() => loadEnvCascade(dir)).not.toThrow()
  })

  it('принимает кастомный список файлов вместо .env.local/.env', () => {
    writeFileSync(join(dir, '.env.docker'), 'ENV_LOAD_TEST_SHARED=from-docker\n')

    loadEnvCascade(dir, ['.env.local', '.env.docker'])

    expect(process.env.ENV_LOAD_TEST_SHARED).toBe('from-docker')
  })
})
