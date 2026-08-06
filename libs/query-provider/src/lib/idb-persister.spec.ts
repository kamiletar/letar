// globals: true в vitest.config.mts — describe, expect, it, vi доступны глобально
import * as idbKeyval from 'idb-keyval'
import { createIDBPersister } from './idb-persister'

// В environment: 'node' нет window/indexedDB, поэтому canUseIDB() всегда false —
// все три метода persister'а обязаны идти по no-op ветке и НЕ трогать idb-keyval.
// Мокаем модуль, чтобы доказать это (а не просто убедиться, что вызов не упал).
vi.mock('idb-keyval', () => ({
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
}))

describe('createIDBPersister (SSR/node окружение — no-op ветка)', () => {
  it('restoreClient резолвится в undefined', async () => {
    const persister = createIDBPersister()

    await expect(persister.restoreClient()).resolves.toBeUndefined()
  })

  it('persistClient резолвится без ошибок', async () => {
    const persister = createIDBPersister()

    await expect(
      persister.persistClient({
        // минимально валидный PersistedClient для теста — важна только форма вызова
        timestamp: Date.now(),
        buster: '',
        cacheState: {},
      } as never),
    ).resolves.not.toThrow()
  })

  it('removeClient резолвится без ошибок', async () => {
    const persister = createIDBPersister()

    await expect(persister.removeClient()).resolves.not.toThrow()
  })

  it('ни один из методов не дёргает idb-keyval.set/get/del — доказывает SSR-безопасность', async () => {
    const persister = createIDBPersister()

    await persister.persistClient({ timestamp: Date.now(), buster: '', cacheState: {} } as never)
    await persister.restoreClient()
    await persister.removeClient()

    expect(idbKeyval.set).not.toHaveBeenCalled()
    expect(idbKeyval.get).not.toHaveBeenCalled()
    expect(idbKeyval.del).not.toHaveBeenCalled()
  })
})
