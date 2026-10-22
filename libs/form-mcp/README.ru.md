# @letar/form-mcp

MCP (Model Context Protocol) сервер для [@letar/forms](https://www.npmjs.com/package/@letar/forms) — даёт AI-ассистентам полный контекст о 40+ декларативных компонентах форм, паттернах и директивах генерации ZenStack.

## Быстрый старт

### Claude Code

Добавьте в `.mcp.json` проекта:

```json
{
  "mcpServers": {
    "form-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@letar/form-mcp"]
    }
  }
}
```

### Cursor

Добавьте в `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "form-mcp": {
      "command": "npx",
      "args": ["-y", "@letar/form-mcp"]
    }
  }
}
```

### VS Code (GitHub Copilot)

Добавьте в `.vscode/mcp.json`:

```json
{
  "servers": {
    "form-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@letar/form-mcp"]
    }
  }
}
```

## Что предоставляет

### Инструменты (6)

| Инструмент          | Описание                                                |
| ------------------- | ------------------------------------------------------- |
| `list_fields`       | Список всех 40+ типов полей с фильтром по категории     |
| `get_field_props`   | Пропсы, описание и документация конкретного поля        |
| `get_field_example` | TSX код-пример для компонента                           |
| `get_form_pattern`  | Готовые примеры форм: CRUD, мультистеп, оффлайн, i18n   |
| `get_directives`    | Документация директив @form.\* для zenstack-form-plugin |
| `generate_form`     | Генерация кода формы из спецификации полей              |

### Ресурсы (7)

Документация доступна через `form-docs://` URIs:

- `form-docs://fields` — справочник 40+ компонентов полей
- `form-docs://form-level` — Form.Steps, Form.When, Form.Errors и др.
- `form-docs://schema-generation` — FromSchema, AutoFields, Builder
- `form-docs://offline` — useOfflineForm, очередь синхронизации
- `form-docs://i18n` — FormI18nProvider, локализация ошибок
- `form-docs://zenstack` — интеграция с ZenStack, директивы @form.\*
- `form-docs://api-reference` — хуки, контексты, типы

### Промпты (3)

| Промпт         | Описание                                      |
| -------------- | --------------------------------------------- |
| `create-form`  | Шаблон для генерации CRUD формы               |
| `add-field`    | Добавить поле к существующей форме            |
| `migrate-form` | Миграция с React Hook Form / Formik / Conform |

## Категории полей

| Категория        | Поля                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| **Текстовые**    | String, Textarea, Password, PasswordStrength, Editable, RichText                                              |
| **Числовые**     | Number, NumberInput, Slider, Rating, Currency, Percentage                                                     |
| **Дата и время** | Date, Time, DateRange, DateTimePicker, Duration, Schedule                                                     |
| **Выбор**        | Select, NativeSelect, CascadingSelect, Combobox, Autocomplete, Listbox, RadioGroup, RadioCard, SegmentedGroup |
| **Множ. выбор**  | Checkbox, CheckboxCard, Switch, Tags                                                                          |
| **Специальные**  | Auto, PinInput, OTPInput, ColorPicker, FileUpload, Phone, MaskedInput, Address                                |

## Конфигурация

Переменная `FORM_MCP_DOCS_PATH` переопределяет путь к директории с документацией.

## Связанные пакеты

- [@letar/forms](https://www.npmjs.com/package/@letar/forms) — библиотека компонентов форм
- [@letar/zenstack-form-plugin](https://www.npmjs.com/package/@letar/zenstack-form-plugin) — генератор форм из ZenStack схемы
