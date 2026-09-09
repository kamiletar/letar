# `form.props.<key>` не резолвился в типизированных `<AppForm.Field.X>` тегах — ЗАКРЫТО

✅ **Закрыто в `@letar/forms-react` v0.7.0 (2026-09-09, коммит `b941cf19`).** Ниже — разбор
проблемы, каким он был на момент обнаружения, для истории и на случай регрессии.

Разрыв был между тем, что умел `@meta("form.props.<key>", value)` в schema.zmodel, и тем, что
реально доходило до компонента в рекомендованном паттерне написания форм.

## Что работает

`zenstack-form-plugin` кладёт `form.props.<key>` в сгенерированную Zod-схему как
`.meta({ ui: { fieldProps: { <key>: value } } })`. Схема-driven рендер —
`renderFieldByType`/`renderSchemaField` (`libs/forms/src/lib/declarative/field-type-mapper.tsx`) —
читает `field.ui?.fieldProps` и спредит в компонент: `<FieldCurrency {...fieldProps} />`. Через
`Form.Field.Auto` любой UI-проп, заданный в схеме (`minorUnitScale`, `currency`, `showValue`,
`layout`, `count`, `allowHalf` и т.п.), доходит до компонента сам.

## Где разрыв

`.claude/rules/forms.md` рекомендует явные типизированные теги на app-инстансе
(`<AppForm.Field.Currency name="price" />`), не `Form.Field.Auto` — это фактический паттерн, каким
формы пишутся в приложениях (driving-school — образец с 46 Select). Общий хук
`useResolvedFieldProps` (`libs/forms-react/src/lib/field/use-resolved-field-props.ts`), через
который резолвятся пропсы **любого** типизированного поля, тянет из `meta` только фиксированный
список: `title`/`placeholder`/`description`/`required`/`disabled`/`readOnly`/`options`/`tooltip`/
`autocomplete`. Произвольный `meta.fieldProps` (тот самый bag, куда `form.props.<key>` кладёт
UI-пропсы) хук не читает вообще.

Следствие (до фикса): в типизированном пути значение вроде `minorUnitScale` жило **только** как
JSX-проп (`<AppForm.Field.Currency name="priceKopecks" minorUnitScale={100} />`). Задать его в
`schema.zmodel` через `@meta("form.props.minorUnitScale", 100)` и рассчитывать, что оно само
подставится в любой рендер поля — не срабатывало, если рендер шёл не через `Form.Field.Auto`.

## Почему это не мелочь

Значения такого класса (`minorUnitScale`, `currency`) описывают факт о **хранении** данных
(минорные единицы vs отображаемые), а не о конкретном месте рендера — по архитектуре им место в
схеме один раз, не в каждом JSX-вызове формы. Дублирование вручную — источник ошибки максимальной
цены: пропущенный/неверный `minorUnitScale` даёт правдоподобное, но неверное значение (например
`annualRateBps = 13` вместо `1300`), а не явную ошибку валидации.

## Статус — закрыто

Найдено 2026-09-09 (domwellbes → forms-coordinator, запрос `Field.Percentage.minorUnitScale`).
Отправлено forms-dev как коррекция к задаче (agent-mail тред `money-field-kopecks`, ack msg 1484).

**Фикс:** `useResolvedFieldProps` (`libs/forms-react/src/lib/field/use-resolved-field-props.ts`)
теперь отдаёт сырой `meta.fieldProps` новым полем в возвращаемом объекте. Мерж с приоритетом
`props > meta` сделан в `createField` (`create-field-primitives.tsx`):
`{ ...fieldProps, ...componentProps }` — JSX-пропы спредятся после и побеждают. Общая точка входа
для обоих UI-скинов (`@letar/forms` Chakra и `@letar/forms-shadcn`) — правка одна, действует в
обоих без отдельного патча shadcn-скина.

Теперь `@meta("form.props.<key>", value)` в `schema.zmodel` работает одинаково что через
`Form.Field.Auto`, что через любой явный `<AppForm.Field.X>` — и не только для `minorUnitScale`,
а для всех fieldProps-ключей сразу (`showValue`, `layout`, `count`, `allowHalf`, `currency` и т.д.),
поскольку фикс общий, не point-fix под один ключ. JSX-проп остался рабочим override-путём.

Тесты: `use-resolved-field-props.spec.ts` (резолв `meta.fieldProps`, приоритет `props > meta`),
`field-currency.spec.tsx` (интеграционные кейсы через реальный `Form`+`schema`).
