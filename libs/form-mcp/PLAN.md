# PLAN.md — @letar/form-mcp

MCP сервер для AI-ассистентов, работающих с @letar/forms и @letar/zenstack-form-plugin.

---

## Phase 1: Локальный MCP сервер ✅

| Задача                                                                                                     | Статус |
| ---------------------------------------------------------------------------------------------------------- | ------ |
| Scaffold (package.json, project.json, tsconfig)                                                            | ✅     |
| Установка @modelcontextprotocol/sdk                                                                        | ✅     |
| data/loader.ts — парсинг markdown                                                                          | ✅     |
| data/field-registry.ts — реестр 40+ полей                                                                  | ✅     |
| data/pattern-registry.ts — реестр паттернов                                                                | ✅     |
| data/directive-registry.ts — @form.\* директивы                                                            | ✅     |
| 6 tools (list_fields, get_field_props, get_field_example, get_form_pattern, get_directives, generate_form) | ✅     |
| 7 resources (form-docs://)                                                                                 | ✅     |
| 3 prompts (create-form, add-field, migrate-form)                                                           | ✅     |
| createFormMcpServer() фабрика + cli.ts                                                                     | ✅     |
| Регистрация в .mcp.json                                                                                    | ✅     |
| typecheck + lint                                                                                           | ✅     |

---

## Phase 2: NPM пакет (@letar/form-mcp) ✅

| Задача                                                                                       | Статус               |
| -------------------------------------------------------------------------------------------- | -------------------- |
| tsup.config.ts — бандл CLI (38 KB)                                                           | ✅                   |
| package.publish.json с bin, keywords, files                                                  | ✅                   |
| cli.ts с авто-обнаружением docs (bundled/monorepo/env)                                       | ✅                   |
| scripts/copy-docs.ts для сборки                                                              | ✅                   |
| Nx targets: build:npm, publish:npm                                                           | ✅                   |
| tsconfig.publish.json                                                                        | ✅                   |
| README.md с инструкциями для Claude Code, Cursor, VS Code                                    | ✅                   |
| CHANGELOG.md                                                                                 | ✅                   |
| Тест bundled CLI из dist/                                                                    | ✅                   |
| Публикация на npm                                                                            | ⬜ Когда обкатаем    |
| Регистрация в MCP Registry                                                                   | ⬜ После npm publish |
| build:npm — убрать рассинхрон version между package.json и package.publish.json (2026-08-09) | ✅                   |

---

## Phase 3: Claude Code Plugin (отложена)

Будет реализована после обкатки MCP сервера пользователями. Включает hooks для валидации форм-кода, enhanced skills и автономный agent.

---

## Техдолг

### 2026-08-11 — Фикс `CATEGORY_MAP` (7 документных полей терялись) ✅

`field-registry.ts` ждал ключ секции `'Российские документы'`, реальный заголовок в
`libs/forms/docs/fields.md` — `## Документные поля (Россия)`. Несовпадение строк — секция
пропускалась парсером целиком, `list_fields`/`get_field_props`/`get_field_example` не знали про
`INN`/`KPP`/`OGRN`/`BIK`/`BankAccount`/`SNILS`/`Passport`. Фикс — одна строка в `CATEGORY_MAP`.
Задача координатора форм (Фаза 7.6, `libs/forms/PLAN.md`). v1.0.2 → v1.0.3.

### 2026-07-07 — Фикс типов Zod (несовместимость версий)

`typecheck:tsgo` падал 14 ошибками вида `Type 'ZodString' is not assignable to type 'AnySchema'` —
Bun isolated linker резолвил `zod` по-разному для `form-mcp` (хостнутая `^4.4.3`) и для
`@modelcontextprotocol/sdk` (изолированная `4.3.6`, от peer `zod-to-json-schema`). Два физических
экземпляра zod v4 → структурная несовместимость с `AnySchema` из SDK-шного `zod-compat.d.ts`.
**Фикс:** точный пин `"zod": "4.3.6"` в `package.json` (а не диапазон) — форсирует dedupe в
единственный экземпляр, совпадающий с тем, что реально резолвит SDK.

---

**Последнее обновление:** 2026-03-31 (v1.0.0)
