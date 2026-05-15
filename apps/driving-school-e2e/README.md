# E2E тесты driving-school

Playwright E2E тесты для приложения driving-school.

## Запуск тестов

```bash
# Все тесты
nx e2e driving-school-e2e

# Конкретный файл
nx e2e driving-school-e2e -- --grep "Чаты"

# С UI
nx e2e driving-school-e2e -- --ui
```

### Shards (выборочный запуск по модулям)

Для экономии RAM при отладке отдельных модулей:

```bash
nx e2e:core driving-school-e2e      # auth, profiles, errors (00-03)
nx e2e:schedule driving-school-e2e  # schedule, lessons (04-07)
nx e2e:school driving-school-e2e    # school admin (08, 09, 19, 22, 25, 27, 30)
nx e2e:platform driving-school-e2e  # settings, theory, chats (10-18)
nx e2e:features driving-school-e2e  # lesson types, mobile (20-26)
```

Альтернативно через `--project`:

```bash
nx e2e driving-school-e2e -- --project=shard-core
nx e2e driving-school-e2e -- --project=shard-schedule
```

### CI Sharding

```bash
# Для параллельного запуска на разных runners
nx e2e driving-school-e2e -- --shard=1/5
nx e2e driving-school-e2e -- --shard=2/5
```

## Структура

```
src/
├── fixtures/
│   ├── auth.setup.ts      # Настройка авторизации
│   ├── base-test.ts       # Базовый test с SSE blocking
│   └── test-data.ts       # Тестовые данные и URLs
├── helpers/
│   ├── db.helpers.ts      # Хелперы для БД
│   └── mailhog.helpers.ts # Хелперы для email
├── *.spec.ts              # Тестовые файлы
└── global-setup.ts        # Глобальная настройка
```

## Особенности

### SSE блокировка

Приложение использует SSE (Server-Sent Events) для real-time уведомлений. SSE соединения никогда не закрываются, что приводит к зависанию тестов на timeout.

**Решение:** Все spec файлы импортируют `test` из `./fixtures/base-test` вместо `@playwright/test`. Базовый test автоматически блокирует SSE endpoints:

```typescript
// Правильный импорт
import { expect, test } from './fixtures/base-test'

// НЕ использовать напрямую
// import { expect, test } from '@playwright/test'
```

Блокируемые endpoints:

- `**/api/chats/unread-stream/**`
- `**/api/auth/verification-stream/**`
- `**/api/auth/reset-stream/**`

### Авторизация

Тесты используют pre-configured storage state для разных ролей:

- **student** — ученик
- **instructor** — инструктор
- **school-admin** — администратор школы
- **owner** — владелец платформы

Storage state настраивается в `auth.setup.ts` и сохраняется в `.auth/`.

### WebKit особенности

WebKit имеет отличия в работе с Portal компонентами Chakra UI. См. `.claude/docs/e2e-testing.md` для деталей.

## Создание новых тестов

1. Создай файл `XX-feature.role.spec.ts`
2. Импортируй из `./fixtures/base-test`:
   ```typescript
   import { expect, test } from './fixtures/base-test'
   import { urls } from './fixtures/test-data'
   ```
3. Используй `urls` для навигации
4. Используй `test.describe` для группировки

## Диагностика

Если тесты зависают — проверь что импорт идёт из `./fixtures/base-test`, а не из `@playwright/test`.
