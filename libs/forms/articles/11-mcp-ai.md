# MCP: как научить AI генерировать production-ready формы

> **Уровень сложности:** Средний

**TL;DR:**

- MCP-сервер `@letar/form-mcp` даёт AI полный контекст о 50+ полях, паттернах и директивах — одна строка конфига
- 6 инструментов: list_fields, get_field_props, get_field_example, get_form_pattern, get_directives, generate_form
- AI с MCP создаёт формы в 5-10x быстрее: знает про Phone, City, Currency и правильный `.meta()` паттерн

**Кому полезно:**

- Junior: понять что такое MCP и как AI-ассистент может знать про вашу библиотеку
- Middle: подключить MCP к Claude Code / Cursor и ускорить разработку форм в 5-10 раз
- Senior: оценить архитектуру MCP-сервера как живой документации и стратегию AI-first DX

---

> Одиннадцатая статья из цикла «@letar/forms — от боли к декларативным формам». Как мы дали AI-ассистентам полный контекст о библиотеке через Model Context Protocol — и почему AI создаёт формы быстрее людей.

---

## Проблема: AI не знает вашу библиотеку

Вы спрашиваете Claude Code: «Создай форму для продукта с ценой, рейтингом и загрузкой фото».

Без контекста AI сгенерирует форму на React Hook Form с ручными `<input>`, кастомной валидацией и 80 строками кода. Он не знает, что у вас есть `Form.Field.Currency`, `Form.Field.Rating`, `Form.Field.FileUpload` и что всё можно описать в Zod `.meta()`.

---

## Решение: MCP-сервер @letar/form-mcp

