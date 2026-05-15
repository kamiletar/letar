# Test Write - Написание тестов

Напиши тесты по методологии TDD (Red → Green → Refactor).

## Когда использовать

- Перед написанием новой функциональности (TDD)
- Для покрытия существующего кода
- После исправления бага (регрессионный тест)

## Типы тестов

### Unit тесты (Vitest)

```bash
nx test <app>
nx test <app> --watch
nx test <app> --coverage
```

### E2E тесты (Playwright)

```bash
nx e2e <app>-e2e
nx e2e <app>-e2e --ui
```

## TDD Workflow

1. **Red** — Напиши падающий тест

   ```typescript
   it('should calculate total correctly', () => {
     expect(calculateTotal([100, 200])).toBe(300)
   })
   ```

2. **Green** — Напиши минимальный код для прохождения

   ```typescript
   function calculateTotal(items: number[]) {
     return items.reduce((sum, item) => sum + item, 0)
   }
   ```

3. **Refactor** — Улучши код, сохраняя тесты зелёными

## Паттерны тестирования

### Компоненты React

```typescript
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'

it('should show error on invalid input', async () => {
  render(<MyForm />)
  await userEvent.type(screen.getByRole('textbox'), 'invalid')
  await userEvent.click(screen.getByRole('button'))
  expect(screen.getByText(/ошибка/i)).toBeInTheDocument()
})
```

### Server Actions

```typescript
import { myAction } from './actions'

it('should return data', async () => {
  const result = await myAction({ input: 'test' })
  expect(result.success).toBe(true)
})
```

### ZenStack/Prisma (mock)

```typescript
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findMany: vi.fn().mockResolvedValue([{ id: 1 }]),
    },
  },
}))
```

## Чеклист

- [ ] Тест понятно описывает поведение
- [ ] Тестируются edge cases
- [ ] Нет flaky тестов
- [ ] Покрытие критичных путей

## После написания тестов

1. Обнови PLAN_TESTING.md со статистикой
2. Запусти:
   ```bash
   nx test <app> --coverage
   ```
