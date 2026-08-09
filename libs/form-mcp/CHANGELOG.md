# Changelog — @letar/form-mcp

## 1.0.2 (2026-08-09)

### Fixed

- **`build:npm` мог опубликовать пакет со старой версией.** `dist/package.json` копировался
  голым `cp` из `package.publish.json`, у которого было собственное поле `version`, независимое
  от `libs/form-mcp/package.json` (внутренний, `private: true`, `0.1.0` — никогда не
  синхронизировался с реально опубликованной `1.0.1`). Тот же класс ошибки, что уже чинили в
  `@letar/forms`. Фикс — `version` убрано из `package.publish.json` вовсе, `package.json`
  синхронизирован с последней опубликованной версией и стал источником истины,
  `dist/package.json` теперь собирает `scripts/write-publish-package-json.mjs`.

## 1.0.0 (2026-03-31)

### Features

- 6 MCP tools: list_fields, get_field_props, get_field_example, get_form_pattern, get_directives, generate_form
- 7 MCP resources: form-docs:// URIs for all documentation sections
- 3 MCP prompts: create-form, add-field, migrate-form
- `createFormMcpServer()` factory with configurable docsPath
- Bundled docs from @letar/forms for npm distribution
- Support for Claude Code, Cursor, VS Code (Copilot)
