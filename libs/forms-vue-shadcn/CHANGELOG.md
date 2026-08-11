# Changelog @letar/forms-vue-shadcn

## 0.1.0 (2026-08-12)

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
