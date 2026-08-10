---
description: Систематическое обновление зависимостей монорепо через bun с проверкой безопасности и сборки
allowed-tools: Bash(bun outdated:*), Bash(bun update:*), Bash(bun add:*), Bash(bun audit:*), Bash(bun install:*), Bash(nx run-many:*)
---

# Deps Update - Обновление зависимостей

Обнови зависимости проекта безопасно и систематически.

## Когда использовать

- Регулярное обновление (раз в неделю/месяц)
- Критичное обновление безопасности
- Новая major версия важного пакета

## Шаги

### 1. Проверка устаревших пакетов

```bash
bun outdated
```

### 2. Обновление по группам

**Безопасные обновления (patch):**

```bash
bun update
```

**Minor обновления:**

```bash
bun update --latest
```

**Major обновления (осторожно!):**

```bash
bun add <package>@latest
```

### 3. Приоритет обновлений

1. **Критичные (безопасность)**
   - `bun audit` для проверки
   - Обновить немедленно

2. **Фреймворки**
   - Next.js, React, Chakra UI
   - Проверить changelog на breaking changes

3. **Инструменты разработки**
   - ESLint, TypeScript, Vitest
   - Обычно безопасны

4. **Остальные**
   - По необходимости

### 4. После обновления

```bash
# Пересобрать
bun install

# Проверить типы
nx run-many -t typecheck:tsgo

# Запустить тесты
nx run-many -t test

# Проверить сборку
nx run-many -t build
```

## Чеклист

- [ ] `bun audit` без критичных уязвимостей
- [ ] Все тесты проходят
- [ ] Сборка успешна
- [ ] Приложения запускаются
- [ ] Основной функционал работает

## Известные особенности

### Зафиксированные версии

```json
// package.json — не обновлять без проверки
"overrides": {
  "@tanstack/query-core": "5.90.12",
  "@tanstack/react-query": "5.90.12"
}
```

### Проблемные пакеты

- `@auth/core` — зафиксирован в resolutions
- `chalk` — v5 ESM only, используем v4

## После обновления

1. Обнови CHANGELOG.md:

   ```markdown
   ### Changed

   - Обновлены зависимости: Next.js 16.x, React 19.x
   ```
