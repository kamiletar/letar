---
paths: libs/**/*
---

# Правила для библиотек

⚡ **Не создавай библиотеку руками** — используй `nx g @letar/generators:new-lib <name>`, он раскладывает
всю структуру ниже (включая `tsconfig.spec.json`, обязательный для vitest 4 + vite 8 oxc) и уже сверен с
актуальными `libs/format-utils`/`libs/validation-utils`. Ручной процесс ниже — для справки/понимания, что
генератор делает под капотом.

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

**Обязательное — одно:** чтобы Nx видел ребро графа. Если библиотеки нет в `dependencies`
приложения — пропиши её в `nx.implicitDependencies` его `package.json`. Это даёт корректные
`nx affected`, порядок сборки и инвалидацию кэша.

**Резолв самого импорта `@letar/*` от настроек приложения не зависит.** Он держится на
`customConditions: ["@letar/source"]` в корневом `tsconfig.base.json` + `exports` с этим условием
в `libs/<name>/package.json` (генератор `new-lib` их проставляет). Поэтому `dashboard` импортирует
`@letar/forms` и `@letar/chakra-provider`, не имея для них ни одной записи в `paths`.

**`paths` и `references` в `tsconfig.json` приложения — вспомогательные, не обязательные.**
Они безвредны и помогают редактору, но обязательными их считать не надо:

- `paths` нужны там, где линка в `node_modules` нет (подключение только через
  `implicitDependencies`), и отдельной строкой на каждый подпуть — см. раздел ниже;
- `references` читает только `tsc --build`, а ни одно приложение в `apps/` его не запускает: все
  таргеты типизации однопроектные (`tsgo --noEmit`). Рассинхрон `paths` ↔ `references` **не
  является дефектом** и выравнивания «ради симметрии» не требует.

⛔ **`nx sync` этого не чинит** — `@nx/js:typescript-sync` отключён в `nx.json`
(`sync.disabledTaskSyncGenerators`), а `nx sync`/`nx sync:check` не вызываются ни в CI, ни в
git-хуках. `references` правятся руками либо не правятся вовсе.

Детали и замер 2026-08-04 — [Окружение](/.claude/docs/environment.md#разработка-shared-библиотек),
раздел «⚠️ Всё вышесказанное относится к `tsc --build` — а приложения его не используют».

## Существующие библиотеки

| Библиотека                | Описание                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| @letar/forms              | Формы (TanStack Form)                                                                                                                                                    |
| @letar/chakra-provider    | Chakra UI провайдер                                                                                                                                                      |
| @letar/yandex-metrika     | Яндекс Метрика                                                                                                                                                           |
| @letar/format-utils       | Форматирование дат, телефонов                                                                                                                                            |
| @letar/ui                 | Shared UI компоненты                                                                                                                                                     |
| @letar/validation-utils   | Zod схемы валидации                                                                                                                                                      |
| @letar/email              | Email отправка через Maddy                                                                                                                                               |
| @letar/form-mcp           | MCP сервер для форм (npm: @letar/form-mcp)                                                                                                                               |
| @letar/generators         | Локальные Nx-генераторы (`nx g @letar/generators:e2e-suite <app>`, `new-lib <name>`, `new-app <name>`)                                                                   |
| @letar/zenstack-fragments | Общие ZenStack zmodel-миксины (Better Auth Account/Session/Verification) — подключаются через `import` пути в `schema.zmodel`, НЕ через TS-алиасы/`implicitDependencies` |

## Несколько точек входа (`./server`, `./client`)

Библиотека может нести код под разные рантаймы: React-компоненты в `.` и Node-only код в
`./server` (образцы — `@letar/auth`, `@letar/pin-auth`, `@letar/image-upload`).

- Серверный код — только в `src/server/`, клиентский — в `src/client/` или `src/lib/`.
  На этом соглашении держатся правила `no-restricted-imports` в корневом `eslint.config.mjs`:
  они не пускают React/Chakra в `src/server/` и `@letar/*/server` — в клиентский код.
- Тег `type:*` в `project.json` описывает **точку входа по умолчанию** (`.`), а не всю
  библиотеку. `@nx/enforce-module-boundaries` подпути не различает вообще — для него
  `@letar/x` и `@letar/x/server` один узел графа.
- Каждый подпуть прописывается отдельной строкой в `paths` приложения-потребителя.

Подробнее (включая ловушку с `files`-глобами в ESLint 10):
[lib-entry-points.md](/.claude/docs/lib-entry-points.md).

## Правила

- Каждая библиотека должна иметь README.md с API документацией
- Используй `composite: true` в tsconfig.json
- Экспортируй всё через `src/index.ts`
- ⛔ Не полагайся на `nx sync` — в этом репо он отключён и references не обновит (см.
  «Подключение к приложению» выше)
