# Troubleshooting

Распространённые проблемы и их решения.

---

## Общие проблемы

### Очистка кэша и daemon

```bash
# Полный сброс (первое что нужно попробовать)
nx reset

# Только остановить daemon
nx daemon --stop

# Только очистить кэш
rm -rf .nx/cache
```

### Daemon не запускается

```bash
# Проверить статус
nx daemon

# Отключить daemon (если проблемы)
NX_DAEMON=false nx build premium-rosstil
```

Постоянное отключение в nx.json:

```json
{
  "daemon": { "enabled": false }
}
```

---

## Проблемы с кэшем

### Задача не перезапускается после изменений

```bash
# 1. Проверь inputs в target
nx show project premium-rosstil --json | jq '.targets.build.inputs'

# 2. Пропусти кэш для теста
nx build premium-rosstil --skip-nx-cache

# 3. Проверь что файл входит в inputs
# Возможно нужно добавить файл в inputs
```

### Кэш не восстанавливается

```bash
# 1. Проверь outputs
nx show project premium-rosstil --json | jq '.targets.build.outputs'

# 2. Убедись что папки outputs существуют после сборки
ls apps/premium-rosstil/.next

# 3. Возможно outputs указаны неверно
```

### Слишком часто инвалидируется

Проверь что в inputs нет лишних файлов:

```json
// ❌ Логи и временные файлы влияют на кэш
{
  "inputs": ["{projectRoot}/**/*"]
}

// ✅ Только исходники
{
  "inputs": [
    "{projectRoot}/src/**/*",
    "{projectRoot}/tsconfig.json"
  ]
}
```

---

## Проблемы с типами

### TS6059: File is not under 'rootDir'

```bash
# Добавь references в tsconfig.json
nx sync

# Или вручную:
```

```json
// apps/my-app/tsconfig.json
{
  "references": [{ "path": "../../libs/my-lib" }]
}
```

### Cannot find module '@letar/...'

```bash
# 1. Проверь path alias в tsconfig.base.json
cat tsconfig.base.json | jq '.compilerOptions.paths'

# 2. Убедись что библиотека собрана (если buildable)
nx build @letar/my-lib

# 3. Возможно нужно добавить alias:
```

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "paths": {
      "@letar/my-lib": ["libs/my-lib/src/index.ts"]
    }
  }
}
```

### Type errors в зависимостях

```bash
# Пересобрать все зависимости
nx run-many -t build --all

# Или для конкретного проекта с зависимостями
nx build premium-rosstil --skip-nx-cache
```

---

## Проблемы с affected

### Проект не в affected хотя должен быть

```bash
# 1. Проверь граф зависимостей
nx graph

# 2. Возможно нужен implicitDependencies
```

```json
// project.json
{
  "implicitDependencies": ["@letar/missing-lib"]
}
```

### Слишком много проектов в affected

```bash
# 1. Проверь какие файлы изменились
git diff --name-only origin/main

# 2. Возможно изменён глобальный файл
# tsconfig.base.json, nx.json — затрагивают всё

# 3. Проверь sharedGlobals
cat nx.json | jq '.namedInputs.sharedGlobals'
```

---

## Проблемы с плагинами

### Inferred targets не появляются

```bash
# 1. Проверь что плагин в nx.json
cat nx.json | jq '.plugins'

# 2. Проверь что конфиг-файл существует
ls apps/my-app/next.config.js

# 3. Сбрось кэш плагинов
nx reset
```

### Конфликт имён targets

```json
// nx.json — переименуй target
{
  "plugins": [
    {
      "plugin": "@nx/next/plugin",
      "options": {
        "buildTargetName": "next-build" // вместо "build"
      }
    }
  ]
}
```

---

## Проблемы с зависимостями

### Circular dependency detected

```bash
# 1. Визуализация циклов
nx graph

# 2. Найди и разорви цикл:
# - Выдели общий код в отдельную библиотеку
# - Используй dependency injection
# - Разбей библиотеку на части
```

### Module boundary violation

```
A project tagged with "scope:premium" can only depend on
projects tagged with "scope:shared" or "scope:premium"
```

Решения:

1. Добавь правильный тег в зависимость
2. Выдели общий код в shared библиотеку
3. Обнови depConstraints в eslint.config.mjs

---

## Проблемы производительности

### Медленный nx graph

```bash
# Используй daemon (должен быть включён по умолчанию)
NX_DAEMON=true nx graph

# Увеличь память Node.js
NODE_OPTIONS="--max-old-space-size=8192" nx graph
```

### Медленный CI

1. **Remote caching** — подключи Nx Cloud
2. **affected** — используй вместо run-many
3. **parallel** — увеличь в nx.json
4. **Мелкие проекты** — разбей большие

```json
// nx.json
{
  "parallel": 5,
  "nxCloudId": "your-cloud-id"
}
```

---

## Отладка

### Подробный вывод

```bash
nx build premium-rosstil --verbose
```

### Информация о workspace

```bash
nx report
```

### Детали проекта

```bash
nx show project premium-rosstil
nx show project premium-rosstil --json
```

### Граф зависимостей

```bash
# В браузере
nx graph

# В JSON
nx graph --file=graph.json
```

### Какие проекты affected

```bash
nx print-affected --select=projects
nx print-affected --base=main --json
```

---

## Частые ошибки

### "Cannot find project 'xxx'"

```bash
# Проект не существует или неправильное имя
nx show projects | grep xxx

# Проверь project.json
cat apps/xxx/project.json | jq '.name'
```

### "Target 'xxx' not found"

```bash
# Проверь доступные targets
nx show project premium-rosstil --json | jq '.targets | keys'

# Возможно target от плагина — проверь plugins в nx.json
```

### "No projects to run"

```bash
# run-many не нашёл проекты с таким target
# Проверь что target существует хотя бы в одном проекте
nx show project premium-rosstil | grep xxx
```

---

## Полезные команды

```bash
# Статус workspace
nx report

# Все проекты
nx show projects

# Детали проекта
nx show project <name>

# Граф зависимостей
nx graph

# Очистить всё
nx reset

# Синхронизировать references
nx sync
```

---

## См. также

- [caching.md](caching.md) — Детали кэширования
- [affected.md](affected.md) — Affected команды
- [plugins.md](plugins.md) — Настройка плагинов
