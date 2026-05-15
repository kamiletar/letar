---
paths: apps/**/*-form.tsx, apps/**/*Form.tsx, apps/**/_schemas/*.ts, libs/forms/**/*
---

# Правила для форм

## Библиотека @letar/forms

⚠️ **ОБЯЗАТЕЛЬНО** прочитай `libs/forms/README.md` перед работой с формами!

## Приоритет инструментов

При работе с формами **ОБЯЗАТЕЛЬНО** следуй этому порядку:

1. **schema.zmodel** — начни с `@form.*` директив (Skill `zenstack-helper`, MCP `form-mcp` → `get_directives`)
2. **Генерация** — запусти `nx zenstack:generate <app>` для создания form schemas
3. **form-mcp** — вызови `list_fields` для проверки доступных полей, `get_form_pattern` для паттерна, `get_field_props` для пропсов
4. **createForm инстанс** — используй app-specific инстанс (см. секцию ниже)
5. **Skill `form-pipeline`** — при создании формы с нуля

⚠️ **Если поля или директивы нет** — НЕ пиши кастомную реализацию! Делегируй через agent-mail (см. `.claude/rules/form-delegation.md`).

## createForm — app-specific инстанс

**ОБЯЗАТЕЛЬНО:** каждое приложение создаёт свой инстанс формы через `createForm()` из `@letar/forms`.

### Структура

```
src/<app-name>-form/
├── <app-name>-form.tsx   # createForm() с extraSelects, extraComboboxes, extraFields
└── index.ts              # export { AppNameForm } from './<app-name>-form'
```

### Паттерн

```typescript
import { createForm, lazyComboboxes, lazySelects } from '@letar/forms'

export const MyAppForm = createForm({
  extraSelects: lazySelects({
    // Enum Select-ы (lazy imports для оптимизации памяти!)
    Status: () => import('./selects/status-select'),
    Category: () => import('./selects/category-select'),
  }),
  extraComboboxes: lazyComboboxes({
    // Async Combobox-ы для поиска сущностей
    User: () => import('./comboboxes/user-combobox'),
  }),
  extraFields: {
    // Синхронные кастомные поля
    PlateNumber: PlateNumberField,
  },
})
```

### Использование

```tsx
import { MyAppForm } from '@/my-app-form'

;<MyAppForm initialValue={defaults} onSubmit={handleSubmit}>
  <MyAppForm.Field.String name="title" label="Название" />
  <MyAppForm.Select.Status name="status" label="Статус" />
  <MyAppForm.Combobox.User name="userId" label="Пользователь" />
  <MyAppForm.Button.Submit>Сохранить</MyAppForm.Button.Submit>
</MyAppForm>
```

### Memory optimization

- **Все Select/Combobox** через `lazySelects`/`lazyComboboxes` (dynamic imports)
- **Образец:** `apps/driving-school/src/driving-school-form/` — 46 Select, 10 Combobox, 3 Field, 1 Listbox

## ZenStack Form Plugin

- **ОБЯЗАТЕЛЬНО** используй `@form.*` директивы в schema.zmodel вместо ручных Zod схем
- Проверяй `get_directives` (form-mcp) перед добавлением директив
- Если нужной директивы нет → делегация через agent-mail

## Основной паттерн (legacy API)

```typescript
import { ChakraFormField, FormGroup, useAppForm } from '@letar/forms'
import { z } from 'zod/v4'

const schema = z.object({
  name: z.string().min(1, 'Обязательное поле'),
  email: z.email('Некорректный email'),
}).strip() // ⚠️ Всегда используй .strip() для Zod v4

function MyForm() {
  const form = useAppForm({ schema, defaultValues: { name: '', email: '' } })

  return (
    <FormGroup form={form} name="root">
      <ChakraFormField name="name" label="Имя">
        <Input />
      </ChakraFormField>
      <ChakraFormField name="email" label="Email">
        <Input type="email" />
      </ChakraFormField>
    </FormGroup>
  )
}
```

## Правила

- **Схемы валидации** — храни в `_schemas/` с суффиксом `.schema.ts`
- **Server Actions** — вызывай напрямую из `onSubmit`, не через `<form action>`
- **Массивы** — используй `FormGroupList`
- **Оффлайн** — используй `useOfflineForm` из `@letar/forms/offline`

## Не делай

- ❌ **NEVER** используй Conform для новых форм (только @letar/forms)
- ❌ **NEVER** импортируй из `@tanstack/react-form` напрямую
- ❌ **NEVER** забывай `.strip()` в Zod схемах
- ❌ **NEVER** пиши кастомные поля форм если аналог есть в form-components (проверь `list_fields`!)

## Документация

→ **MCP: `form-mcp`** — 6 tools для доступа к полям, паттернам и директивам (list_fields, get_field_props, get_form_pattern и др.)
→ **Skill: `form-pipeline`** — полный воркфлоу создания форм
→ **Skill: `zenstack-helper`** — @form.\* директивы для генерации схем
→ **Rule: `form-delegation`** — делегация недостающих фич через agent-mail
