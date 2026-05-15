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

| Задача                                                    | Статус               |
| --------------------------------------------------------- | -------------------- |
| tsup.config.ts — бандл CLI (38 KB)                        | ✅                   |
| package.publish.json с bin, keywords, files               | ✅                   |
| cli.ts с авто-обнаружением docs (bundled/monorepo/env)    | ✅                   |
| scripts/copy-docs.ts для сборки                           | ✅                   |
| Nx targets: build:npm, publish:npm                        | ✅                   |
| tsconfig.publish.json                                     | ✅                   |
| README.md с инструкциями для Claude Code, Cursor, VS Code | ✅                   |
| CHANGELOG.md                                              | ✅                   |
| Тест bundled CLI из dist/                                 | ✅                   |
| Публикация на npm                                         | ⬜ Когда обкатаем    |
| Регистрация в MCP Registry                                | ⬜ После npm publish |

---

## Phase 3: Claude Code Plugin (отложена)

Будет реализована после обкатки MCP сервера пользователями. Включает hooks для валидации форм-кода, enhanced skills и автономный agent.

---

**Последнее обновление:** 2026-03-31 (v1.0.0)
