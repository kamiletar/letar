---
name: form-pipeline
description: |
  Полный цикл создания форм с @letar/forms. Используй при:
  - Создании CRUD форм (create/edit)
  - Добавлении полей к формам
  - Настройке валидации Zod v4
  - Интеграции с Server Actions
  - Работе с FormGroup, ChakraFormField
---

# Form Pipeline

Полный цикл создания форм с @letar/forms. Используй при создании CRUD форм.

## Когда использовать

- Создание новых форм (create/edit)
- Добавление полей к существующим формам
- Настройка валидации и UI
- Интеграция с Server Actions

## Воркфлоу

1. **Добавь @form.\* директивы** в `schema.zmodel`
2. **Генерируй** `nx zenstack:generate <app>`
3. **Создай компонент** с `<Form>` API
4. **Создай Server Action** в `_actions/`

## Быстрый старт

```tsx
import { ProductCreateFormSchema } from '@/generated/form-schemas'
import { Form } from '@letar/forms'
;<Form schema={ProductCreateFormSchema} initialValue={data} onSubmit={save}>
  <Form.AutoFields />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

## Критичные правила

- **ВСЕГДА** читай `libs/forms/README.md` перед работой с формами
- **ВСЕГДА** используй `.strip()` в Zod схемах
- **НЕ** импортируй напрямую из `@tanstack/react-form`
- Валидация + UI метаданные живут в одном месте (Zod схема)

## Reference файлы

- `reference/field-types.md` — 40+ типов полей
- `reference/declarative-api.md` — Form, Form.Field.\*, Form.Group, Form.When
- `reference/zod-meta.md` — .meta({ ui: {...} }) паттерны
- `reference/server-actions.md` — паттерны Server Actions

## Связанный Skill

- `zenstack-helper` — @form.\* директивы, генерация схем
