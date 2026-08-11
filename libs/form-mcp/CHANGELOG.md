# Changelog — @letar/form-mcp

## 1.0.3 (2026-08-11)

### Fixed

- **`field-registry.ts` терял 7 российских документных полей.** `CATEGORY_MAP` ждал ключ секции
  `'Российские документы'`, а реальный заголовок в `libs/forms/docs/fields.md` — `## Документные
  поля (Россия)`. Несовпадение строк — секция целиком пропускалась парсером, `list_fields`,
  `get_field_props`, `get_field_example` (все три работают через общий `fieldRegistry`) не знали
  про `INN`/`KPP`/`OGRN`/`BIK`/`BankAccount`/`SNILS`/`Passport`.
- **`FieldCity` отсутствовал в `docs/fields.md` целиком** — не было баги парсера, поле просто не
  было задокументировано, хотя экспортируется из `@letar/forms` (`Form.Field.City`, DaData
  автодополнение города). Добавлена строка в таблицу «Специализированные».
- Уточнён счётчик «N типов полей» в шапке `fields.md`: 56 → 57 (добавление City сделало
  предыдущее число неверным).

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
