# Changelog @letar/forms-vue-shadcn

## 0.13.0 (2026-08-13)

Фаза 9, Этап 6 (часть 3) — тот же `FieldDataGrid`, что в headless `forms-vue` 0.12.0,
Reka/Tailwind-скин. Итог: 45 полей (было 44). Этап 6 (поля) завершён — остаются только
`Form.Group`/`Form.Steps` (form-level компоненты, не поля).

- Табличный wiring (`useVueTable`, обвязка `useField(mode:'array')`, сортировка/фильтр/
  пагинация/row-selection, CSV-экспорт) переиспользован из `@letar/forms-vue/core`
  (`use-data-grid.ts`) — не дублирован, тот же экспорт использует и headless-версия. Находки
  про API `@tanstack/vue-table` (нет функции `flexRender`, реактивность через геттеры, ручная
  распаковка `updater`) и про `useField(mode:'array')` (нечувствительность `_arrayVersion` к
  точечным правкам скаляра) — см. `libs/forms-vue/CHANGELOG.md` 0.12.0, идентичны обоим пакетам
  (общая композабл-логика).
- Своя — только Tailwind-разметка: заголовки/ячейки/чекбоксы (`rekaUIKit.Checkbox`), инлайн-
  input (кастомные компактные классы, не `rekaUIKit.Input` — тот же выбор, что в React
  shadcn-версии), `rekaUIKit.FieldRoot`/`FieldLabel`/`FieldError`, `onErrorCaptured` →
  `rekaUIKit.ErrorFallback` (тот же паттерн защиты рендера, что у остальных полей Этапа 6).
- Те же сохранённые beta-упрощения, что у headless-версии: без виртуализации, без
  resize/drag-reorder колонок, `columns` обязателен явно, фильтр только текстовый contains.
- Тест `app-form.stage6c.spec.ts` (тот же набор сценариев, что в headless-пакете, через
  `setupRekaPolyfills()`; row-selection проверяется через `[role="checkbox"]`, не `input[type=checkbox]`
  — `rekaUIKit.Checkbox` рендерит `CheckboxRoot`, кнопку, а не нативный чекбокс).

## 0.12.0 (2026-08-13)

Фаза 9, Этап 6 (часть 2) — тот же `FieldTableEditor`, что в headless `forms-vue` 0.11.0,
Reka/Tailwind-скин. Итог: 44 поля (было 43).

- Логика (резолв колонок, навигация клавиатурой, тип контроллера) переиспользована из
  `@letar/forms-vue/core` — `resolveTableColumns`/`useTableNavigation`/`createTableContainerRef`/
  `TableEditorController` не дублированы, тот же экспорт использует и headless-версия. Своя —
  только Tailwind-разметка подкомпонентов (`lib/fields/table/table-{header,row,footer,toolbar,cell}.ts`)
  и главный `field-table-editor.ts` (Reka `FieldRoot`/`FieldLabel`/`FieldError`, `onErrorCaptured`
  - `rekaUIKit.ErrorFallback` — тот же паттерн защиты рендера, что у остальных полей Этапа 6).
- Иконки — `lucide-vue-next` (`GripVertical` для drag handle, `X` для кнопки удаления строки),
  тот же набор, что у React shadcn-версии.
- Те же упрощения объёма, что у headless-версии (см. `libs/forms-vue/CHANGELOG.md` 0.11.0): без
  отдельного мобильного вида, native HTML5 DnD вместо `@dnd-kit`.
- Тест `app-form.stage6b.spec.ts` (тот же набор сценариев, что в headless-пакете, через
  `setupRekaPolyfills()`).

## 0.11.0 (2026-08-13)

Фаза 9, Этап 6 (часть 1) — тот же `FieldLikert`/`FieldMatrixChoice`, что в headless `forms-vue`
0.10.0, Reka/Tailwind-скин. Итог: 43 поля (было 41).

- Портированы 1:1 из `libs/forms-shadcn/src/lib/fields/{field-likert,field-matrix-choice}.tsx` —
  те же Tailwind-классы, что в React-версии.
- **`FieldLikert`** — `FieldWrapper` из `../uikit/primitives`, ряд кнопок-точек с
  `hover:scale-110`, `flex-wrap`, `showNumbers`.
- **`FieldMatrixChoice`** — `<table>` в `FieldWrapper`, три варианта (`radio`/`checkbox`/`rating`).
  Звезда в варианте `rating` — `lucide-vue-next` `Star`, тот же примитив, что уже используется в
  `FieldRating`, а не собственный SVG.
- `onErrorCaptured` + `rekaUIKit.ErrorFallback` — тот же паттерн защиты рендера, что у остальных
  полей пакета. `disabled` — явный проп поля, тот же принцип, что у `FieldRadioGroup`/
  `FieldCreditCard`.
