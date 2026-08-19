# Field.Date отдаёт string в onSubmit, даже когда схема — z.coerce.date()

## Симптом

Форма на `@letar/forms` использует `Form.Field.Date` для поля, схема которого объявлена через
`z.coerce.date()`. Код в `onSubmit` вызывает `values.someDate.toISOString()` — и падает в
рантайме:

```
TypeError: values.someDate.toISOString is not a function
```

`nx typecheck:tsgo` эту ошибку **не ловит** — форма компилируется и типизируется чисто.

## Почему typecheck молчит

TS-тип поля `values.someDate` выводится из `z.infer<typeof schema>`. Если схема поля —
`z.coerce.date()`, заявленный (выведенный) тип — `Date`. TypeScript верит объявлению схемы, не
фактическому рантайм-значению.

Zod-коэрсия реально отрабатывает **только внутри `safeParse`/валидации** — она проверяет и
приводит значение в момент валидации, но не подменяет то, что физически лежит в состоянии формы
и передаётся в колбэк `onSubmit`.

## Где на самом деле рождается несоответствие

`FieldDate` ([field-date.tsx](/libs/forms/src/lib/declarative/form-fields/datetime/field-date.tsx))
хранит и отдаёт значение поля как строку независимо от схемы:

```tsx
// рендер: Date -> строка YYYY-MM-DD для <input type="date">
const rawValue = field.state.value
let stringValue = ''
if (rawValue instanceof Date) {
  stringValue = rawValue.toISOString().split('T')[0]
} else if (typeof rawValue === 'string') {
  stringValue = rawValue
}

// onChange: в state формы уходит именно строка из HTMLInputElement
onChange={(e) => field.handleChange((e.target as HTMLInputElement).value)}
```

`field.handleChange` кладёт в состояние формы `e.target.value` — всегда `string`. Ни разу в
компоненте значение не приводится обратно к `Date`. Декларируемый Zod-тип (`Date` через coerce) и
реальное рантайм-значение (`string`) расходятся с момента первого взаимодействия пользователя с
полем.

## Статус

✅ Исправлено в `@letar/forms` 2.6.0 (2026-08-19) — `FieldDate.onChange` теперь коммитит
`new Date(raw)` (или `undefined` при пустом значении) вместо сырой строки из
`<input type=date>`. Обходной путь ниже больше не требуется для новых форм, но безопасен и не
ломается на новых версиях (`new Date(dateInstance)` — валидный клон).

## Обходной путь до фикса в библиотеке

Не полагаться на TS-тип поля, приводить явно перед сериализацией:

```ts
// ❌ упадёт в рантайме, если значение пришло со схемой z.coerce.date()
values.validFrom.toISOString()

// ✅ рантайм-безопасно, независимо от того, что говорит выведенный тип
new Date(values.validFrom as unknown as string).toISOString()
```

Образец применения — `apps/domwellbes/src/app/(admin)/admin/logistics/carriers/[id]/_components/create-carrier-tariff-form.tsx`.

## История делегации

Баг делегирован координатору форм (`QuietRidge`) через agent-mail, тред `form-feature-request`
(2026-08-19), исправлен в `@letar/forms` 2.6.0 тем же днём — см. «Статус» выше.
