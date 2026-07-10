---
paths: libs/**/*
---

# Правила для библиотек

## Структура библиотеки

```
libs/my-lib/
├── src/
│   ├── index.ts          # Главный экспорт
│   └── lib/
│       ├── feature.ts    # Реализация
│       └── feature.spec.ts
├── package.json          # @letar/my-lib
├── project.json          # Nx конфигурация
├── tsconfig.json         # composite: true
├── tsconfig.lib.json
└── README.md             # Документация API
```

## package.json

```json
{
  "name": "@letar/my-lib",
  "version": "0.1.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

## Подключение к приложению

Для корректной работы TypeScript нужно настроить ТРИ вещи:

1. **paths** в `tsconfig.json` приложения
2. **references** в `tsconfig.json` приложения
3. **implicitDependencies** в `package.json` приложения

См. [Окружение](/.claude/docs/environment.md#разработка-shared-библиотек) для деталей.

## Существующие библиотеки

| Библиотека              | Описание                                   |
| ----------------------- | ------------------------------------------ |
| @letar/forms            | Формы (TanStack Form)                      |
| @letar/chakra-provider  | Chakra UI провайдер                        |
| @letar/yandex-metrika   | Яндекс Метрика                             |
| @letar/format-utils     | Форматирование дат, телефонов              |
| @letar/ui               | Shared UI компоненты                       |
| @letar/validation-utils | Zod схемы валидации                        |
| @letar/email            | Email отправка через Maddy                 |
| @letar/form-mcp         | MCP сервер для форм (npm: @letar/form-mcp) |

## Правила

- Каждая библиотека должна иметь README.md с API документацией
- Используй `composite: true` в tsconfig.json
- Экспортируй всё через `src/index.ts`
- После изменений запусти `nx sync` для обновления references