- Тесты — новый файл `app-form.stage6.spec.ts`.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

## 0.10.0 (2026-08-13)

Фаза 9, Этап 5 закрыт целиком — тот же `FieldRichText`, что в headless `forms-vue` 0.9.0,
Reka/Tailwind-скин. Итог: 41 поле (было 40).

- Переиспользует `useRichTextField`/`RICH_TEXT_ACTIONS`/`DEFAULT_RICH_TEXT_BUTTONS`/
  `RICH_TEXT_BUTTON_LABELS` из `@letar/forms-vue/core` — здесь только Tailwind-разметка тулбара
  (иконки `lucide-vue-next` вместо текстовых глифов headless-пакета) и содержимого редактора.
  `createLazyField` тоже из `@letar/forms-vue/core` — тот же ленивый паттерн, без дублирования.
  `onErrorCaptured` + `rekaUIKit.ErrorFallback` — тот же паттерн защиты рендера, что у остальных
  полей пакета.
  `@tiptap/extension-link`/`@tiptap/extension-underline` убраны из зависимостей — дублировали
  расширения, уже включённые в `@tiptap/starter-kit` v3 (см. подробности в CHANGELOG
  `@letar/forms-vue` 0.9.0).
- Тесты — новый файл `app-form.stage5b.spec.ts`: загрузка + рендер тулбара/редактора, клик по
  кнопке «Полужирный» переключает `aria-pressed`, `toolbarButtons` сужает набор кнопок. Те же две
  ловушки ожидания, что у headless-пакета — двойной `requestAnimationFrame` после клика
  (`editor.state` за debounced `customRef`) и цикл реальных `setTimeout` вместо одного
  `flushPromises()` для резолва ленивого `import()`.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

## 0.9.0 (2026-08-13)

Фаза 9, Этап 5 (часть 2) — те же 3 поля, что в headless `forms-vue` 0.8.0, Reka/Tailwind-скин:
`FieldSignature`, `FieldAddress`, `FieldCity`. Итог: 40 полей (было 37). Остался только
`FieldRichText` из восьми полей Этапа 5.

- Переиспользуют `useSignatureField`/`useAddressSuggestions` из `@letar/forms-vue/core` — здесь
  только Tailwind-разметка (тулбар draw/typed, дропдаун подсказок вместо `letar-field__address-*`
  классов headless-пакета).
- `onErrorCaptured` + `rekaUIKit.ErrorFallback` — тот же паттерн защиты рендера, что у остальных
  полей пакета.
- Тесты — `app-form.spec.ts`, блок «Этап 5 (часть 2)».
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

## 0.8.0 (2026-08-13)

Фаза 9, Этап 5 (часть 1) — те же 4 поля, что в headless `forms-vue` 0.7.0, Reka/Tailwind-скин:
`FieldPinInput`, `FieldOTPInput`, `FieldColorPicker`, `FieldFileUpload`. Итог: 37 полей (было 33).

- PIN/OTP переиспользуют `usePinInputField`/`splitPinChars` из `@letar/forms-vue/core` — здесь
  только Tailwind-разметка ячеек, тот же приём, что у `FieldCreditCard`.
- `FieldColorPicker`/`FieldFileUpload` не входят в `ImplementedExtendedPrimitives` (см.
  `uikit-reka.ts`) — рисуются вне UIKit-контракта напрямую на Tailwind, тот же выбор, что у
  `FieldSwitch`/`FieldSlider`/`FieldRating`.
- `onErrorCaptured` + `rekaUIKit.ErrorFallback` — тот же паттерн защиты рендера, что у остальных
  полей пакета.
- Тесты — `app-form.spec.ts`, блок «Этап 5 (часть 1)».
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

## 0.7.0 (2026-08-13)

Фаза 9, Этап 3 (продолжение) — `FieldCreditCard` (compound-поле, отложено с основного захода
Этапа 3), Reka/Tailwind-скин. Итог: 33 поля (было 32).

- Логика полностью переиспользована из `useCreditCardField`/`cardBrandIcon`
  (`@letar/forms-vue/core`) — здесь только Tailwind-разметка на голых `<input>` (мульти-part
  виджет не укладывается в `UIKitInputProps`, тот же приём, что у документных полей Этапа 3).
- `onErrorCaptured` + `rekaUIKit.ErrorFallback` — тот же паттерн защиты рендера, что у остальных
  полей пакета.
- Тесты — `app-form.spec.ts`, блок «Этап 3 (продолжение)»: те же сценарии, что в headless-версии.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный.

## 0.6.1 (2026-08-13)

Рефакторинг без изменения публичного API: та же дедупликация, что в `forms-vue` 0.5.1 — общие
хелперы дата/число-виджетов вынесены в `@letar/forms-core/field-widgets`, локальные копии удалены.

