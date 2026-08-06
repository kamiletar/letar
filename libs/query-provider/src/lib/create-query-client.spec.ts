// globals: true в vitest.config.mts — describe, expect, it, vi доступны глобально
import { createQueryClient, getQueryClient, resetQueryClient } from './create-query-client'

describe('createQueryClient', () => {
  it('без аргументов использует пресет standard', () => {
    const client = createQueryClient()
    const defaults = client.getDefaultOptions()

    expect(defaults.queries?.staleTime).toBe(5 * 60 * 1000)
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false)
  })

  it('preset offline — mutations.retry 3 и networkMode offlineFirst', () => {
    const client = createQueryClient({ preset: 'offline' })
    const defaults = client.getDefaultOptions()

    expect(defaults.mutations?.retry).toBe(3)
    expect(defaults.mutations?.networkMode).toBe('offlineFirst')
  })

  it.each(['realtime', 'standard', 'static'] as const)(
    'preset %s — mutations.retry 0 и networkMode online',
    (preset) => {
      const client = createQueryClient({ preset })
      const defaults = client.getDefaultOptions()

      expect(defaults.mutations?.retry).toBe(0)
      expect(defaults.mutations?.networkMode).toBe('online')
    },
  )

  it('defaultOptions.queries переопределяет значения пресета (merge, не replace)', () => {
    const client = createQueryClient({
      preset: 'standard',
      defaultOptions: {
        queries: { staleTime: 1000 },
      },
    })
    const defaults = client.getDefaultOptions()

    // staleTime переопределён кастомным значением
    expect(defaults.queries?.staleTime).toBe(1000)
    // остальные поля пресета standard сохранились — merge, а не replace
    expect(defaults.queries?.gcTime).toBe(5 * 60 * 1000)
    expect(defaults.queries?.refetchOnReconnect).toBe(true)
  })

  it('defaultOptions.mutations переопределяет значения пресета', () => {
    const client = createQueryClient({
      preset: 'offline',
      defaultOptions: {
        mutations: { retry: 7 },
      },
    })
    const defaults = client.getDefaultOptions()

    expect(defaults.mutations?.retry).toBe(7)
    // networkMode пресета offline сохранился — переопределяли только retry
    expect(defaults.mutations?.networkMode).toBe('offlineFirst')
  })

  it('onMutationError попадает в mutations.onError', () => {
    const onMutationError = vi.fn()
    const client = createQueryClient({ onMutationError })
    const defaults = client.getDefaultOptions()

    expect(defaults.mutations?.onError).toBe(onMutationError)
  })
})

describe('getQueryClient (server-ветка, environment: node)', () => {
  // В environment: 'node' typeof window === 'undefined' всегда, поэтому код
  // getQueryClient() идёт исключительно по server-ветке (новый инстанс на каждый
  // вызов). Browser-ветка с синглтоном требует реального window/DOM-окружения
  // (jsdom) и в этом node-окружении сознательно не покрывается — см. задачу.

  it('возвращает новый QueryClient на каждый вызов (нет синглтона на сервере)', () => {
    const first = getQueryClient()
    const second = getQueryClient()

    expect(first).not.toBe(second)
  })

  it('прокидывает config в создаваемый клиент', () => {
    const client = getQueryClient({ preset: 'offline' })
    const defaults = client.getDefaultOptions()

    expect(defaults.mutations?.networkMode).toBe('offlineFirst')
  })
})

describe('resetQueryClient', () => {
  it('не бросает исключение при вызове', () => {
    expect(() => resetQueryClient()).not.toThrow()
  })
})
