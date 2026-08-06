// globals: true в vitest.config.mts — describe, expect, it доступны глобально
import { CACHE_PRESETS, OFFLINE_CACHE, REALTIME_CACHE, STANDARD_CACHE, STATIC_CACHE } from './cache-presets'

describe('REALTIME_CACHE', () => {
  it('короткий staleTime — данные почти сразу считаются устаревшими', () => {
    expect(REALTIME_CACHE?.staleTime).toBe(5 * 1000)
  })

  it('refetchOnWindowFocus включён — актуальность важнее нагрузки', () => {
    expect(REALTIME_CACHE?.refetchOnWindowFocus).toBe(true)
  })

  it('refetchOnReconnect включён', () => {
    expect(REALTIME_CACHE?.refetchOnReconnect).toBe(true)
  })
})

describe('STANDARD_CACHE', () => {
  it('умеренный staleTime — 5 минут', () => {
    expect(STANDARD_CACHE?.staleTime).toBe(5 * 60 * 1000)
  })

  it('refetchOnWindowFocus выключен — снижает нагрузку на GC', () => {
    expect(STANDARD_CACHE?.refetchOnWindowFocus).toBe(false)
  })

  it('refetchOnReconnect включён', () => {
    expect(STANDARD_CACHE?.refetchOnReconnect).toBe(true)
  })
})

describe('STATIC_CACHE', () => {
  it('длинный staleTime — 30 минут', () => {
    expect(STATIC_CACHE?.staleTime).toBe(30 * 60 * 1000)
  })

  it('ещё более длинный gcTime — 1 час', () => {
    expect(STATIC_CACHE?.gcTime).toBe(60 * 60 * 1000)
  })

  it('refetchOnWindowFocus выключен', () => {
    expect(STATIC_CACHE?.refetchOnWindowFocus).toBe(false)
  })

  it('refetchOnReconnect выключен — справочники не меняются на лету', () => {
    expect(STATIC_CACHE?.refetchOnReconnect).toBe(false)
  })
})

describe('OFFLINE_CACHE', () => {
  it('networkMode offlineFirst — работает без сети', () => {
    expect(OFFLINE_CACHE?.networkMode).toBe('offlineFirst')
  })

  it('самый долгий gcTime — 24 часа', () => {
    expect(OFFLINE_CACHE?.gcTime).toBe(24 * 60 * 60 * 1000)
  })

  it('максимум повторов — 3', () => {
    expect(OFFLINE_CACHE?.retry).toBe(3)
  })
})

describe('CACHE_PRESETS', () => {
  it('содержит все 4 пресета под правильными ключами', () => {
    expect(CACHE_PRESETS).toEqual({
      realtime: REALTIME_CACHE,
      standard: STANDARD_CACHE,
      static: STATIC_CACHE,
      offline: OFFLINE_CACHE,
    })
  })

  it('ключи объекта соответствуют ожидаемому набору пресетов', () => {
    expect(Object.keys(CACHE_PRESETS).sort()).toEqual(['offline', 'realtime', 'standard', 'static'])
  })
})
