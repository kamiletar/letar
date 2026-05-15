import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addToBlacklist,
  addToWhitelist,
  checkRateLimit,
  clearAll,
  createRateLimiter,
  getAllSettings,
  getCustomLimit,
  getRateLimiterStats,
  isBlacklisted,
  isWhitelisted,
  type RateLimiterInstance,
  removeFromBlacklist,
  removeFromWhitelist,
  resetCounters,
  setCustomLimit,
} from '../rate-limiter'

describe('Rate Limiter - Global Functions', () => {
  beforeEach(() => {
    // Очищаем все данные перед каждым тестом
    clearAll()
  })

  describe('Группа 1: Sliding Window Algorithm', () => {
    it('должен разрешать запросы в пределах лимита', () => {
      const key = 'org-123'

      // Делаем 5 запросов - все должны пройти
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(key)
        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(100) // Default limit
        expect(result.remaining).toBe(100 - i - 1)
      }
    })

    it('должен блокировать запросы при превышении лимита', () => {
      const key = 'org-456'

      // Делаем 100 запросов (default limit)
      for (let i = 0; i < 100; i++) {
        checkRateLimit(key)
      }

      // 101-й запрос должен быть заблокирован
      const result = checkRateLimit(key)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('должен сбрасывать счётчики после окончания окна', () => {
      vi.useFakeTimers()
      const key = 'org-789'

      // Делаем 100 запросов
      for (let i = 0; i < 100; i++) {
        checkRateLimit(key)
      }

      // Проверяем что лимит достигнут
      let result = checkRateLimit(key)
      expect(result.allowed).toBe(false)

      // Перематываем время на 61 секунду (окно = 60 секунд)
      vi.advanceTimersByTime(61 * 1000)

      // Теперь запрос должен пройти
      result = checkRateLimit(key)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(99)

      vi.useRealTimers()
    })

    it('должен возвращать корректный resetAt timestamp', () => {
      const now = Date.now()
      const result = checkRateLimit('org-test')

      // resetAt должен быть примерно through now + 60 секунд
      expect(result.resetAt).toBeGreaterThan(Math.floor(now / 1000))
      expect(result.resetAt).toBeLessThanOrEqual(Math.floor((now + 61 * 1000) / 1000))
    })
  })

  describe('Группа 2: Custom Limits', () => {
    it('должен применять кастомный лимит для ключа', () => {
      const key = 'org-custom'
      setCustomLimit(key, 5) // Устанавливаем лимит 5 запросов

      // Делаем 5 запросов - все должны пройти
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(key)
        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(5)
      }

      // 6-й запрос должен быть заблокирован
      const result = checkRateLimit(key)
      expect(result.allowed).toBe(false)
      expect(result.limit).toBe(5)
    })

    it('должен удалять кастомный лимит при значении <= 0', () => {
      const key = 'org-remove'
      setCustomLimit(key, 10)

      let limit = getCustomLimit(key)
      expect(limit).toBe(10)

      // Удаляем лимит
      setCustomLimit(key, 0)
      limit = getCustomLimit(key)
      expect(limit).toBeNull()
    })

    it('должен возвращать null для несуществующего кастомного лимита', () => {
      const limit = getCustomLimit('non-existent-key')
      expect(limit).toBeNull()
    })
  })

  describe('Группа 3: Whitelist', () => {
    it('должен разрешать неограниченные запросы для whitelisted ключей', () => {
      const key = 'org-vip'
      addToWhitelist(key)

      // Делаем 200 запросов (больше default limit)
      for (let i = 0; i < 200; i++) {
        const result = checkRateLimit(key)
        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(-1) // Unlimited
        expect(result.remaining).toBe(-1)
      }
    })

    it('должен удалять ключ из whitelist', () => {
      const key = 'org-temp-vip'
      addToWhitelist(key)
      expect(isWhitelisted(key)).toBe(true)

      removeFromWhitelist(key)
      expect(isWhitelisted(key)).toBe(false)

      // Теперь применяется default limit
      for (let i = 0; i < 100; i++) {
        checkRateLimit(key)
      }
      const result = checkRateLimit(key)
      expect(result.allowed).toBe(false)
    })

    it('должен удалять ключ из blacklist при добавлении в whitelist', () => {
      const key = 'org-switch'
      addToBlacklist(key)
      expect(isBlacklisted(key)).toBe(true)

      addToWhitelist(key)
      expect(isWhitelisted(key)).toBe(true)
      expect(isBlacklisted(key)).toBe(false)
    })
  })

  describe('Группа 4: Blacklist', () => {
    it('должен блокировать все запросы для blacklisted ключей', () => {
      const key = 'org-banned'
      addToBlacklist(key)

      const result = checkRateLimit(key)
      expect(result.allowed).toBe(false)
      expect(result.limit).toBe(0)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('должен удалять ключ из blacklist', () => {
      const key = 'org-unbanned'
      addToBlacklist(key)
      expect(isBlacklisted(key)).toBe(true)

      removeFromBlacklist(key)
      expect(isBlacklisted(key)).toBe(false)

      const result = checkRateLimit(key)
      expect(result.allowed).toBe(true)
    })

    it('должен удалять ключ из whitelist при добавлении в blacklist', () => {
      const key = 'org-switch-black'
      addToWhitelist(key)
      expect(isWhitelisted(key)).toBe(true)

      addToBlacklist(key)
      expect(isBlacklisted(key)).toBe(true)
      expect(isWhitelisted(key)).toBe(false)
    })
  })

  describe('Группа 5: Statistics & Management', () => {
    it('должен возвращать корректную статистику', () => {
      clearAll()

      // Добавляем данные
      checkRateLimit('org-1')
      checkRateLimit('org-2')
      setCustomLimit('org-custom', 50)
      addToWhitelist('org-vip')
      addToBlacklist('org-banned')

      const stats = getRateLimiterStats()
      expect(stats.activeKeys).toBe(2) // org-1, org-2
      expect(stats.customLimits).toBe(1)
      expect(stats.whitelisted).toBe(1)
      expect(stats.blacklisted).toBe(1)
      expect(stats.defaultLimit).toBe(100)
      expect(stats.windowSeconds).toBe(60)
    })

    it('должен возвращать все настройки', () => {
      clearAll()

      setCustomLimit('org-1', 50)
      setCustomLimit('org-2', 200)
      addToWhitelist('org-vip')
      addToBlacklist('org-banned')

      const settings = getAllSettings()
      expect(settings.customLimits).toHaveLength(2)
      expect(settings.whitelist).toEqual(['org-vip'])
      expect(settings.blacklist).toEqual(['org-banned'])
    })

    it('должен сбрасывать счётчики для ключа', () => {
      const key = 'org-reset'

      // Делаем 50 запросов
      for (let i = 0; i < 50; i++) {
        checkRateLimit(key)
      }

      // Проверяем что remaining = 50
      let result = checkRateLimit(key)
      expect(result.remaining).toBe(49)

      // Сбрасываем счётчики
      resetCounters(key)

      // Теперь remaining должен быть 99 (как будто первый запрос)
      result = checkRateLimit(key)
      expect(result.remaining).toBe(99)
    })

    it('должен очищать все данные', () => {
      checkRateLimit('org-1')
      setCustomLimit('org-2', 50)
      addToWhitelist('org-3')
      addToBlacklist('org-4')

      const statsBefore = getRateLimiterStats()
      expect(statsBefore.activeKeys).toBeGreaterThan(0)

      clearAll()

      const statsAfter = getRateLimiterStats()
      expect(statsAfter.activeKeys).toBe(0)
      expect(statsAfter.customLimits).toBe(0)
      expect(statsAfter.whitelisted).toBe(0)
      expect(statsAfter.blacklisted).toBe(0)
    })
  })

  describe('Группа 6: Secondary Key', () => {
    it('должен использовать secondaryKey для хранения счётчиков', () => {
      const primaryKey = 'org-123'
      const secondaryKey = 'apikey-abc'

      // Делаем 50 запросов с одним secondaryKey
      for (let i = 0; i < 50; i++) {
        checkRateLimit(primaryKey, secondaryKey)
      }

      // Проверяем что счётчик на 50
      let result = checkRateLimit(primaryKey, secondaryKey)
      expect(result.remaining).toBe(49)

      // Запрос с другим secondaryKey должен иметь полный счётчик
      result = checkRateLimit(primaryKey, 'apikey-xyz')
      expect(result.remaining).toBe(99)
    })
  })
})

describe('Rate Limiter - Instance-based API', () => {
  let limiter: RateLimiterInstance

  beforeEach(() => {
    // Создаём новый экземпляр для каждого теста
    limiter = createRateLimiter({
      windowMs: 10 * 1000, // 10 секунд для быстрых тестов
      maxRequests: 5,
    })
  })

  describe('Группа 1: Basic Functionality', () => {
    it('должен работать с кастомными настройками', () => {
      const key = 'test-key'

      // Делаем 5 запросов (limit = 5)
      for (let i = 0; i < 5; i++) {
        const result = limiter.checkRateLimit(key)
        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(5)
      }

      // 6-й запрос должен быть заблокирован
      const result = limiter.checkRateLimit(key)
      expect(result.allowed).toBe(false)
    })

    it('должен изолировать экземпляры друг от друга', () => {
      const limiter1 = createRateLimiter({ maxRequests: 5 })
      const limiter2 = createRateLimiter({ maxRequests: 10 })

      const key = 'shared-key'

      // limiter1 имеет лимит 5
      for (let i = 0; i < 5; i++) {
        limiter1.checkRateLimit(key)
      }
      expect(limiter1.checkRateLimit(key).allowed).toBe(false)

      // limiter2 имеет лимит 10 и независим
      for (let i = 0; i < 10; i++) {
        const result = limiter2.checkRateLimit(key)
        expect(result.allowed).toBe(true)
      }
      expect(limiter2.checkRateLimit(key).allowed).toBe(false)

      // Cleanup
      limiter1.destroy()
      limiter2.destroy()
    })
  })

  describe('Группа 2: Cleanup', () => {
    it('должен очищать устаревшие записи периодически', async () => {
      vi.useFakeTimers()

      const quickLimiter = createRateLimiter({
        windowMs: 1000, // 1 секунда
        maxRequests: 10,
        cleanupIntervalMs: 100, // Очистка каждые 100ms
      })

      const key = 'cleanup-test'
      quickLimiter.checkRateLimit(key)

      // Перематываем время на 2 секунды
      vi.advanceTimersByTime(2000)

      // Ждём cleanup
      vi.advanceTimersByTime(100)

      const stats = quickLimiter.getRateLimiterStats()
      // activeKeys может быть 0 после cleanup
      expect(stats.activeKeys).toBe(0)

      quickLimiter.destroy()
      vi.useRealTimers()
    })

    it('должен корректно уничтожать экземпляр', () => {
      const testLimiter = createRateLimiter()
      testLimiter.checkRateLimit('test')

      let stats = testLimiter.getRateLimiterStats()
      expect(stats.activeKeys).toBe(1)

      testLimiter.destroy()

      // После destroy все данные очищены
      stats = testLimiter.getRateLimiterStats()
      expect(stats.activeKeys).toBe(0)
    })
  })
})