## 0.6.0 (2026-08-13)

Фаза 9, Этап 4 — дата/число-виджеты (5 новых полей), Reka-скин: `FieldDateRange`,
`FieldDateTimePicker`, `FieldDuration`, `FieldSlider`, `FieldRating`. См. CHANGELOG `forms-vue`
0.5.0 — находка про отсутствие внешней библиотеки дат в этой группе полей общая для обоих
пакетов.

- `FieldDateRange`/`FieldDateTimePicker`/`FieldDuration` — те же пропсы и логика, что в headless,
  рисуют сырой `<input>` в обход `rekaUIKit.Input` (тот же приём, что у документных полей из
  Этапа 3) либо переиспользуют существующий `NumberInput`-примитив (`FieldDuration`).
- `FieldSlider` — `reka-ui` `SliderRoot`/`SliderTrack`/`SliderRange`/`SliderThumb`, не входит в
  UIKit-контракт (нет `Slider` в `UIKitExtendedPrimitives`) — тот же принцип, что у `FieldSwitch`.
- `FieldRating` — ряд кнопок-звёзд на иконке `Star` из `lucide-vue-next` (уже peer dependency
  пакета), тоже вне UIKit-контракта.
- Итог: 32 поля (было 27).
- Тесты — `app-form.spec.ts`, блок «Этап 4»: те же сценарии, что в headless-версии, плюс
  клавиатурное управление `Slider` (`ArrowRight` на сфокусированном `SliderThumb`).
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный.

## 0.5.0 (2026-08-13)

Фаза 9, Этап 3 — маски/документы (10 новых полей), Reka-скин поверх нового
`useMaskField` из `@letar/forms-vue/core` (см. CHANGELOG `forms-vue` 0.4.0 — composable общий,
здесь только стилизация).

- `document-field-base.ts` (Reka-версия `createDocumentField`) + 10 полей: `FieldMaskedInput`,
  `FieldPassport`, `FieldINN`, `FieldKPP`, `FieldOGRN`, `FieldSNILS`, `FieldBIK`,
  `FieldBankAccount`, `FieldCorrAccount`, `FieldPhone`.
- Как и `FieldPassword`, эти поля рисуют сырой `<input>` в обход `rekaUIKit.Input` (стилизация
  `NATIVE_INPUT_CLASS`) — `'live'`-режим `useMaskField` неконтролируемый, а `UIKitInputProps`
  требует `value`/`onChange`. `FieldPhone` — исключение, использует `rekaUIKit.Input` напрямую
  (контролируемое поле, форматтер `forms-core/phone`, не `useMaskField`).
- Каждое поле — `onErrorCaptured` + `rekaUIKit.ErrorFallback`, тот же паттерн, что у остальных
  полей пакета, собранных напрямую (не через `createField`).
- Итог: 27 полей (было 17). `FieldCreditCard` отложен — см. CHANGELOG `forms-vue` 0.4.0.
- Тесты — `src/lib/app-form.spec.ts`, блок «Этап 3»: те же сценарии, что в headless-версии,
  через `rekaUIKit`/`FieldWrapper`.

## 0.4.0 (2026-08-13)

Фаза 9, Этап 2 — select-family на `rekaUIKit`: `FieldRadioGroup`, `FieldNativeSelect`,
`FieldSwitch` (три поля, отложенные с Этапа 1). Закрывает недостающие 3 из 14→17 полей —
теперь весь набор Этапа 1 полностью портирован и на Reka-скин, не только на headless.

- Новые Reka-примитивы UIKit-контракта: `RadioGroup` (`RadioGroupRoot`/`RadioGroupItem`/
  `RadioGroupIndicator` из `reka-ui`, паритет разметки с React `radio-group.tsx`) и
  `NativeSelect` (обычный `<select>`, паритет с React `native-select.tsx`) —
  `ImplementedExtendedPrimitives` в `uikit-reka.ts` расширен с 3 до 5.
- `FieldSwitch` — **не через UIKit-контракт** (`Switch` не входит в `UIKitExtendedPrimitives`,
  тот же вывод, что и в React `forms-shadcn/field-switch.tsx`): рисуется напрямую на
  `SwitchRoot`/`SwitchThumb` из `reka-ui`, стилизация 1:1 с React-версией.
- `FieldRadioGroup`/`FieldNativeSelect` собраны как `FieldSelect` — `options` вне контракта
  `createField`, `useAppFormContext`/`resolveFieldMeta`/`withFieldValidation` напрямую.
- Тесты — `src/lib/app-form.spec.ts`, блок «Этап 2»: рендер контролов, клик по
  radio-опции, выбор в native `<select>`, переключение `Switch`.

## 0.3.0 (2026-08-13)

