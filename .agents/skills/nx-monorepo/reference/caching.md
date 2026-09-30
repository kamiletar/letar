# Caching

Кэширование результатов задач в Nx.

---

## Как работает кэширование

1. Nx вычисляет hash на основе inputs
2. Если hash совпадает с предыдущим запуском — результат из кэша
3. Если hash отличается — выполняет задачу и сохраняет результат

```
inputs → hash → cache lookup → hit? → restore outputs
                              miss? → run task → save outputs
```

---

## Inputs — что влияет на hash

```json
{
  "inputs": [
    "default", // Все файлы проекта
    "^production", // production файлы зависимостей
    "{projectRoot}/schema.zmodel", // Конкретный файл
    "{workspaceRoot}/.oxlintrc.json", // Глобальный файл
    { "env": "DATABASE_URL" }, // Переменная окружения
    { "runtime": "node -v" }, // Результат команды
    { "externalDependencies": ["next"] } // Версия npm пакета
  ]
}
```

### Типы inputs

| Тип              | Синтаксис                           | Пример                                 |
| ---------------- | ----------------------------------- | -------------------------------------- |
| Файлы проекта    | `{projectRoot}/...`                 | `{projectRoot}/src/**/*`               |
| Глобальные файлы | `{workspaceRoot}/...`               | `{workspaceRoot}/tsconfig.base.json`   |
| Named input      | `name`                              | `default`, `production`                |
| Deps input       | `^name`                             | `^production`                          |
| Env variable     | `{ "env": "VAR" }`                  | `{ "env": "NODE_ENV" }`                |
| Runtime          | `{ "runtime": "cmd" }`              | `{ "runtime": "node -v" }`             |
| External dep     | `{ "externalDependencies": [...] }` | `{ "externalDependencies": ["next"] }` |

---

## Outputs — что кэшируется

```json
{
  "outputs": [
    "{projectRoot}/dist", // Папка билда
    "{projectRoot}/.next", // Next.js cache
    "{projectRoot}/src/generated" // Генерируемые файлы
  ]
}
```

> ⚠️ Если outputs не указаны, Nx не может восстановить результат из кэша!

---

## namedInputs — переиспользуемые наборы

В nx.json:

```json
{
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/*.spec.ts",
      "!{projectRoot}/**/*.test.ts",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/.eslintrc.json",
      "!{projectRoot}/eslint.config.mjs",
      "!{projectRoot}/jest.config.ts"
    ],
    "sharedGlobals": ["{workspaceRoot}/tsconfig.base.json"]
  }
}
```

Использование:

```json
{
  "build": {
    "inputs": ["production", "^production"]
  }
}
```

---

## Когда кэш инвалидируется

Кэш сбрасывается когда:

1. **Изменились файлы** — любой файл из inputs
2. **Изменились зависимости** — файлы в `^` inputs
3. **Изменился env** — переменная окружения
4. **Изменился runtime** — результат команды (node -v)
5. **Изменился external dep** — версия npm пакета

---

## Remote Caching (Nx Cloud)

### Подключение

```bash
# Подключить Nx Cloud
npx nx connect

# Проверить статус
nx cloud
```

### Преимущества

После подключения кэш делится между:

- Локальными машинами разработчиков
- CI runners
- Членами команды

### Конфигурация

```json
// nx.json
{
  "nxCloudId": "your-cloud-id",
  "nxCloudAccessToken": "your-token" // Или через env NX_CLOUD_ACCESS_TOKEN
}
```

---

## Управление кэшем

### Очистка

```bash
# Полный сброс (кэш + daemon)
nx reset

# Только кэш
rm -rf .nx/cache
```

### Пропуск кэша

```bash
# Для одной команды
nx build premium-rosstil --skip-nx-cache

# Для всех команд (env)
NX_SKIP_NX_CACHE=true nx run-many -t build
```

### Просмотр кэша

```bash
# Содержимое кэша
ls .nx/cache

# Размер кэша
du -sh .nx/cache
```

---

## Best Practices

### 1. Точные inputs

```json
// ❌ Слишком широко — всё влияет на кэш
{
  "inputs": ["{workspaceRoot}/**/*"]
}

// ✅ Точно — только релевантные файлы
{
  "inputs": [
    "{projectRoot}/src/**/*",
    "{projectRoot}/tsconfig.json",
    "{workspaceRoot}/tsconfig.base.json"
  ]
}
```

### 2. Исключения для production

```json
// ✅ Тестовые файлы не влияют на build
{
  "namedInputs": {
    "production": ["default", "!{projectRoot}/**/*.spec.ts", "!{projectRoot}/**/*.test.ts"]
  }
}
```

### 3. External dependencies

```json
// ✅ Версия Next.js влияет на build
{
  "inputs": ["production", { "externalDependencies": ["next"] }]
}
```

### 4. Правильные outputs

```json
// ✅ Все генерируемые файлы/папки
{
  "outputs": ["{projectRoot}/.next", "{projectRoot}/out"]
}
```

---

## Отладка кэширования

### Почему задача не кэшируется?

```bash
# 1. Проверь inputs в target
nx show project <name> --json | jq '.targets.<target>.inputs'

# 2. Пропусти кэш для теста
nx build <project> --skip-nx-cache

# 3. Проверь что cache: true
nx show project <name> --json | jq '.targets.<target>.cache'
```

### Почему кэш не восстанавливается?

```bash
# 1. Проверь outputs
nx show project <name> --json | jq '.targets.<target>.outputs'

# 2. Убедись что папки outputs существуют после сборки

# 3. Проверь что нет race conditions в параллельных задачах
```

---

## См. также

- [configuration.md](configuration.md) — Конфигурация targets
- [affected.md](affected.md) — Affected и кэширование
- [troubleshooting.md](troubleshooting.md) — Проблемы с кэшем
