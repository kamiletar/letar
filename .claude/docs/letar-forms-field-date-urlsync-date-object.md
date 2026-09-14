# `Form.Field.Date` несовместим с `Form.UrlSync` — коммитит `Date`, а не строку

`FieldDate` ([field-date.tsx](/libs/forms/src/lib/declarative/form-fields/datetime/field-date.tsx))
всегда кладёт в состояние формы `new Date(raw)` при изменении поля — независимо от того, есть ли
у `<Form>` вообще `schema`, и тем более независимо от того, требует ли схема именно `Date`
(`z.coerce.date()`) или это обычная строка (`z.string()`, дата в формате `YYYY-MM-DD`). Это
осознанное решение библиотеки (см. комментарий в самом `onChange`) — конкретно под кейс, где
`FieldDate` автовыбирается `resolveFieldType` только для полей с `zodType === 'date'`, и там
рантайм-значение обязано совпадать с выведенным TS-типом.

Побочный эффект: `Form.Field.Date` нельзя безопасно использовать вместе с
`Form.UrlSync`/`useFormUrlSync` ([use-form-url-sync.ts](/libs/forms/src/lib/declarative/use-form-url-sync.ts))
для URL-персистентных фильтров по дате/диапазону дат.

## Механизм поломки

1. `useFormUrlSync({ defaults })` типизирует значение из URL по типу поля в `defaults`
   (`readUrlValues`) — строка/число/boolean/массив. Дата в `defaults` — обычно строка
   (`'2026-01-01'`), значит `initialValue.someDate` из URL тоже приходит строкой.
2. Как только пользователь трогает `Form.Field.Date`, `field.handleChange(new Date(raw))`
   заменяет это строковое значение на объект `Date`.
3. `FormUrlSync.isDefaultValue(value, def)` сравнивает `value === defaultValue`
   ([use-form-url-sync.ts:227](/libs/forms/src/lib/declarative/use-form-url-sync.ts#L227)).
   `Date !== string` всегда, даже если пользователь визуально вернул то же самое число —
   поле навсегда считается «активным» и уходит в `generatePrefillUrl`.
4. `generatePrefillUrl` сериализует произвольный `unknown` как есть — для `Date` это
   `String(dateInstance)` (полный `Date.toString()`, не `YYYY-MM-DD`), а не чистая дата.
5. При перезагрузке страницы `readUrlValues` читает этот параметр обратно как сырую строку
   query-параметра (не распарсенный `Date.toString()`) — раунд-трип не восстанавливает исходное
   значение корректно.

## Почему это не тот же баг, что в `letar-forms-field-date-runtime-string.md`

Тот документ — про рассинхрон между заявленным Zod-типом (`Date` через coerce) и тем, что раньше
реально лежало в состоянии формы (была строка). Он закрыт в 2.6.0: теперь `FieldDate` **всегда**
коммитит `Date`, как и должно быть для `z.coerce.date()`-полей.

Этот документ — про обратную сторону того же фикса: `FieldDate` коммитит `Date` даже там, где
схемы вовсе нет (`Form.UrlSync`-фильтры обычно не оборачивают в `schema` с `z.date()` — фильтр не
сабмитится, а сериализуется в URL как строка). Фикс 2.6.0 не сломан — он не учитывал этот второй
контекст использования.

## Обходной путь

Не заводить поле дата-диапазона через `Form.Field.Date` внутри формы с `Form.UrlSync`. Вместо
этого — обычный Chakra `<Input type="date">` вне декларативной Field-системы, с собственным
local state и вшитой в приложение логикой мержа с URL (`URLSearchParams`/`router.replace`
вручную).

Образец — `apps/studio/src/app/(owner)/owner/time/_components/use-time-entries-filters.ts` +
`time-entries-filters.tsx` (после коммита `d83bd8c`, миграция фильтров time-entries с сырого
Chakra `NativeSelect` на `@letar/forms`): `from`/`to` сознательно остались вне `<Form>`, тогда как
остальные фильтры (статус, проект) — обычные `Form.Field.Select` с `Form.UrlSync`.

## Статус

✅ Закрыто в `@letar/forms` 2.14.17 (2026-09-15). `field-date.tsx` уже получал через
`resolved.constraints` тот же `schemaType`, который `getZodConstraints` вычисляет по пути поля
для min/max-хинтов — этого оказалось достаточно, чтобы различить «внутри формы со схемой
`z.date()`» и «внутри `Form.UrlSync`-фильтра без такой схемы» без новой инфраструктуры:
`requiresDateValue = resolved.constraints?.schemaType === 'date'` в `onChange` коммитит `Date`
только когда схема поля реально этого требует, иначе — строку `YYYY-MM-DD`. Существующие
потребители с `z.date()`/`z.coerce.date()` не пострадали (обратная совместимость покрыта тестом).
Демо — `apps/form-develop-app` `filters-state-demo` (поле «Создано с»). Обход через `Input
type="date"` вне декларативной Field-системы (`apps/studio` owner/time) больше не обязателен для
новых мест, но менять существующий рабочий код без потребности не нужно.