Фаза 9, Этап 1 (продолжение) — 8 новых полей на `rekaUIKit`, подмножество нового набора
`@letar/forms-vue` (полностью: `FieldNumberInput`, `FieldPassword`, `FieldDate`, `FieldTime`,
`FieldCurrency`, `FieldPercentage`, `FieldHidden`, `FieldYesNo`). `FieldSwitch`/`FieldRadioGroup`/
`FieldNativeSelect` отложены на Этап 2 — нужны новые Reka UI-примитивы
(`Switch`/`RadioGroup`/`NativeSelect`), которых пока нет в `rekaUIKit`.

- Поля без своего Reka-примитива переиспользуют уже существующие (`Input` → Password/Date/Time,
  `NumberInput` → NumberInput/Currency/Percentage).
- `FieldPassword` — единственное поле, которому нужен локальный `ref` (видимость), поэтому оно
  не через `createField` (нет `useFieldState`), а напрямую через `resolveFieldMeta`/
  `withFieldValidation` + собственный `onErrorCaptured`, как `FieldSelect`.
- `FieldHidden`/`FieldYesNo` не используют `rekaUIKit` вовсе (нет визуального контрола/своя
  вёрстка на Tailwind-классах) — тот же выбор, что в headless-версии.
- Тесты — `src/lib/app-form.spec.ts`, блок «Этап 1»: рендер контролов всех 8 полей,
  переключение видимости пароля.

## 0.2.0 (2026-08-13)

Фаза 9 (`libs/forms/PLAN.md`, тред `forms-vue-parity-phase9`), Этап 1.

- ⚠️ **Ломающее изменение (пакет в beta, внешних потребителей нет — согласовано координатором):**
  `useAppFormContext`, `AppForm` и вся композиционная логика теперь берутся из
  `@letar/forms-vue/core`, не из корневого `@letar/forms-vue`. `createFieldPrimitives` (в
  `field/create-field-primitives.ts`) и поля `FieldSelect`/`FieldCombobox` (собранные напрямую,
  не через фабрику) переиспользуют `resolveFieldMeta`/`withFieldValidation` из `forms-vue/core`
  вместо копии той же логики — дублирование обвязки (разбор Zod-меты, обёртка `form.Field`,
  извлечение ошибки валидации) устранено.
- Публичный API самого `@letar/forms-vue-shadcn` (`createField`, `FieldWrapper`, 6 полей,
  `rekaUIKit`) не изменился — поменялся только внутренний источник композиционной логики.

Первый релиз — Поток 1 письма координатора форм `QuietRidge` (тред `forms-phase7-3-shadcn`,
письмо #61): полноценный Reka UI-скин `UIKit`-контракта из `forms-core` для Vue, аналог
`@letar/forms-shadcn` для React.

- `rekaUIKit` — реализация `UIKit`-контракта на [Reka UI](https://reka-ui.com) + Tailwind + cva:
  core-примитивы (`FieldRoot`/`FieldLabel`/`FieldError`/`Input`/`Checkbox`/`Select`) + минимум
  extended (`NumberInput`/`Combobox`/`ErrorFallback`), нужный 6 полям.
- `createFieldPrimitives(uikit)` — Vue-версия композиционного слоя из `@letar/forms-react`
  (Фаза 7.3), не копия 1:1: ошибку рендера поля ловит `onErrorCaptured` в `setup()`, а не
  классовый `ErrorBoundary` (паттерна которого в Vue нет).
- 6 полей: `FieldString`, `FieldNumber`, `FieldCheckbox`, `FieldTextarea`, `FieldSelect`,
  `FieldCombobox`.
- Каждый примитив `rekaUIKit` — обычная функция `(props) => VNode`, не `defineComponent`:
  контракт `(props) => TNode` совпадает с сигнатурой плоской функции буквально, композиционный
  слой вызывает примитивы напрямую внутри чужого render-контекста.
- Тесты — vitest + `@vue/test-utils`, `src/lib/app-form.spec.ts` (метки из схемы, ошибка
  валидации, блокировка сабмита, чекбокс по клику, успешный сабмит, guard «поле вне `<AppForm>`»).
  Полифиллы `ResizeObserver`/`hasPointerCapture`/`scrollIntoView` — стандартный минимум для
  тестирования Radix/Reka-компонентов в jsdom.
- Минимальный dev-харнесс на голом Vite (`nx run @letar/forms-vue-shadcn:demo`, порт 5173,
  `.claude/launch.json`) — не Nx-приложение, в монорепо нет Vue+Vite приложений.
- **Находка задачи:** UIKit-контракт (`forms-core/uikit/types.ts`) уже полностью
  framework-agnostic (`TNode` — обобщённый параметр) — Vue-версия контракта заводить не
  потребовалось, только реализация под конкретный TNode (`VNode | string | null`).
