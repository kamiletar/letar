# Vitest паттерны

## TDD методология

Red → Green → Refactor:

1. **Red** — напиши падающий тест
2. **Green** — напиши минимум кода для прохождения
3. **Refactor** — улучши код, сохраняя зелёные тесты

## Структура теста

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('ProductService', () => {
  let service: ProductService

  beforeEach(() => {
    service = new ProductService()
  })

  describe('create', () => {
    it('создаёт продукт с валидными данными', async () => {
      const result = await service.create({ name: 'Test', price: 100 })

      expect(result).toMatchObject({
        name: 'Test',
        price: 100,
      })
    })

    it('выбрасывает ошибку при пустом имени', async () => {
      await expect(service.create({ name: '', price: 100 })).rejects.toThrow('Name is required')
    })
  })
})
```

## Моки

### Мок функции

```typescript
const mockFn = vi.fn()
mockFn.mockReturnValue('value')
mockFn.mockResolvedValue('async value')
mockFn.mockImplementation((x) => x * 2)
```

### Мок модуля

```typescript
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => ({
    product: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: '1' }),
    },
  })),
}))
```

### Частичный мок

```typescript
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual('@/lib/auth')
  return {
    ...actual,
    auth: vi.fn().mockResolvedValue({ user: { id: '1' } }),
  }
})
```

## Тестирование хуков

```typescript
import { act, renderHook } from '@testing-library/react'
import { useCounter } from './useCounter'

it('инкрементирует счётчик', () => {
  const { result } = renderHook(() => useCounter())

  act(() => {
    result.current.increment()
  })

  expect(result.current.count).toBe(1)
})
```

## Тестирование компонентов

```typescript
import { fireEvent, render, screen } from '@testing-library/react'
import { Button } from './Button'

it('вызывает onClick при клике', () => {
  const onClick = vi.fn()
  render(<Button onClick={onClick}>Click me</Button>)

  fireEvent.click(screen.getByRole('button'))

  expect(onClick).toHaveBeenCalledTimes(1)
})
```

## Snapshot тесты

```typescript
it('рендерит корректный HTML', () => {
  const { container } = render(<ProductCard product={mockProduct} />)
  expect(container).toMatchSnapshot()
})
```

## Асинхронные тесты

```typescript
it('загружает данные', async () => {
  const result = await loadData()
  expect(result).toBeDefined()
})

it('ждёт появления элемента', async () => {
  render(<AsyncComponent />)
  await screen.findByText('Loaded')
})
```

## Таймеры

```typescript
it('дебаунсит вызовы', async () => {
  vi.useFakeTimers()
  const callback = vi.fn()
  const debounced = debounce(callback, 100)

  debounced()
  debounced()
  debounced()

  expect(callback).not.toHaveBeenCalled()

  vi.advanceTimersByTime(100)

  expect(callback).toHaveBeenCalledTimes(1)
  vi.useRealTimers()
})
```

## Setup и Teardown

```typescript
beforeAll(async () => {
  // Один раз перед всеми тестами
  await setupDatabase()
})

afterAll(async () => {
  // Один раз после всех тестов
  await cleanupDatabase()
})

beforeEach(() => {
  // Перед каждым тестом
  vi.clearAllMocks()
})

afterEach(() => {
  // После каждого теста
  vi.restoreAllMocks()
})
```

## Команды

```bash
# Запуск всех тестов
nx test <app>

# Watch режим
nx test <app> --watch

# С покрытием
nx test <app> --coverage

# Конкретный файл
nx test <app> -- --testPathPattern="product.spec"
```
