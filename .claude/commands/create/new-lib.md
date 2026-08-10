---
description: Генерация новой shared-библиотеки в монорепо и подключение её к приложениям
allowed-tools: Bash, Read, Grep, Glob
---

# New Lib - Создание библиотеки

Создай новую shared библиотеку в монорепозитории.

## Когда использовать

- Код переиспользуется в нескольких приложениях
- Нужна изоляция логики от UI
- Создание утилит, хуков, компонентов

## Создание

```bash
nx g @letar/generators:new-lib <lib-name>
# с описанием для README:
nx g @letar/generators:new-lib <lib-name> --description="Утилиты для X"
```

Генератор раскладывает полную структуру (`package.json`, `project.json` с
`typecheck`/`typecheck:tsgo`/`oxlint`/`lint`/`test`, `tsconfig.json` + `tsconfig.lib.json` +
`tsconfig.spec.json`, `vitest.config.ts`, `eslint.config.mjs`, `README.md`, стартовые
`src/index.ts`/`src/lib/feature.ts`/`src/lib/feature.spec.ts`) — сверено с актуальными
`libs/format-utils`/`libs/validation-utils`. Подробности и что генератор делает под капотом:
[libs/generators/README.md](/libs/generators/README.md#new-lib).

**Не перезаписывает существующие библиотеки** — если `libs/<name>` уже есть, падает с понятной ошибкой.

## После генерации

### 1. Реализовать логику

Замени заглушку `src/lib/feature.ts` реальным кодом, экспортируй через `src/index.ts`.

### 2. Подключить к приложению

Добавь `@letar/<lib-name>` в `nx.implicitDependencies` в `package.json` приложения (если
библиотеки нет в его `dependencies`) — **это единственное обязательное** (ребро графа Nx).

Всё остальное (когда нужны `paths`, почему `references` не обязательны и при чём тут `nx sync`) —
[libs.md § Подключение к приложению](/.claude/rules/libs.md#подключение-к-приложению).

### 3. Проверить

```bash
nx typecheck:tsgo <lib-name>
nx lint <lib-name>
nx test <lib-name>
```

## Чеклист

- [ ] `nx g @letar/generators:new-lib <lib-name>` выполнен
- [ ] Реализация в `src/lib/`, экспорт через `src/index.ts`
- [ ] README.md дополнен реальным API (генератор создаёт только заглушку)
- [ ] Подключено к нужным приложениям (обязательно — `implicitDependencies`; `paths`/`references`
      по необходимости)
- [ ] typecheck/lint/test зелёные

## Документация

См. [libs.md](/.claude/rules/libs.md)
