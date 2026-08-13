# Changelog @letar/forms-vue-shadcn

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
