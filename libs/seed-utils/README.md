# @letar/seed-utils

Безопасный запуск `prisma/seed.ts` — единственная функция `runSeed`.

## Проблема, которую решает

```typescript
// ❌ Опасный паттерн — маскирует ошибку сида кодом выхода 0
main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => process.exit(0)) // ← перебивает exit(1) из .catch(), пока жив pg.Pool
```

Пока открыт `pg.Pool`/Prisma-клиент, event loop жив, и `.finally()` успевает отработать
**после** `.catch()`. Безусловный `process.exit(0)` там перебивает код выхода 1 обратно на 0 —
деплой-лог показывает «успех» при упавшем сиде. Найден и исправлен независимо трижды (kami,
domwellbes, studio, 2026-08-21) до того, как был вынесен сюда.

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { runSeed } from '@letar/seed-utils'
```

## API

### `runSeed(main, disconnect)`

- `main: () => Promise<void>` — тело сида.
- `disconnect: () => Promise<void>` — закрытие соединения с БД (`prisma.$disconnect()`,
  `pool.end()` и т.п.), вызывается всегда, даже при ошибке.

При ошибке в `main` пишет её в `console.error` и выставляет `process.exitCode = 1` (не вызывает
`process.exit()` — Node сам завершится нужным кодом после `disconnect()`).

```typescript
// apps/<app>/prisma/seed.ts
import { runSeed } from '@letar/seed-utils'

async function main() {
  // ...сидирование
}

void runSeed(main, () => prisma.$disconnect())
```

## Команды

```bash
nx test seed-utils
nx lint seed-utils
nx typecheck:tsgo seed-utils
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/seed-utils` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/seed-utils` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
