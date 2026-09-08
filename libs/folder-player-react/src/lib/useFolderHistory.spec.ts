import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { FolderPlayerStorage } from './host'
import { useFolderHistory } from './useFolderHistory'

function createStorage(): FolderPlayerStorage {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
  }
}

const NOOP_STORAGE: FolderPlayerStorage = {
  getItem: () => null,
  setItem: () => {},
}

describe('useFolderHistory', () => {
  it('добавляет папку и сохраняет её в переданное хранилище', () => {
    const storage = createStorage()
    const { result } = renderHook(() => useFolderHistory(storage))

    act(() => {
      result.current.addFolder('/anime/Series', 'Series', 12)
    })

    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0]).toMatchObject({ folderPath: '/anime/Series', episodeCount: 12 })
    expect(JSON.parse(storage.getItem('animatrona-folder-history') ?? '[]')).toHaveLength(1)
  })

  it('загружает историю уже при первом монтировании, если хранилище доступно сразу', () => {
    const storage = createStorage()
    storage.setItem(
      'animatrona-folder-history',
      JSON.stringify([{ folderPath: '/anime/Old', folderName: 'Old', episodeCount: 3, lastOpenedAt: Date.now() }]),
    )

    const { result } = renderHook(() => useFolderHistory(storage))

    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0].folderPath).toBe('/anime/Old')
  })

  it('перечитывает хранилище, когда storage заменяется с заглушки на настоящее после монтирования (SSR-гейт animatrona-folder-player)', async () => {
    const realStorage = createStorage()
    realStorage.setItem(
      'animatrona-folder-history',
      JSON.stringify([
        { folderPath: '/anime/Persisted', folderName: 'Persisted', episodeCount: 5, lastOpenedAt: Date.now() },
      ]),
    )

    const { result, rerender } = renderHook(
      ({ storage }: { storage: FolderPlayerStorage }) => useFolderHistory(storage),
      {
        initialProps: { storage: NOOP_STORAGE },
      },
    )

    // На первом рендере (аналог `mounted === false`) настоящей истории ещё нет
    expect(result.current.history).toHaveLength(0)

    // После "монтирования" потребитель заменяет заглушку на реальное хранилище
    rerender({ storage: realStorage })

    await waitFor(() => {
      expect(result.current.history).toHaveLength(1)
    })
    expect(result.current.history[0].folderPath).toBe('/anime/Persisted')
  })

  it('удаляет папку из истории и из хранилища', () => {
    const storage = createStorage()
    const { result } = renderHook(() => useFolderHistory(storage))

    act(() => {
      result.current.addFolder('/anime/A', 'A', 1)
      result.current.addFolder('/anime/B', 'B', 2)
    })
    act(() => {
      result.current.removeFolder('/anime/A')
    })

    expect(result.current.history.map((e) => e.folderPath)).toEqual(['/anime/B'])
    expect(JSON.parse(storage.getItem('animatrona-folder-history') ?? '[]')).toHaveLength(1)
  })
})
