// globals: true в vitest.config.mts — describe, expect, it, vi доступны глобально
//
// connection.ts — тонкая обёртка над createConnectionStore из @letar/animatrona-shared.
// Сама фабрика store (persist, AsyncStorage, actions) уже покрыта в самой библиотеке —
// здесь важно только, что обёртка передаёт правильный уникальный storageKey и не теряет
// возвращаемый store при реэкспорте.
import { createConnectionStore } from '@letar/animatrona-shared'

vi.mock('@letar/animatrona-shared', () => ({
  createConnectionStore: vi.fn(() => 'fake-store'),
}))

const mockedCreateConnectionStore = vi.mocked(createConnectionStore)

describe('useConnectionStore (animatrona-tv)', () => {
  it('создаётся с уникальным для tv storage key', async () => {
    const { useConnectionStore } = await import('./connection')

    expect(mockedCreateConnectionStore).toHaveBeenCalledTimes(1)
    expect(mockedCreateConnectionStore).toHaveBeenCalledWith('animatrona-tv-connection')
    expect(useConnectionStore).toBe('fake-store')
  })
})