[Model Context Protocol](https://modelcontextprotocol.io/) — стандарт Anthropic для подключения AI-ассистентов к внешним инструментам. Мы создали MCP-сервер, который даёт AI полный контекст о библиотеке:

```json
// .claude/settings.json или cursor-settings
{
  "mcpServers": {
    "form-mcp": {
      "command": "npx",
      "args": ["-y", "@letar/form-mcp"]
    }
  }
}
```

Одна строка конфига — и AI знает про все 50+ полей, паттерны форм, @form.\* директивы.

---

## 6 инструментов MCP

### 1. list_fields — каталог полей

AI запрашивает список всех доступных полей, фильтруя по категории:

```
AI → list_fields({ category: "select" })
← [Select, NativeSelect, Combobox, Autocomplete, Listbox, RadioGroup, RadioCard, SegmentedGroup, Tags, CascadingSelect, CheckboxCard]
```

### 2. get_field_props — детали конкретного поля

```
AI → get_field_props({ fieldType: "Currency" })
← {
    description: "Денежное поле с форматированием и символом валюты",
    props: {
      currency: { type: "string", default: "RUB", description: "Код валюты ISO" },
      min: { type: "number", description: "Минимальное значение" },
      max: { type: "number", description: "Максимальное значение" },
      locale: { type: "string", description: "Локаль форматирования" }
    },
    example: '<Form.Field.Currency name="price" currency="RUB" />'
  }
```

### 3. get_field_example — готовый код

```
AI → get_field_example({ fieldType: "FileUpload", variant: "in-form" })
← полный пример с Form, schema, и FileUpload внутри
```

### 4. get_form_pattern — паттерны форм

```
AI → get_form_pattern({ pattern: "crud-create" })
← полный шаблон CRUD create формы с Server Action
```

Доступные паттерны: `crud-create`, `crud-edit`, `multi-step`, `offline`, `i18n`, `from-schema`, `declarative`, `server-action`.

### 5. get_directives — @form.\* директивы

```
AI → get_directives({ directive: "@form.fieldType" })
← описание директивы, допустимые значения, примеры использования в schema.zmodel
```

### 6. generate_form — генерация кода

```
AI → generate_form({
  formName: "ProductForm",
  fields: [
    { name: "title", type: "String", label: "Название", required: true },
    { name: "price", type: "Number", label: "Цена", validation: "min(0)" },
    { name: "rating", type: "Number", label: "Рейтинг" }
  ],
  withSchema: true
})
← готовый код формы + Zod-схема
```

---

## Демо: от описания до формы за 30 секунд

**Вы:** «Создай форму для контакта: имя, телефон, email, город с автоподсказками, сообщение до 1000 символов»

**AI (с MCP):**

```tsx
const ContactSchema = z.object({
  name: z.string().min(2).meta({
    ui: { title: 'Имя', placeholder: 'Как к вам обращаться' },
  }),
  phone: z.string().meta({
    ui: { title: 'Телефон', fieldType: 'phone' },
  }),
  email: z.string().email().meta({
    ui: { title: 'Email', placeholder: 'user@example.com' },
  }),
  city: z.string().meta({
    ui: { title: 'Город', fieldType: 'city' },
  }),
  message: z.string().max(1000).meta({
    ui: { title: 'Сообщение', placeholder: 'Ваш вопрос или предложение' },
  }),
})

<Form schema={ContactSchema} initialValue={{}} onSubmit={sendContact}>
  <VStack gap={4}>
    <HStack>
      <Form.Field.String name="name" />
      <Form.Field.Phone name="phone" />
    </HStack>
    <Form.Field.String name="email" />
    <Form.Field.City name="city" />
    <Form.Field.Textarea name="message" />
    <Form.Button.Submit>Отправить</Form.Button.Submit>
  </VStack>
</Form>
```

AI знал:

- `Form.Field.Phone` — для телефона (не `<input type="tel">`)
- `Form.Field.City` — для города с автоподсказками (не `<input>`)
- `.max(1000)` → автоматически `Form.Field.Textarea`
- Правильный паттерн `.meta({ ui })` для метаданных

Без MCP он бы написал 50+ строк с ручными `<FormControl>`, `<FormLabel>`, `<Input>`.

---

## Зачем библиотеке нужен AI-интерфейс

### 1. Developer Productivity

AI с MCP создаёт формы в 5-10x быстрее, чем разработчик вручную. Он знает все 50+ полей, все паттерны, все пропсы.

### 2. Onboarding

Новый разработчик в команде: «Как создать мультистеп форму?» → AI показывает готовый паттерн из `get_form_pattern("multi-step")`.

### 3. Консистентность

AI всегда использует правильные паттерны библиотеки. Не забудет `.strip()` в Zod, не создаст форму на React Hook Form «по привычке».

### 4. Документация как код

MCP-сервер — это живая документация. Обновили библиотеку → обновили MCP → AI сразу знает про новые поля и паттерны.

---

## Как это устроено

```
libs/form-mcp/
├── src/
│   ├── index.ts          # MCP сервер (stdio transport)
│   ├── tools/
│   │   ├── list-fields.ts
│   │   ├── get-field-props.ts
│   │   ├── get-field-example.ts
│   │   ├── get-form-pattern.ts
│   │   ├── get-directives.ts
│   │   └── generate-form.ts
│   └── data/
│       ├── fields.json      # Каталог полей
│       ├── patterns.json    # Шаблоны форм
│       └── directives.json  # @form.* директивы
├── package.json           # @letar/form-mcp
└── README.md
```

Сервер — 500 строк TypeScript. Данные о полях и паттернах — JSON, сгенерированный из исходников библиотеки.

---

## Подключение

### Claude Code

```json
// .claude/settings.json
{
  "mcpServers": {
    "form-mcp": {
      "command": "npx",
      "args": ["-y", "@letar/form-mcp"]
    }
  }
}
```

### Cursor / VS Code

```json
// .cursor/settings.json
{
  "mcp": {
    "form-mcp": {
      "command": "npx",
      "args": ["-y", "@letar/form-mcp"]
    }
  }
}
```

Работает с любым MCP-совместимым AI-ассистентом.

---

## Итоги

| Инструмент          | Что делает                               |
| ------------------- | ---------------------------------------- |
| `list_fields`       | Каталог всех полей (с фильтрами)         |
| `get_field_props`   | Детали и пропсы конкретного поля         |
| `get_field_example` | Готовый код с примером                   |
| `get_form_pattern`  | Шаблоны: CRUD, мультистеп, offline, i18n |
| `get_directives`    | @form.\* директивы для ZenStack          |
| `generate_form`     | Генерация кода формы по описанию         |

MCP — это не «фича для галочки». Это кратный прирост продуктивности: AI знает вашу библиотеку так же хорошо, как вы.

---

## Ссылки

- **Документация:** [forms.letar.best](https://forms.letar.best)
- **Примеры:** [forms-example.letar.best](https://forms-example.letar.best)
- **GitHub:** [github.com/letar/forms](https://github.com/letar/forms)
- **npm MCP:** `npx @letar/form-mcp`

---

_Это одиннадцатая статья из цикла «@letar/forms — от боли к декларативным формам». [Предыдущая: i18n](10-i18n.md) | [Следующая: Analytics](13-analytics.md)._

---

**Используете ли вы AI для генерации форм?**
