/**
 * Универсальный менеджер кеша с TTL и защитой от параллельных вычислений
 *
 * Решает проблемы:
 * 1. Кеширование дорогих операций (размер папки, статистика)
 * 2. Предотвращение параллельных вычислений одного значения
 * 3. Автоматическая инвалидация по времени
 *
 * @example
 * // Создание кеша с TTL 5 минут
 * const sizeCache = new CacheManager<number>(5 * 60 * 1000)
 *
 * // Использование
 * async function getLibrarySize(path: string): Promise<number> {
 *   const cached = sizeCache.get(path)
 *   if (cached !== null) return cached
 *
 *   if (sizeCache.isCalculating(path)) {
 *     return sizeCache.getValue(path) ?? 0
 *   }
 *
 *   sizeCache.startCalculation(path)
 *   try {
 *     const size = await calculateFolderSize(path)
 *     sizeCache.set(path, size)
 *     return size
 *   } finally {
 *     sizeCache.endCalculation(path)
 *   }
 * }
 */
export class CacheManager<T> {
  private cache = new Map<string, { value: T; updatedAt: number }>()
  private calculating = new Set<string>()

  constructor(private ttlMs: number) {}

  /**
   * Проверяет валидность кеша для ключа
   */
  isValid(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) {
      return false
    }
    return Date.now() - entry.updatedAt < this.ttlMs
  }

  /**
   * Получает значение из кеша (только если валидно)
   * @returns значение или null если кеш невалиден
   */
  get(key: string): T | null {
    return this.isValid(key) ? this.cache.get(key)!.value : null
  }

  /**
   * Получает значение из кеша (даже если просрочено)
   * Полезно для показа старых данных пока идёт пересчёт
   */
  getValue(key: string): T | undefined {
    return this.cache.get(key)?.value
  }

  /**
   * Устанавливает значение в кеш
   */
  set(key: string, value: T): void {
    this.cache.set(key, { value, updatedAt: Date.now() })
  }

  /**
   * Инвалидирует кеш для ключа (полностью удаляет запись для освобождения памяти)
   */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Полностью очищает кеш
   */
  clear(): void {
    this.cache.clear()
    this.calculating.clear()
  }

  /**
   * Проверяет, идёт ли вычисление для ключа
   */
  isCalculating(key: string): boolean {
    return this.calculating.has(key)
  }

  /**
   * Помечает начало вычисления
   */
  startCalculation(key: string): void {
    this.calculating.add(key)
  }

  /**
   * Помечает окончание вычисления
   */
  endCalculation(key: string): void {
    this.calculating.delete(key)
  }
}

/**
 * Простой single-value кеш для одного значения
 *
 * @example
 * const versionCache = new SingleValueCache<string>(60 * 1000)
 *
 * function getVersion(): string {
 *   const cached = versionCache.get()
 *   if (cached !== null) return cached
 *
 *   const version = expensiveVersionCheck()
 *   versionCache.set(version)
 *   return version
 * }
 */
export class SingleValueCache<T> {
  private value: T | null = null
  private updatedAt = 0
  private calculating = false

  constructor(private ttlMs: number) {}

  isValid(): boolean {
    return this.value !== null && Date.now() - this.updatedAt < this.ttlMs
  }

  get(): T | null {
    return this.isValid() ? this.value : null
  }

  getValue(): T | null {
    return this.value
  }

  set(value: T): void {
    this.value = value
    this.updatedAt = Date.now()
  }

  invalidate(): void {
    this.updatedAt = 0
  }

  clear(): void {
    this.value = null
    this.updatedAt = 0
    this.calculating = false
  }

  isCalculating(): boolean {
    return this.calculating
  }

  startCalculation(): void {
    this.calculating = true
  }

  endCalculation(): void {
    this.calculating = false
  }
}
