import type { FileScanner, ScanResult } from './types'

/**
 * Заглушка для dev/test — включается только явным `ALLOW_FAKE_FILE_SCANNER=true`.
 * Не использовать на реальной пользовательской загрузке в production.
 */
export class FakeCleanScanner implements FileScanner {
  readonly name = 'fake-clean-scanner'
  readonly version = '1.0.0'

  async scan(_bytes: Buffer): Promise<ScanResult> {
    return { status: 'CLEAN' }
  }
}

/** Для тестов: сканер, который всегда находит заражение или падает */
export class FakeFixedResultScanner implements FileScanner {
  readonly name = 'fake-fixed-result-scanner'
  readonly version = '1.0.0'

  constructor(private readonly result: ScanResult) {}

  async scan(_bytes: Buffer): Promise<ScanResult> {
    return this.result
  }
}
