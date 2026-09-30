# Commands

Основные команды Nx для управления монорепо.

---

## Запуск задач

### Одна задача

```bash
nx <target> <project>
nx build premium-rosstil
nx dev imot
nx lint driving-school
```

### С опциями

```bash
nx build premium-rosstil --skip-nx-cache    # Пропустить кэш
nx dev premium-rosstil -- --hostname 0.0.0.0 # Опции для Next.js
```

### Множественные задачи

```bash
nx run-many -t <target>              # Все проекты
nx run-many -t build test            # Несколько задач
nx run-many -t build -p app1,app2    # Конкретные проекты
nx run-many -t lint --parallel=5     # Параллельность
```

### Affected (только изменённые)

```bash
nx affected -t test
nx affected -t build --base=main --head=HEAD
nx affected:graph                    # Граф затронутых
```

---

## Форматирование

⛔ **`nx format`/`nx format:write`/`nx format:check` (без `run-many -t`) — ВСТРОЕННАЯ команда Nx,
жёстко зашитая на Prettier изнутри пакета `nx` (не настраивается на dprint, `NX_SKIP_FORMAT` её не
гасит — это разные механизмы). Prettier физически лежит в `node_modules` как транзитивная
зависимость, поэтому команда отрабатывает молча и без ошибок — выглядит как «сработало», но
переписывает код в чужой стиль. НИКОГДА не запускать напрямую.

### dprint — единственный форматтер (используется в проекте Letar)

```bash
nx run-many -t format --projects=<project>   # target из project.json → dprint fmt
nx run-many -t format --projects=<p1>,<p2>   # несколько проектов
```

Прогон по всему публичному репо (не submodule) — `dprint fmt` из корня репозитория (не через
`nx run-many` без `--projects`, см. корневой `CLAUDE.md`).

**Конфигурация target в project.json:**

```json
{
  "format": {
    "executor": "nx:run-commands",
    "options": {
      "command": "bunx dprint fmt \"**/*.{ts,tsx,js,jsx,json,md}\"",
      "cwd": "apps/premium-rosstil"
    },
    "cache": false
  },
  "format:check": {
    "executor": "nx:run-commands",
    "options": {
      "command": "bunx dprint check \"**/*.{ts,tsx,js,jsx,json,md}\"",
      "cwd": "apps/premium-rosstil"
    },
    "cache": true,
    "inputs": ["default", "{workspaceRoot}/dprint.json"]
  }
}
```

---

## Линтинг

```bash
nx lint <project>           # oxlint + ESLint (fast-fail)
nx lint <project> -- --fix  # ESLint с автофиксом
nx oxlint <project>         # Только oxlint (~50-100x быстрее)
```

> ℹ️ `lint` target автоматически запускает `oxlint` первым (dependsOn). Если oxlint находит ошибки — ESLint не запускается.

---

## Проверка типов

```bash
nx typecheck:tsgo <project>  # tsgo (9-38x быстрее tsc!)
nx typecheck <project>       # Стандартный tsc
```

---

## Визуализация

```bash
nx graph                     # Полный граф зависимостей
nx graph --affected          # Только затронутые проекты
nx show project <name>       # Детали проекта (targets, deps)
nx show project <name> --web # Открыть в браузере
```

---

## Утилиты

```bash
nx reset                     # Очистить кэш и перезапустить daemon
nx report                    # Информация о workspace
nx daemon                    # Статус daemon
nx daemon --stop             # Остановить daemon
```

---

## Генераторы

```bash
nx generate @nx/next:app my-app        # Новое Next.js приложение
nx generate @nx/react:lib my-lib       # Новая React библиотека
nx generate @nx/next:page --path=...   # Новая страница
nx g @nx/eslint:convert-to-inferred    # Миграция на inferred targets
```

---

## Флаги

| Флаг                   | Описание                      |
| ---------------------- | ----------------------------- |
| `--skip-nx-cache`      | Пропустить кэш                |
| `--parallel=N`         | Количество параллельных задач |
| `--verbose`            | Подробный вывод               |
| `--dry-run`            | Показать что будет выполнено  |
| `--projects=a,b`       | Конкретные проекты            |
| `--exclude=a,b`        | Исключить проекты             |
| `--configuration=prod` | Использовать конфигурацию     |

---

## CI команды

```bash
# GitHub Actions
nx affected -t test --base=origin/main --head=$GITHUB_SHA

# С Nx Cloud (последний успешный коммит)
nx affected -t test --base=last-successful-commit

# Переменные окружения (альтернатива флагам)
NX_BASE=origin/main
NX_HEAD=HEAD
```

---

## См. также

- [configuration.md](configuration.md) — nx.json, project.json
- [affected.md](affected.md) — Подробнее о affected
- [caching.md](caching.md) — Кэширование
