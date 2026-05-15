# @letar/forms за 5 минут

> **Уровень сложности:** Простой

**TL;DR:** Установка → схема → 5 строк JSX → работающая форма с валидацией, accessibility и TypeScript.

> Quick Start: установка, первая форма, результат. Без философии — только код.

---

## Установка

```bash
npm install @letar/forms @chakra-ui/react zod
```

`@letar/forms` работает с **React 19**, **Chakra UI v3** и **Zod v4**.

---

## Первая форма

```tsx
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

// 1. Схема — единый источник правды для валидации и UI
const ContactSchema = z.object({
  name: z
    .string()
    .min(2)
    .meta({
      ui: { title: 'Имя', placeholder: 'Как вас зовут?' },
    }),
  email: z
    .string()
    .email()
    .meta({
      ui: { title: 'Email', placeholder: 'user@example.com' },
    }),
  message: z
    .string()
    .max(1000)
    .meta({
      ui: { title: 'Сообщение' },
    }),
})

// 2. Форма — 5 строк JSX
function ContactForm() {
  return (
    <Form
      schema={ContactSchema}
      initialValue={{ name: '', email: '', message: '' }}
      onSubmit={async ({ value }) => {
        await fetch('/api/contact', {
          method: 'POST',
          body: JSON.stringify(value),
        })
      }}
    >
      <Form.Field.String name="name" />
      <Form.Field.String name="email" />
      <Form.Field.Textarea name="message" />
      <Form.Button.Submit>Отправить</Form.Button.Submit>
    </Form>
  )
}
```

Что уже работает:

- **Валидация** — `min(2)`, `email()`, `max(1000)` из Zod
- **Label и placeholder** — из `.meta({ ui })`, не из JSX
- **Ошибки** — показываются автоматически под полем
- **TypeScript** — опечатка в `name` = ошибка компиляции
- **Accessibility** — `aria-invalid`, `aria-describedby`, уникальные `id`
- **Submit** — кнопка сама блокируется при отправке и показывает спиннер

---

## Ещё короче: автогенерация

```tsx
<Form.FromSchema
  schema={ContactSchema}
  initialValue={{ name: '', email: '', message: '' }}
  onSubmit={handleSubmit}
  submitLabel="Отправить"
/>
```

Одна строка вместо ручной вёрстки. Библиотека сама выбирает компоненты по типам Zod-схемы.

---

## Loading state за 1 строку

Пока данные для формы грузятся с сервера, обычно нужно показать скелетон. Без библиотеки это 15–20 строк ручных `<Skeleton />`. С `@letar/forms`:

```tsx
import { FormSkeleton } from '@letar/forms'

// Скелетон автоматически повторяет структуру формы
<FormSkeleton fields={ContactSchema} showSubmit />
```

`FormSkeleton` читает Zod-схему и создаёт скелетон с нужным количеством полей и кнопкой отправки. Когда данные загрузились — просто рендерите `<Form>` вместо скелетона:

```tsx
{
  isLoading
    ? <FormSkeleton fields={ContactSchema} showSubmit />
    : (
      <Form schema={ContactSchema} initialValue={data} onSubmit={save}>
        ...
      </Form>
    )
}
```

---

## Что дальше

- **Документация:** [forms.letar.best](https://forms.letar.best)
- **16 интерактивных примеров:** [forms-example.letar.best](https://forms-example.letar.best)
- **Исходный код примеров:** [GitHub](https://github.com/kamiletar/letar-forms-example)
- **MCP для AI:** `npx @letar/form-mcp` — AI-ассистент узнает про все 50+ полей

Хотите понять, _зачем_ это нужно и какие проблемы решает? Читайте [статью 1: Формы в React — почему всё ещё больно](01-why-forms-hurt.md).

---

## Все статьи цикла

0. ~~@letar/forms за 5 минут~~ _(вы здесь)_
1. [Формы в React — почему всё ещё больно](01-why-forms-hurt.md)
2. [Zod `.meta()` — одна схема для валидации и UI](02-zod-meta-single-source.md)
3. [Compound Components vs конфиг-объекты](03-compound-components.md)
4. [50+ полей: от String до CreditCard](04-40-fields.md)
5. [Мультистеп формы и условный рендеринг](05-multistep-conditional.md)
6. [Массивы и вложенные объекты](06-arrays-groups.md)
7. [FromSchema: генерируем форму из одной строки](07-from-schema.md)
8. [От БД до формы за 5 минут](08-zenstack-pipeline.md)
9. [Offline-first формы](09-offline-first.md)
10. [i18n: формы на любом языке](10-i18n.md)
11. [MCP: как AI пишет формы за тебя](11-mcp-ai.md)
12. [Релиз: как мы опенсорсили form-библиотеку](12-open-source.md)
