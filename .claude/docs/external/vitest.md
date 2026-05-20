# Vitest 4 — Документация

> Пакет: `vitest` | Docs: https://vitest.dev
> Быстрый фреймворк тестирования на базе Vite

## Конфигурация

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true, // describe/it/expect без импорта
    environment: 'node', // 'node' | 'jsdom' | 'happy-dom'
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8', // 'v8' | 'istanbul'
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'src/generated/**'],
    },
  },
})
```

---

## Базовые тесты

```typescript
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('Calculator', () => {
  let calc: Calculator

  beforeEach(() => {
    calc = new Calculator()
  })

  afterEach(() => {
    // очистка
  })

  it('складывает числа', () => {
    expect(calc.add(2, 3)).toBe(5)
  })

  it.skip('пропущенный тест', () => {
    // не запускается
  })

  it.only('только этот тест', () => {
    // запускается только этот в этом describe
  })
})
```

---

## Матчеры expect

```typescript
// Примитивы
expect(42).toBe(42) // Object.is
expect(obj).toEqual({ a: 1 }) // глубокое сравнение
expect(obj).toStrictEqual({ a: 1 }) // строгое (класс, undefined)

// Строки
expect('hello').toContain('ell')
expect('hello').toMatch(/^hell/)
expect('hello').toHaveLength(5)

// Числа
expect(0.1 + 0.2).toBeCloseTo(0.3, 5)
expect(10).toBeGreaterThan(5)
expect(10).toBeGreaterThanOrEqual(10)
expect(3).toBeLessThan(10)

// Truthiness
expect(true).toBeTruthy()
expect('').toBeFalsy()
expect(null).toBeNull()
expect(undefined).toBeUndefined()
expect(42).toBeDefined()
expect(NaN).toBeNaN()

// Массивы / объекты
expect([1, 2, 3]).toContain(2)
expect([1, 2, 3]).toHaveLength(3)
expect({ a: 1, b: 2, c: 3 }).toMatchObject({ a: 1, b: 2 })
expect(arr).toEqual(expect.arrayContaining([1, 2]))

// Типы
expect('str').toBeTypeOf('string')
expect([]).toBeInstanceOf(Array)

// Ошибки
expect(() => {
  throw new Error('oops')
}).toThrow('oops')
expect(() => {
  throw new TypeError()
}).toThrowError(TypeError)

// Один из вариантов
expect('red').toBeOneOf(['red', 'green', 'blue'])

// Негация
expect(42).not.toBe(0)
```

---

## Async тесты

```typescript
import { expect, it } from 'vitest'

// async/await
it('загружает пользователя', async () => {
  const user = await fetchUser(1)
  expect(user.name).toBe('Иван')
})

// Promise rejection
it('выбрасывает при не найденном', async () => {
  await expect(fetchUser(999)).rejects.toThrow('User 999 not found')
})

// Promise resolve
it('возвращает данные', async () => {
  await expect(fetchUser(1)).resolves.toMatchObject({ id: 1 })
})
```

---

## Mock-функции — vi.fn()

```typescript
import { expect, it, vi } from 'vitest'

it('создаёт мок-функцию', () => {
  const getApples = vi.fn()

  getApples()
  getApples('много')

  expect(getApples).toHaveBeenCalled()
  expect(getApples).toHaveBeenCalledTimes(2)
  expect(getApples).toHaveBeenCalledWith('много')
  expect(getApples).toHaveBeenNthCalledWith(1) // первый вызов без аргументов

  // Доступ к сырым данным
  console.log(getApples.mock.calls) // [[], ['много']]
  console.log(getApples.mock.results) // [{type:'return',value:undefined}, ...]
})

it('возвращает значение', () => {
  const fn = vi.fn()
  fn.mockReturnValue(42)
  fn.mockReturnValueOnce(100) // только для следующего вызова

  expect(fn()).toBe(100) // первый вызов
  expect(fn()).toBe(42) // все последующие
})

it('с реализацией', () => {
  const double = vi.fn((n: number) => n * 2)
  expect(double(5)).toBe(10)
  expect(vi.mocked(double)).toHaveBeenCalledWith(5)
})
```

---

## Мокинг модулей — vi.mock

```typescript
// ✅ vi.mock поднимается (hoisted) — выполняется до импортов
import { expect, it, vi } from 'vitest'
import { getUser } from './db.js'

