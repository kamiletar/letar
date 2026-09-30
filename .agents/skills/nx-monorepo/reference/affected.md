# Affected

Запуск задач только для изменённых проектов.

---

## Как работает affected

1. Nx сравнивает Git коммиты (base vs head)
2. Определяет изменённые файлы
3. Через project graph находит затронутые проекты
4. Запускает задачи только для них

```
Git diff → changed files → project graph → affected projects → run tasks
```

---

## Базовое использование

```bash
# Сравнение с main (по умолчанию)
nx affected -t build
nx affected -t test
nx affected -t lint

# Несколько задач
nx affected -t lint test build
```

---

## Указание base/head

```bash
# Явное указание веток
nx affected -t build --base=main --head=HEAD

# Сравнение с предыдущим коммитом
nx affected -t build --base=HEAD~1 --head=HEAD

# Сравнение конкретных коммитов
nx affected -t build --base=abc123 --head=def456

# Сравнение с origin
nx affected -t build --base=origin/main --head=origin/develop
```

---

## Переменные окружения

Альтернатива флагам:

```bash
export NX_BASE=origin/main
export NX_HEAD=HEAD
nx affected -t test
```

---

## Визуализация

```bash
# Граф затронутых проектов
nx affected:graph

# Список затронутых проектов
nx print-affected --select=projects

# JSON с деталями
nx print-affected
```

---

## CI конфигурация

### GitHub Actions

```yaml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Важно! Нужна полная история

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: Install dependencies
        run: bun install

      - name: Run affected tests
        run: npx nx affected -t test --base=origin/main --head=${{ github.sha }}
```

### GitLab CI

```yaml
test:
  script:
    - npx nx affected -t test --base=origin/main --head=$CI_COMMIT_SHA
```

---

## Nx Cloud: последний успешный коммит

Вместо сравнения с main, можно сравнивать с последним успешным CI run:

```bash
# Nx Cloud автоматически отслеживает успешные коммиты
nx affected -t test --base=last-successful-commit

# Или через переменную
NX_BASE=last-successful-commit nx affected -t test
```

Преимущества:

- Не пропускает изменения между успешными main коммитами
- Более точное определение affected
- Требует Nx Cloud

---

## Affected vs Run-Many

| Команда               | Когда использовать                 |
| --------------------- | ---------------------------------- |
| `nx affected -t test` | CI — тестировать только изменённое |
| `nx run-many -t test` | Локально — тестировать всё         |

### В CI

```bash
# ✅ Экономит время
nx affected -t test --base=origin/main

# ❌ Тестирует всё — долго
nx run-many -t test
```

### Локально

```bash
# Быстрая проверка изменений
nx affected -t lint test --base=HEAD~1

# Полная проверка перед push
nx run-many -t lint test
```

---

## Гранулярность проектов

Эффективность affected зависит от структуры проектов:

```
❌ Один проект с 100 тестами:
   Изменение → все 100 тестов запускаются

✅ 10 проектов по 10 тестов:
   Изменение → только 10 тестов затронутого проекта
```

### Best Practice

- Выделяй библиотеки для переиспользуемого кода
- Мелкие проекты = более точный affected
- Используй `implicitDependencies` для невидимых зависимостей

---

## implicitDependencies

Nx не всегда может определить зависимости автоматически:

```json
// project.json
{
  "implicitDependencies": ["@letar/chakra-provider", "@letar/yandex-metrika"]
}
```

Когда нужны:

- Runtime зависимости (не импортируются напрямую)
- Глобальные стили/конфиги
- Shared environment variables

---

## Отладка affected

### Почему проект не в affected?

```bash
# 1. Проверь граф зависимостей
nx graph

# 2. Посмотри какие проекты affected
nx print-affected --select=projects

# 3. Проверь implicitDependencies
```

### Почему слишком много проектов в affected?

```bash
# 1. Возможно изменён глобальный файл
git diff --name-only origin/main

# 2. Проверь sharedGlobals в nx.json
# Изменение tsconfig.base.json затрагивает всё
```

---

## См. также

- [caching.md](caching.md) — Кэширование результатов
- [project-structure.md](project-structure.md) — Структура проектов
- [commands.md](commands.md) — Все команды
