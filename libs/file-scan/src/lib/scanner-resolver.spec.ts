import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ClamAvScanner } from './scanner-clamav'
import { FakeCleanScanner } from './scanner-fake'
import { resetFileScannerCache, resolveFileScanner } from './scanner-resolver'

const ENV_KEYS = ['CLAMAV_HOST', 'CLAMAV_PORT', 'ALLOW_FAKE_FILE_SCANNER'] as const

let saved: Record<string, string | undefined>

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
  for (const key of ENV_KEYS) {
    delete process.env[key]
  }
  resetFileScannerCache()
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = saved[key]
    }
  }
  resetFileScannerCache()
})

describe('resolveFileScanner', () => {
  it('CLAMAV_HOST задан — берётся настоящий сканер', () => {
    process.env.CLAMAV_HOST = 'letar-clamav'

    expect(resolveFileScanner()).toBeInstanceOf(ClamAvScanner)
  })

  it('ничего не настроено — сканер-заглушка, которая ничего не пропускает', async () => {
    const scanner = resolveFileScanner()

    expect(scanner).not.toBeInstanceOf(FakeCleanScanner)
    // Ключевое: не сконфигурировали — значит файл не проверен, а не «проверен и чист»
    await expect(scanner.scan(Buffer.from('файл'))).resolves.toEqual({
      status: 'SCAN_FAILED',
      resultCode: 'SCANNER_NOT_CONFIGURED',
    })
  })

  it('ALLOW_FAKE_FILE_SCANNER=true — заглушка «всё чисто», только для локальной разработки', () => {
    process.env.ALLOW_FAKE_FILE_SCANNER = 'true'

    expect(resolveFileScanner()).toBeInstanceOf(FakeCleanScanner)
  })

  it('настоящий сканер выигрывает у dev-заглушки, если заданы оба', () => {
    process.env.CLAMAV_HOST = 'letar-clamav'
    process.env.ALLOW_FAKE_FILE_SCANNER = 'true'

    // Иначе забытая в проде переменная тихо отключала бы настоящую проверку
    expect(resolveFileScanner()).toBeInstanceOf(ClamAvScanner)
  })

  it('любое значение кроме строгого "true" не включает заглушку', () => {
    process.env.ALLOW_FAKE_FILE_SCANNER = '1'

    expect(resolveFileScanner()).not.toBeInstanceOf(FakeCleanScanner)
  })

  it('инстанс переиспользуется — кеш версии clamd не теряется между загрузками', () => {
    process.env.CLAMAV_HOST = 'letar-clamav'

    expect(resolveFileScanner()).toBe(resolveFileScanner())
  })
})
