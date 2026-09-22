---
paths: apps/**/*.spec.ts, apps/**/*.spec.tsx, apps/**/*-e2e/**, libs/**/*.spec.ts
---

# Правила для тестирования

## TDD методология

1. **Red** — напиши тест, который падает
2. **Green** — напиши минимальный код для прохождения
3. **Refactor** — улучши код, сохраняя тесты зелёными

## Unit/Integration тесты (Vitest)

```typescript
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

describe('MyComponent', () => {
  it('отображает заголовок', () => {
    render(<MyComponent title="Тест" />)
    expect(screen.getByText('Тест')).toBeInTheDocument()
  })
})
```

## E2E тесты (Playwright)

```typescript
import { expect, test } from '@playwright/test'

test('пользователь может войти', async ({ page }) => {
  await page.goto('/signin')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
})
```

## Команды

```bash
nx test <app-name>              # Unit тесты
nx e2e <app-name>-e2e           # E2E тесты — точечно, при разработке/отладке (см. ниже)
nx e2e <app-name>-e2e -- --project=chromium  # Только Chromium
```

## ⚠️ Где запускать e2e — полный прогон на s1, не на рабочей машине

**Полный прогон набора** (весь `*-e2e`, не один спек) — через MCP `letar`:

```
deploy_app({ app: "<app-name>", target: "staging" })   # если staging ещё не свежий
run_e2e({ app: "<app-name>", baseUrl: "https://<app-name>-stage.s1.letar.best" })
e2e_status({ app: "<app-name>" })                      # опрос прогресса/результата
```

Playwright реально выполняется на s1, не на машине агента — `run_e2e` только отправляет запрос и
опрашивается через `e2e_status`. Причина: полный прогон, особенно на крупных приложениях
(`domwellbes` и т.п.), надолго нагружает CPU/RAM локальной машины владельца, пока параллельно
могут идти другие задачи других агентов — рабочий компьютер не должен подвисать из-за фонового
e2e. `baseUrl` — **всегда** реальный публичный HTTPS-домен, никогда `localhost` (см.
[e2e-testing.md](/.claude/docs/e2e-testing.md) — иначе Playwright тихо поднимет свой локальный
dev-сервер и прогон окажется ложным).

**Локальный `nx e2e <app>-e2e`** — только для разработки и отладки: написание нового теста,
точечная проверка одного файла-спека или сценария после фикса (`--grep`/`-- --project=chromium`),
итеративный цикл правка→прогон. Здесь локально быстрее и удобнее, чем гонять по серверам ради
одного теста — `run_e2e` тоже поддерживает `grep` для точечного прогона на s1, если нужно
подтвердить фикс именно там (например, после деплоя), но для живой отладки со стороны агента
локальный прогон предпочтительнее.

## Документирование

- **MUST** обновлять `PLAN_TESTING.md` при добавлении тестов
- **SHOULD** отмечать фазы тестирования как выполненные

## Документация

→ **Skill: `test-generator`** — паттерны Vitest и Playwright
→ См. `.claude/docs/e2e-testing.md` для особенностей WebKit и Portal компонентов
