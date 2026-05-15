# Electron + SQLite: Миграции БД

## Проблема

В Electron-приложениях с автообновлениями (Electron Updater) стандартные инструменты миграций не работают:

- `prisma migrate deploy` требует CLI — **отсутствует у пользователя**
- `zenstack migrate` — то же самое
- Native SQLite модули (better-sqlite3) требуют `electron-rebuild`

## Решение: Prisma Migrate + sql.js (Рекомендуемый)

### Почему sql.js?

- **WASM** — нет native модулей, нет проблем компиляции
- **Кроссплатформенность** — работает на Windows, macOS, Linux
- **Достаточно для миграций** — выполнить SQL файлы при запуске

### Архитектура

```
Development:
  schema.zmodel → zenstack generate → schema.prisma → prisma migrate dev → SQL файлы

Production (Electron):
  SQL файлы из prisma/migrations/ → sql.js применяет → SQLite БД
```

```
main/background.ts
├── applyPrismaMigrations(dbPath)   # Применяет SQL файлы через sql.js
└── initializeDatabase()            # Копирует template.db + вызывает applyPrismaMigrations()

resources/
├── template.db                     # Шаблон БД для новых установок
└── migrations/                     # SQL файлы (копируются при билде)
    └── 20260111_init/
        └── migration.sql
```

### Таблица \_prisma_migrations

Prisma-совместимая таблица для отслеживания применённых миграций:

```sql
CREATE TABLE _prisma_migrations (
  id                  TEXT PRIMARY KEY,
  checksum            TEXT NOT NULL,
  finished_at         TEXT,
  migration_name      TEXT NOT NULL,
  logs                TEXT,
  rolled_back_at      TEXT,
  started_at          TEXT NOT NULL DEFAULT (datetime('now')),
  applied_steps_count INTEGER NOT NULL DEFAULT 0
);
```

### Функция applyPrismaMigrations()

Ключевые шаги:

1. **Создать таблицу** `_prisma_migrations` если не существует
2. **Backward compatibility**: старые БД с `user_version >= 5` помечаются как `0_baseline`
3. **Получить применённые**: `SELECT migration_name FROM _prisma_migrations`
4. **Читать SQL файлы** из `resources/migrations/`
5. **Применить новые**: выполнить SQL, записать в `_prisma_migrations`
6. **Бэкап**: создаётся перед каждой миграцией

Реализация в `apps/animatrona/main/background.ts`.

## Воркфлоу изменения схемы

### Development (быстрые итерации)

```bash
# 1. Редактировать schema.zmodel
# 2. Сгенерировать и применить
nx zenstack:generate animatrona && nx db:push animatrona
```

### Production (перед релизом)

```bash
# 1. Редактировать schema.zmodel
# 2. Создать миграцию (автоматически обновит template.db)
nx db:migrate animatrona -- --name add_new_feature
# 3. Коммитить: schema.zmodel + prisma/migrations/*
```

## Nx команды

| Команда                                      | Когда использовать                              |
| -------------------------------------------- | ----------------------------------------------- |
| `nx zenstack:generate animatrona`            | После изменения schema.zmodel                   |
| `nx db:push animatrona`                      | Dev: быстрое обновление БД без миграции         |
| `nx db:migrate animatrona -- --name feature` | **Production: создать миграцию**                |
| `nx db:reset animatrona`                     | Сбросить БД и применить все миграции            |
| `nx db:template animatrona`                  | Обновить template.db (вызывается автоматически) |

## При автообновлении у пользователя

1. Electron Updater загружает новую версию
2. Приложение запускается
3. `applyPrismaMigrations()` читает SQL из `resources/migrations/`
4. Новые миграции применяются, записываются в `_prisma_migrations`
5. ZenStack ORM работает с обновлённой схемой

## Backward compatibility

Старые БД с `PRAGMA user_version >= 5` автоматически помечаются как `0_baseline` при первом запуске новой версии. Это позволяет плавно перейти на Prisma Migrate без потери данных.

## Структура файлов

```
apps/animatrona/
├── schema.zmodel              # Источник истины
├── prisma/
│   ├── data/app.db           # Dev база данных
│   └── migrations/           # SQL миграции
│       └── 20260111_init/
│           └── migration.sql
├── resources/
│   └── template.db           # Шаблон для новых установок
└── main/
    └── background.ts         # applyPrismaMigrations()
```

## Ограничения SQLite ALTER TABLE

SQLite не поддерживает:

- `DROP COLUMN` (до SQLite 3.35.0)
- `RENAME COLUMN` (до SQLite 3.25.0)
- Изменение типа колонки

Для сложных миграций используй паттерн "создать новую таблицу -> скопировать данные -> удалить старую -> переименовать":

```sql
CREATE TABLE Settings_new (...);
INSERT INTO Settings_new SELECT ... FROM Settings;
DROP TABLE Settings;
ALTER TABLE Settings_new RENAME TO Settings;
```

---

## Устаревший подход: PRAGMA user_version

> **Deprecated:** Этот подход использовался ранее, но заменён на Prisma Migrate + sql.js.

```typescript
// Старый подход — НЕ ИСПОЛЬЗОВАТЬ в новых проектах
const DB_SCHEMA_VERSION = 1

function getMigrationSQL(version: number): string | null {
  const migrations: Record<number, string> = { 1: 'SELECT 1;' }
  return migrations[version] ?? null
}

db.run(`PRAGMA user_version = ${DB_SCHEMA_VERSION}`)
```

Недостатки:

- Миграции хардкодятся в TypeScript
- Нет совместимости с Prisma CLI
- Сложно отслеживать применённые миграции

---

## Примеры в проекте

- **Animatrona** — `apps/animatrona/main/background.ts`
- **Документация** — `apps/animatrona/CLAUDE.md`

---

**Обновлено:** 2026-01-11
