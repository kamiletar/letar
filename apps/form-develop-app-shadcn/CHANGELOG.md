# Changelog

## Unreleased (2026-08-11, продолжение 9)

- Демо `FieldMatrixChoice` (`@letar/forms-shadcn` 0.27.0) — оценка аспектов заказа.

## Unreleased (2026-08-11, продолжение 8)

- Демо `FieldLikert` (`@letar/forms-shadcn` 0.26.0) — NPS-опрос удовлетворённости.

## Unreleased (2026-08-11, продолжение 7)

- Демо `FieldSchedule` (`@letar/forms-shadcn` 0.25.0) — изолированная форма, недельное расписание.

## Unreleased (2026-08-11, продолжение 6)

- Демо `FieldImageChoice` (`@letar/forms-shadcn` 0.24.0) — выбор стиля товара.

## Unreleased (2026-08-11, продолжение 5)

- Демо `FieldCascadingSelect` (`@letar/forms-shadcn` 0.23.0) — страна → город доставки.

## Unreleased (2026-08-11, продолжение 4)

- Демо `FieldTime` (`@letar/forms-shadcn` 0.22.0).

## Unreleased (2026-08-11, продолжение 3)

- Демо `FieldPasswordStrength` (`@letar/forms-shadcn` 0.21.0).

## Unreleased (2026-08-11, продолжение 2)

- Демо `FieldNumberInput` (`@letar/forms-shadcn` 0.20.0) — остаток на складе, min/max.

## Unreleased (2026-08-11, продолжение)

- Демо `FieldYesNo` (`@letar/forms-shadcn` 0.19.0) — `variant="thumbs"`, бинарный выбор согласия
  на рассылку.

## Unreleased (2026-08-11)

- Демо `FieldRichText` (`@letar/forms-shadcn` 0.18.0) — изолированная форма с Tiptap-редактором,
  `defaultValues.content` заполнен непустым HTML для проверки начального рендера. Приоритетный
  список координатора (Signature → FileUpload → Steps → Table → RichText) закрыт.

## Unreleased (2026-08-10, продолжение 2)

- Демо `FieldTableEditor` (`@letar/forms-shadcn` 0.17.0) — изолированная форма с array-полем
  `items` (позиции заказа), кастомные колонки с `computed`/`format`, `sortable`, `selectable`,
  footer с `aggregate: 'sum'`.

## Unreleased (2026-08-10, продолжение)

- Демо `FormSteps` (`@letar/forms-shadcn` 0.16.0) — изолированная 2-шаговая форма
  (`firstName`/`email`) с `Indicator`/`Navigation`/`CompletedContent`.
- Демо-поле `FieldFileUpload` (`@letar/forms-shadcn` 0.15.0) — `variant="dropzone"`, `maxFiles={3}`,
  `showSize`.
- Демо-поле `FieldSignature` (`@letar/forms-shadcn` 0.14.0) — canvas-рисование/typed mode,
  `width={320} height={120}`.

## Unreleased (2026-08-10)

- `defaultValues.address`/`defaultValues.cityDadata` заполнены непустыми значениями (было `''`)
  — этот путь раньше не проверялся живьём и маскировал React-warning «Cannot update a component
  while rendering a different component» в `FieldAddress`/`FieldCity` (пофикшен в
  `@letar/forms-shadcn` 0.13.2). Оставлено заполненным как регрессионная демонстрация.

## 0.1.0 (2026)

- Сгенерирован каркас приложения (`nx g @letar/generators:new-app form-develop-app-shadcn`)
