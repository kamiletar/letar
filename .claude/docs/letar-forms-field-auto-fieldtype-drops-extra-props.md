# `Field.Auto` с `meta.ui.fieldType` не прокидывает произвольные props (например `onComplete`)

✅ Закрыто в `@letar/forms` v2.14.18 (2026-09-15) — см. «Настоящий фикс» ниже.

⚠️ Найдено на `auth-hub`, PLAN_EMAIL_CODE.md A.2 (2026-09-15) — экран ввода кода из письма
(`verify-email-code.tsx`) молчал: код набирался, но автосабмит не срабатывал, ни ошибки, ни
запроса в сеть.

## Механизм

`FieldAuto` (`libs/forms/src/lib/declarative/form-fields/auto/field-auto.tsx`) имеет два пути:

- **fallback по типу схемы** (`switch (zodType)`) — рендерит конкретный `Field*` компонент и
  спредит `{...baseProps}` целиком, включая любые лишние props;
- **явный `meta.ui.fieldType`** — вызывает `renderFieldByType(fieldType, {...})` с явно
  перечисленным подмножеством полей (`label`, `placeholder`, `helperText`, `required`,
  `disabled`, `readOnly`, `enumValues`, `constraints`, `fieldProps: uiMeta.fieldProps`).
  `baseProps` в этой ветке **не спредится** — любой проп, которого нет в списке (в данном
  случае `onComplete` у `PinInputFieldProps`), молча теряется.

Это отдельный баг от уже закрытого в v0.7.0
([letar-forms-fieldprops-typed-tags-not-resolved.md](letar-forms-fieldprops-typed-tags-not-resolved.md)) —
тот был про `meta.fieldProps`, не резолвящийся в **явных** `<AppForm.Field.X>`-тегах; этот —
про прямые props, теряющиеся в **`Field.Auto`** при заданном `meta.fieldType`. Симметрично
противоположные направления одного класса рассинхрона «явный тег vs `Field.Auto`».

## Симптом

Никакой ошибки — компонент рендерится штатно, значение поля (`onValueChange`) уходит в форму
корректно, только колбэк `onComplete`/аналогичный «нестандартный» проп конкретного `Field*`
компонента не вызывается никогда. В headless e2e/ручной проверке выглядит как «форма не
реагирует на завершение ввода», а не как явная ошибка.

## Обход

Если полю нужен проп сверх общего `BaseFieldProps` (как `onComplete` у `PinInputFieldProps`,
`onOptionSelect` и подобные у других специализированных полей) — рендерить **явным** тегом
(`AppForm.Field.PinInput`, не `AppForm.Field.Auto`), как и рекомендует
`.claude/rules/forms.md` для похожего класса проблем. `meta.ui.fieldType`/`fieldProps` на схеме
в этом случае можно не задавать вовсе — они нужны только когда рендер идёт через `Field.Auto`.

## Настоящий фикс — сделан в v2.14.18

`FieldAuto` теперь собирает остаточные props (то, что не попало в явно перечисленный список —
`label`/`placeholder`/`helperText`/`required`/`disabled`/`readOnly`) и сливает их в `fieldProps`
вместе с `uiMeta.fieldProps` перед вызовом `renderFieldByType` — прямой JSX-проп приоритетнее,
как более специфичный. `AutoFieldProps` получил index signature `[key: string]: unknown`, чтобы
такие props типизированно принимались на `<Form.Field.Auto>`. Регрессионный тест —
`libs/forms/src/lib/declarative/form-fields/auto/field-auto.spec.tsx` (полный цикл через
`<Form>` + `z.string().meta({ ui: { fieldType: 'pinInput' } })` + `onComplete`, подтверждено что
без фикса тест красный). См. `libs/forms/CHANGELOG.md` [2.14.18].

Обход из предыдущей версии этого документа (рендерить явным тегом `AppForm.Field.PinInput`)
остаётся рабочим и по-прежнему допустим, но больше не обязателен.
