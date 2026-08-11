# Changelog

## Unreleased (2026-08-11, продолжение 12)

- Демо `FieldAuto` (`@letar/forms-shadcn` 0.30.0) — изолированная форма со своей Zod-схемой
  (единственное место на странице, где `DemoForm` получает `schema`; `DemoForm` расширен опциональным
  пропом `schema` под эту задачу). 5 полей демонстрируют все ветки диспетчеризации: string → input,
  string (maxLength>200) → textarea, number → input type=number, boolean+booleanAsSwitch → Radix
  Switch, enum → нативный select с Title Case опциями. **Паритет с `@letar/forms` достигнут — 56 из
  56 полей.** Живая проверка в Chromium (Browser pane): все 5 тегов элементов и enum-опции
  подтверждены через `read_page`/`javascript_tool`, консоль без ошибок (только безвредные HMR
  WebSocket-предупреждения прокси).

## Unreleased (2026-08-11, продолжение 11)

- Демо `FieldCalculated` (`@letar/forms-shadcn` 0.29.0) — цена со скидкой из `price`/`discount`.

## Unreleased (2026-08-11, продолжение 10)

- Демо `FieldDataGrid` (`@letar/forms-shadcn` 0.28.0) — таблица сотрудников: сортировка, фильтр,
  инлайн-редактирование, выбор строк, CSV-экспорт. Живая проверка сортировки — через RTL
  (`fireEvent.click` по заголовку), не через Browser pane — известный артефакт: raw
  `dispatchEvent(MouseEvent)` в JS-харнессе не триггерит React-обработчик так же, как реальный
  клик, но сам компонент подтверждён рабочим юнит-тестом.

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
