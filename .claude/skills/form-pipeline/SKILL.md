---
name: form-pipeline
description: |
  Формы на @letar/forms: createForm-инстанс приложения, Field.*, FormGroup, Zod v4, server action,
  генерация схем из @meta("form.*"). Загружай ДО создания или правки любой формы и когда дропдаун пуст,
  подсказки английские, ошибка не видна на скрытой вкладке, Field.Date приходит строкой.
---

# Form Pipeline

Полный цикл создания форм с @letar/forms. Используй при создании CRUD форм.

## Когда использовать

- Создание новых форм (create/edit)
- Добавление полей к существующим формам
- Настройка валидации и UI
- Интеграция с Server Actions

## Воркфлоу

1. **Добавь `@meta("form.*", value)` директивы** в `schema.zmodel`
2. **Генерируй** `nx zenstack:generate <app>`
3. **Создай компонент** с `<Form>` API
4. **Создай Server Action** в `_actions/`

## Быстрый старт

```tsx
import { ProductCreateFormSchema } from '@/generated/form-schemas'
import { MyAppForm as Form } from '@/my-app-form'
// `MyAppForm` — createForm-инстанс приложения (`src/<app>-form/`, образец apps/archetest); ниже он записан как `Form`
<Form schema={ProductCreateFormSchema} initialValue={data} onSubmit={save}>
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

- `zenstack-helper` — @meta("form.\*", value) директивы, генерация схем

## Чеклист

- [ ] `@meta("form.*", value)` в `schema.zmodel` → `nx zenstack:generate <app>`
- [ ] Компонент на сгенерированной схеме через `createForm`-инстанс приложения
- [ ] Server action: вход через Zod с `.strip()`, ошибки полей — в `errorMap.onServer`, `revalidatePath` после мутации
- [ ] Футер — `FormActions`, ошибки видны пользователю (в том числе на скрытой вкладке)