vi.mock(import('./db.js'), () => ({
  getUser: vi.fn(),
}))

it('мокает модуль', () => {
  vi.mocked(getUser).mockReturnValue({ name: 'Alice' })
  const user = getUser(1)
  expect(user.name).toBe('Alice')
  expect(getUser).toHaveBeenCalledWith(1)
})

// ✅ Частичный мок — сохранить оригинал, переопределить часть
vi.mock(import('./math.js'), async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    multiply: vi.fn().mockReturnValue(0),
  }
})

// ✅ Шпион — отслеживать вызовы, не менять реализацию
vi.mock('./math.js', { spy: true })
it('шпионит за вызовами', () => {
  const result = add(2, 3) // вызывает оригинал
  expect(result).toBe(5)
  expect(add).toHaveBeenCalledWith(2, 3)
})
```

---

## vi.spyOn — шпион за методом

```typescript
import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks() // восстановить оригиналы
})

it('шпионит за методом', () => {
  const spy = vi.spyOn(console, 'log')

  console.log('тест')

  expect(spy).toHaveBeenCalledWith('тест')

  spy.mockReturnValue(undefined) // переопределить
  spy.mockRestore() // восстановить
})

// Спрятать вывод в тестах
it('без консоли', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  // ...
})
```

---

## Таймеры — vi.useFakeTimers

```typescript
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('задержка', async () => {
  let called = false
  setTimeout(() => {
    called = true
  }, 1000)

  vi.advanceTimersByTime(1000) // перемотать 1 секунду

  expect(called).toBe(true)
})

it('все таймеры', async () => {
  vi.runAllTimers() // запустить все ожидающие
  vi.runAllTimersAsync() // включая async (Promise-based)
})

// Мок текущего времени
it('фиксированное время', () => {
  vi.setSystemTime(new Date('2024-01-01'))
  expect(new Date().getFullYear()).toBe(2024)
})
```

---

## Снапшоты

```typescript
it('снапшот объекта', () => {
  expect({ name: 'letar', version: 1 }).toMatchSnapshot()
})

// Inline snapshot — хранится прямо в тесте
it('inline снапшот', () => {
  expect({ name: 'letar' }).toMatchInlineSnapshot(`
    {
      "name": "letar",
    }
  `)
})
```

---

## expect.soft — мягкие проверки

```typescript
it('много проверок', () => {
  const user = fetchUser()

  // Не останавливает тест при падении
  expect.soft(user.name).toBe('Иван')
  expect.soft(user.email).toContain('@')
  expect.soft(user.role).toBe('admin')

  // Обычный expect — останавливает при падении
  expect(user.id).toBeDefined()
})
```

---

## Конфигурация среды

```typescript
// vitest.config.ts — среда jsdom для React-тестов
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})

// src/test/setup.ts
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

---

## Паттерны в letar

```typescript
// libs/forms/src/utils.test.ts
import { describe, expect, it, vi } from 'vitest'
import { mapServerErrors } from './map-errors'

describe('mapServerErrors', () => {
  it('маппит ошибки сервера на поля формы', () => {
    const serverErrors = { 'user.email': ['Уже занят'] }
    const result = mapServerErrors(serverErrors)
    expect(result).toMatchObject({
      email: { _errors: ['Уже занят'] },
    })
  })

  it('возвращает пустой объект если нет ошибок', () => {
    expect(mapServerErrors({})).toEqual({})
  })
})

// apps/driving-school/src/lib/utils.test.ts
import { describe, expect, it } from 'vitest'
import { formatDate } from './utils'

describe('formatDate', () => {
  it('форматирует дату по-русски', () => {
    const date = new Date('2024-03-15')
    expect(formatDate(date, 'ru')).toBe('15 марта 2024 г.')
  })
})
```

---

## Команды

```bash
# Запуск
nx test <app>              # запустить тесты приложения
nx test:watch <app>        # watch-режим
nx test:coverage <app>     # с покрытием

# Или напрямую
vitest run                 # один прогон
vitest                     # watch-режим
vitest --coverage          # с покрытием
vitest --reporter=verbose  # подробный вывод
```

---

## Ссылки

- Docs: https://vitest.dev
- GitHub: https://github.com/vitest-dev/vitest
- Config API: https://vitest.dev/config/
