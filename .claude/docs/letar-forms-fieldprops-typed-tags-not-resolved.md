# `form.props.<key>` не резолвится в типизированных `<AppForm.Field.X>` тегах

⚠️ Разрыв между тем, что умеет `@meta("form.props.<key>", value)` в schema.zmodel, и тем, что
реально доходит до компонента в рекомендованном паттерне написания форм.

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

Следствие: в типизированном пути значение вроде `minorUnitScale` живёт **только** как JSX-проп
(`<AppForm.Field.Currency name="priceKopecks" minorUnitScale={100} />`). Задать его в
`schema.zmodel` через `@meta("form.props.minorUnitScale", 100)` и рассчитывать, что оно само
подставится в любой рендер поля — не сработает, если рендер идёт не через `Form.Field.Auto`.

## Почему это не мелочь

Значения такого класса (`minorUnitScale`, `currency`) описывают факт о **хранении** данных
(минорные единицы vs отображаемые), а не о конкретном месте рендера — по архитектуре им место в
схеме один раз, не в каждом JSX-вызове формы. Дублирование вручную — источник ошибки максимальной
цены: пропущенный/неверный `minorUnitScale` даёт правдоподобное, но неверное значение (например
`annualRateBps = 13` вместо `1300`), а не явную ошибку валидации.

## Статус

Найдено 2026-09-09 (domwellbes → forms-coordinator, запрос `Field.Percentage.minorUnitScale`).
Отправлено forms-dev как коррекция к задаче (agent-mail тред `money-field-kopecks`) — расширить
`useResolvedFieldProps` резолвом `meta.fieldProps` с приоритетом `props > meta` (тот же принцип,
что уже применён к остальным полям хука). Не blocking для самого `Field.Percentage.minorUnitScale`
— проп может выйти сначала как голый JSX-параметр (по образцу `Field.Currency`, v2.13.0), связку
со схемой закрыть отдельным шагом.

**Если ты работаешь с `form.props.<key>` для UI-пропса (не `min`/`max`/`step` — те идут в Zod
constraints и резолвятся отдельно, разрыва не касается) — проверь, не читаешь ли эту доку устаревшей.**
Если `useResolvedFieldProps` к моменту чтения уже резолвит `meta.fieldProps` — разрыва больше нет,
обнови этот файл и `CHANGELOG.md`/`PLAN.md` библиотеки.
