# Changelog @letar/forms-vue-shadcn

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
