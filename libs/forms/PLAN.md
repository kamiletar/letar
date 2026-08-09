# PLAN.md — @letar/forms

План развития UI-библиотеки компонентов форм.

---

## Backlog (запросы от агентов)

### [2026-08-09] Checkbox: клик по label/тексту не переключает состояние (от svoichuzhie)

- **Запросил:** SunnyTower
- **Приоритет:** high
- **Описание:** `FieldCheckbox` (`src/lib/declarative/form-fields/boolean/field-checkbox.tsx`)
  рендерит Chakra v3 `Checkbox.Root` как `<label data-part="root">` вокруг скрытого `<input>` +
  `<div data-part="control">` (визуальный квадратик) + `<span data-part="label">` (текст). Клик
  по `<label>` целиком — включая клик прямо по тексту рядом с чекбоксом — **не переключает
  checked-состояние вообще**. Работает только клик именно по `[data-part="control"]` (или
  напрямую по `<input>` с `force`). Реальный пользователь, кликающий интуитивно по тексту
  (стандартное ожидание для `<label>`), не сможет отметить чекбокс. Не гонка/timing —
  воспроизведено детерминированно через Playwright trace (0 успехов из множества попыток за
  15с). Похоже, Zag.js checkbox-машина (через Ark UI) вешает обработчик клика конкретно на
  `control`, не на `root`/`label`, и не полагается на нативное browser-поведение label→input
  forwarding. Найдено на `svoichuzhie` (`03-subscription.spec.ts`, форма подписки в footer) —
  деплой был заблокирован e2e-гейтом, диагностика через `trace.zip` на staging (BlackCove,
  Deploy Agent). Обход на уровне теста — клик по `[data-part="control"]` вместо `label`
  (`apps/svoichuzhie-e2e/src/03-subscription.spec.ts`, коммит `241802c9`) — но сам компонент
  остаётся сломан для живых пользователей во всех приложениях на `@letar/forms` `Field.Checkbox`.
- **Статус:** ✅ расследовано 2026-08-09 (forms-dev) — **не баг `FieldCheckbox`**, закрыто без
  изменений в `libs/forms`. Реальная причина найдена и подтверждена и в jsdom (RTL/vitest), и в
  реальном Chromium (Claude Browser pane, dev-сервер svoichuzhie на месте):
  - Плоский текстовый `Form.Field.Checkbox` (без вложенных элементов в `label`) переключается
    штатно кликом в ЛЮБУЮ точку `<label>`, включая текст — воспроизведено юнит-тестом
    (`userEvent.click` по тексту лейбла) и реальным кликом в Chromium на `form-develop-app`
    (`newsletter` чекбокс). Исходное предположение «Zag.js вешает toggle только на `control`,
    не на `root`/`label`» — неверно: `getRootProps()` из `@zag-js/checkbox` действительно не
    делает toggle сама, но нативное browser-поведение `<label>`→`<input>` forwarding работает и
    переключает скрытый `<input>`, откуда идёт `onChange`/`onCheckedChange` в форму.
  - Настоящая причина именно у `svoichuzhie` — `SubscribeForm` (`apps/svoichuzhie/src/app/_components/subscribe-form.tsx`)
    оборачивает часть текста согласия в `<a href="/privacy">`. Текст переносится на 2 строки, и
    геометрический ЦЕНТР bounding box всего `<label>` (куда `Playwright.click()` кликает по
    умолчанию) физически попадает ВНУТРЬ этой ссылки — подтверждено вычислением
    `getBoundingClientRect()` прямо на dev-сервере (`centerIsInsideLink: true`). Клик по ссылке
    **тоже переключает чекбокс** (проверено), но **ОДНОВременно уводит навигацией на `/privacy`**
    (реальный клик по `<a href>`), после чего Playwright-локаторы на исходной странице
    (`consentCheckbox.isChecked()`/`toBeChecked()`) обращаются к отсутствующим/detached элементам
    и падают детерминированно на каждой попытке — это и дало «0 успехов за 15с», а не отказ
    toggle-логики.
  - **Рекомендация владельцу svoichuzhie:** добавить `target="_blank" rel="noopener"` на `<a
    href="/privacy">` внутри `Checkbox.Label` в `subscribe-form.tsx` — убирает уводящую навигацию
    с текущей страницы (заодно человечнее: пользователь не теряет заполненную форму, кликнув
    политику). Обход в `03-subscription.spec.ts` (клик по `[data-part="control"]`, коммит
    `241802c9`) можно оставить как есть — он корректен и не создаёт проблем, откатывать не
    обязательно.
  - Общий вывод для всех потребителей `@letar/forms`: `Form.Field.Checkbox` с обычным текстовым
    `label` — безопасен и работает предсказуемо. Вкладывать в `label` навигирующую ссылку без
    `target="_blank"` — общий footgun (клик по ссылке одновременно переключает чекбокс И уводит
    со страницы), стоит иметь в виду при консент-чекбоксах в других приложениях (152-ФЗ паттерн
    встречается не только у svoichuzhie).
  - Полная переписка и цепочка экспериментов — в agent-mail, тред `form-svoichuzhie-checkbox-label`.

---

## ✅ v1.4.2 (2026-07-16) — фикс GET-утечки данных в URL до hydration

Найдено кросс-приложенческим аудитом логин-форм монорепо (находка auth-hub v0.6.4): корневой
`<form>` в `FormSimple` и `FormWithApi` (`src/lib/declarative/form-root/`) не имел
`method="post"` — до гидрации React форма сабмитится нативным GET, чувствительные поля (пароли и
т.п.) попадают в URL/history/Referer/access-логи. Риску были подвержены **все** приложения на
`@letar/forms`, не только точечные raw-формы вне библиотеки. Фикс — аддитивный HTML-атрибут,
`onSubmit`+`preventDefault()` как и раньше перехватывает сабмит до навигации браузера — поведение
форм не меняется, breaking changes нет.

---

## Текущее состояние (Фаза 1) ✅

### Реализовано

| Компонент                           | Описание                                      | Статус |
| ----------------------------------- | --------------------------------------------- | ------ |
| `useAppForm`                        | Хук формы из `createFormHook`                 | ✅     |
| `withForm`                          | HOC для композиции форм                       | ✅     |
| `fieldContext`, `formContext`       | Контексты TanStack Form                       | ✅     |
| `useFieldContext`, `useFormContext` | Хуки доступа к контекстам                     | ✅     |
| `FormGroup`                         | Контекст для группировки полей                | ✅     |
| `FormField`                         | Контекст для именования полей                 | ✅     |
| `TanStackFormField`                 | Интеграция с TanStack Form field API          | ✅     |
| `ChakraFormField`                   | Chakra UI v3 Field с автоматическими ошибками | ✅     |
| `FormGroupList`                     | Поддержка массивов с операциями               | ✅     |
| `FormGroupListItem`                 | Обёртка элемента массива                      | ✅     |
| `createForm()`                      | Фабрика для app-specific форм                 | ✅     |
| `extraSelects` в createForm         | Расширение Select компонентами                | ✅     |
| `extraComboboxes` в createForm      | Расширение Combobox компонентами              | ✅     |

### Структура файлов

```
libs/forms/
├── src/
│   ├── index.ts                    # Публичный API
│   ├── lib/
│   │   ├── context.ts              # createFormHookContexts
│   │   ├── form-hook.ts            # createFormHook + useAppForm + withForm
│   │   ├── form-group.tsx          # FormGroup + useFormGroup
│   │   ├── form-field.tsx          # FormField + useFormField
│   │   ├── tanstack-form-field.tsx # TanStackFormField + useTanStackFormField
│   │   ├── chakra-form-field.tsx   # ChakraFormField
│   │   ├── form-group-list.tsx     # FormGroupList + FormGroupListItem
│   │   └── types.ts                # BaseFieldProps и типы
├── package.json
├── vite.config.mts
└── tsconfig.json
```

---

## Фаза 2: Field компоненты ✅

Готовые к использованию field компоненты с интеграцией Chakra UI v3.

### Реализованные компоненты (37)

**Текстовые поля:**

| Компонент                     | Описание                          | Статус |
| ----------------------------- | --------------------------------- | ------ |
| `Form.Field.String`           | Текстовое поле (text, email, url) | ✅     |
| `Form.Field.Textarea`         | Многострочный текст               | ✅     |
| `Form.Field.Password`         | Пароль с toggle visibility        | ✅     |
| `Form.Field.PasswordStrength` | Пароль с индикатором силы         | ✅     |
| `Form.Field.Editable`         | Inline редактирование             | ✅     |
| `Form.Field.RichText`         | WYSIWYG редактор (Tiptap)         | ✅     |

**Числовые поля:**

| Компонент                | Описание                   | Статус |
| ------------------------ | -------------------------- | ------ |
| `Form.Field.Number`      | Простое числовое поле      | ✅     |
| `Form.Field.NumberInput` | Числовое поле со стрелками | ✅     |
| `Form.Field.Slider`      | Ползунок для диапазонов    | ✅     |
| `Form.Field.Rating`      | Рейтинг звёздами           | ✅     |
| `Form.Field.Currency`    | Денежное поле              | ✅     |
| `Form.Field.Percentage`  | Процентное поле            | ✅     |

**Дата и время:**

| Компонент                   | Описание                       | Статус |
| --------------------------- | ------------------------------ | ------ |
| `Form.Field.Date`           | Поле даты                      | ✅     |
| `Form.Field.Time`           | Поле времени                   | ✅     |
| `Form.Field.DateRange`      | Диапазон дат с пресетами       | ✅     |
| `Form.Field.DateTimePicker` | Дата и время вместе            | ✅     |
| `Form.Field.Duration`       | Длительность (HH:MM)           | ✅     |
| `Form.Field.Schedule`       | Редактор недельного расписания | ✅     |

**Выбор из списка:**

| Компонент                   | Описание                       | Статус |
| --------------------------- | ------------------------------ | ------ |
| `Form.Field.Select`         | Стилизованный Select           | ✅     |
| `Form.Field.NativeSelect`   | Нативный браузерный Select     | ✅     |
| `Form.Field.Combobox`       | Searchable select с группами   | ✅     |
| `Form.Field.Autocomplete`   | Текстовое поле с подсказками   | ✅     |
| `Form.Field.Listbox`        | Listbox single/multi selection | ✅     |
| `Form.Field.RadioGroup`     | Группа радиокнопок             | ✅     |
| `Form.Field.RadioCard`      | Card-based radio selection     | ✅     |
| `Form.Field.SegmentedGroup` | Segmented control              | ✅     |

**Множественный выбор:**

| Компонент                 | Описание                   | Статус |
| ------------------------- | -------------------------- | ------ |
| `Form.Field.Checkbox`     | Чекбокс                    | ✅     |
| `Form.Field.CheckboxCard` | Card-based multi selection | ✅     |
| `Form.Field.Switch`       | Переключатель              | ✅     |
| `Form.Field.Tags`         | Ввод тегов                 | ✅     |

**Специализированные:**

| Компонент                | Описание                         | Статус |
| ------------------------ | -------------------------------- | ------ |
| `Form.Field.PinInput`    | Ввод PIN/OTP кода                | ✅     |
| `Form.Field.OTPInput`    | OTP код с таймером resend        | ✅     |
| `Form.Field.ColorPicker` | Выбор цвета                      | ✅     |
| `Form.Field.FileUpload`  | Загрузка файлов                  | ✅     |
| `Form.Field.Phone`       | Телефон с маской                 | ✅     |
| `Form.Field.MaskedInput` | Универсальная маска              | ✅     |
| `Form.Field.Address`     | Адрес с автодополнением (DaData) | ✅     |

### Архитектура (v0.28.0)

Все field-компоненты используют общие утилиты для устранения дублирования кода:

```typescript
// field-utils.ts — работа с ошибками
import { formatFieldErrors, hasFieldErrors } from './field-utils'

// use-resolved-field-props.ts — резолв пропсов из схемы и контекста
import { useResolvedFieldProps } from './use-resolved-field-props'
```

**Паттерн компонента:**

```typescript
export function FieldExample({ name, label, placeholder, helperText, required, disabled, readOnly, ...rest }) {
  const {
    form,
    fullPath,
    label: resolvedLabel,
    placeholder: resolvedPlaceholder,
    helperText: resolvedHelperText,
    required: resolvedRequired,
    disabled: resolvedDisabled,
    readOnly: resolvedReadOnly,
  } = useResolvedFieldProps(name, { label, placeholder, helperText, required, disabled, readOnly })

  return (
    <form.Field name={fullPath}>
      {(field) => {
        const errors = field.state.meta.errors
        const hasError = hasFieldErrors(errors)
        // ...
        {
          hasError && <Field.ErrorText>{formatFieldErrors(errors)}</Field.ErrorText>
        }
      }}
    </form.Field>
  )
}
```

### Выполненные задачи

- [x] Реализовать все 37 field-компонентов
- [x] Создать утилиты `field-utils.ts` и `use-resolved-field-props.ts`
- [x] Рефакторинг всех компонентов на общие утилиты (v0.28.0)
- [x] Исправить баги с form-level disabled/readOnly
- [x] Обновить `createForm()` с новыми типами
- [x] Обновить документацию

### Оставшиеся задачи

**Тестирование:**

- [ ] Написать E2E тесты для каждого компонента (частично — 25 демо-тестов есть)
- [x] Unit-тесты P0-P1: Phone, FileUpload, Currency, Percentage, Slider, Switch, Time, Duration, NativeSelect, RadioGroup (v0.83.0)
- [x] Unit-тесты P2: Combobox, ImageChoice, Likert, MatrixChoice, YesNo, Hidden, Textarea, Password, PasswordStrength, MaskedInput, DateRange, DateTimePicker (v0.83.0)
- [x] Unit-тесты P3: CreditCardSchema, KPP validator, table-utils (6 функций), captcha verify, useConversationalState (v0.84.0)

---

## Фаза 3: Form компоненты ✅

Компоненты уровня формы для типичных паттернов.

### Реализованные компоненты

| Компонент                           | Описание                                        | Статус |
| ----------------------------------- | ----------------------------------------------- | ------ |
| `Form.Button.Submit`                | Кнопка отправки с автоматическим loading        | ✅     |
| `Form.Button.Reset`                 | Кнопка сброса формы                             | ✅     |
| `Form.Errors`                       | Отображение глобальных ошибок формы             | ✅     |
| `Form.DirtyGuard`                   | Предупреждение при уходе с несохранённой формой | ✅     |
| `Form.When`                         | Условный рендеринг полей                        | ✅     |
| `Form.Steps`                        | Контейнер для мультистеп форм                   | ✅     |
| `Form.Steps.Step`                   | Отдельный шаг                                   | ✅     |
| `Form.Steps.Indicator`              | Индикатор прогресса                             | ✅     |
| `Form.Steps.Navigation`             | Навигация между шагами                          | ✅     |
| `Form.Steps.CompletedContent`       | Контент после завершения                        | ✅     |
| `Form.OfflineIndicator`             | Индикатор оффлайн режима                        | ✅     |
| `Form.SyncStatus`                   | Статус синхронизации                            | ✅     |
| `Form.Group.List.Button.Add`        | Кнопка добавления элемента                      | ✅     |
| `Form.Group.List.Button.Remove`     | Кнопка удаления элемента                        | ✅     |
| `Form.Group.List.Button.DragHandle` | Ручка для перетаскивания (DnD)                  | ✅     |

### Задачи

- [x] Реализовать `Form.Button.Submit` — кнопка отправки
- [x] Реализовать `Form.Button.Reset` — кнопка сброса
- [x] Реализовать `Form.Errors` — отображение ошибок формы
- [x] Реализовать `Form.DirtyGuard` — предупреждение при уходе
- [x] Реализовать `Form.When` — условный рендеринг
- [x] Реализовать `Form.Steps` — мультистеп формы
- [x] Реализовать `Form.OfflineIndicator` — индикатор оффлайн
- [x] Обновить документацию

---

## Фаза 4: DevTools и отладка ✅

Интеграция TanStack Form DevTools для отладки форм.

### Задачи

- [x] Установить `@tanstack/react-devtools` и `@tanstack/react-form-devtools`
- [x] Интегрировать в form-develop-app
- [x] Интегрировать в driving-school
- [x] Интегрировать в premium-rosstil
- [x] Интегрировать в imot (+ создан /api/model + QueryProvider)

### Интеграция

```typescript
// apps/*/query-provider.tsx
import { TanStackDevtools } from '@tanstack/react-devtools'
import { formDevtoolsPlugin } from '@tanstack/react-form-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'

// В JSX:
{
  process.env.NODE_ENV === 'development' && (
    <TanStackDevtools
      plugins={[
        { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel />, defaultOpen: false },
        formDevtoolsPlugin(),
      ]}
    />
  )
}
```

---

## Рефакторинг кода ✅

Улучшения архитектуры и качества кода.

### v0.50.0 — DRY/SOLID рефакторинг

- [x] **SelectionFieldLabel** — общий компонент для label+tooltip в selection полях (устранено дублирование в 12 файлах)
- [x] **useGroupedOptions** — хук группировки опций (Combobox, Listbox, Select)
- [x] **getOptionLabel** — утилита для получения label опции (заменяет `typeof opt.label === 'string'` паттерн)
- [x] **zod-utils.ts** — централизованные `unwrapSchema`, `unwrapSchemaWithRequired` (устранено дублирование в 4 файлах)
- [x] **extractConstraints** — generic handler pattern для constraint extraction в schema-constraints.ts
- [x] **Защита от циклов** — WeakSet + MAX_DEPTH=20 в schema-traversal.ts
- [x] **SWITCH_STYLES** — константы вместо magic numbers в field-schedule.tsx
- [x] **FormSteps декомпозиция** — разбит на хуки: `useStepState`, `useStepPersistence`, `useStepNavigation`
- [x] **LinkPopover** — модальное окно вместо `window.prompt()` в field-rich-text.tsx
- [x] **try/catch для JSON.parse** — в field-rich-text.tsx

**Результат:** ~500 строк дублирования устранено, улучшена maintainability и robustness.

### v0.28.0 — Предыдущий рефакторинг

- [x] **Удаление дубликатов FieldLabel/FieldTooltip** — удалены дублирующиеся файлы из `form-fields/`
- [x] **Унификация Selection через createField** — 8 компонентов переведены на createField factory:
  - FieldRadioGroup, FieldSegmentedGroup — простые, без state
  - FieldSelect — useMemo для collection через useFieldState
  - FieldRadioCard — useCallback для keyboard navigation
  - FieldCheckboxCard — простой, без state
  - FieldListbox — useMemo для collection и groups
  - FieldCombobox — сложный с useState, useDebounce, useMemo, useQuery
  - FieldAutocomplete — аналогично Combobox, упрощённый
  - **Результат:** -165 строк кода, унифицированный паттерн

### Планируемые задачи

- [x] **Унификация Options interfaces** — BaseOption, GroupableOption, RichOption в option-types.ts
- [x] **Общий FieldSize тип** — FieldSize, FieldSizeWithoutXs, FieldSizeExtended в size-types.ts
- [x] **useAsyncSearch хук** — общая логика debounce + search для Combobox/Autocomplete

---

## Фаза 5: Расширенные возможности ✅

Продвинутые паттерны и интеграции.

### Реализованные возможности

- [x] **localStorage Persistence** ✅ — сохранение данных формы в localStorage:
  - ✅ Автоматическое сохранение при изменении (с debounce)
  - ✅ Восстановление при перезагрузке страницы
  - ✅ **Dialog** для подтверждения восстановления ("Восстановить данные?" / "Начать заново")
  - ✅ Настраиваемый ключ хранилища
  - ✅ TTL (время жизни черновика) — `ttl` опция в `FormPersistenceConfig`
  - ✅ Кнопка "Очистить черновик" — `ClearDraftButton` компонент в результате хука

### Планируемые возможности

Все основные возможности реализованы. `useOfflineForm` доступен через `@letar/forms/offline`.

> **Примечание:** File Upload, Rich Text, Autocomplete, Multi-select (Tags), Date Range реализованы в Фазе 2.

### localStorage Persistence API

```tsx
// Использование через хук
const persistence = useFormPersistence<MyFormData>({
  key: 'recipe-form-draft',
  ttl: 24 * 60 * 60 * 1000, // 24 часа — черновик протухнет через сутки
  debounceMs: 500, // Задержка автосохранения
  dialogTitle: 'Восстановить черновик?',
  dialogDescription: 'Обнаружен несохранённый черновик.',
  clearDraftButtonText: 'Очистить черновик',
})

// Подписка на изменения формы
useEffect(() => {
  return form.store.subscribe(() => {
    persistence.saveValues(form.state.values)
  })
}, [form.store, persistence.saveValues])

// Отображение времени сохранения
{persistence.savedAt && (
  <Text fontSize="sm" color="gray.500">
    Черновик от {new Date(persistence.savedAt).toLocaleTimeString()}
  </Text>
)}

// Кнопка очистки черновика
<persistence.ClearDraftButton />

// Диалог восстановления
<persistence.RestoreDialog />
```

### Dialog восстановления

При обнаружении сохранённых данных показывается Dialog:

```
┌─────────────────────────────────────────┐
│  Восстановить несохранённые данные?     │
│                                         │
│  Обнаружен черновик от 15:30.           │
│  Хотите продолжить редактирование?      │
│                                         │
│  [Начать заново]  [Восстановить]        │
└─────────────────────────────────────────┘
```

---

## Правила проектирования схемы БД для Combobox

Для корректной работы `Form.Field.Combobox` с TanStack Query и ZenStack hooks необходимо соблюдать следующие правила:

### 1. Обязательные поля для поиска

Каждая модель, используемая в Combobox, должна иметь:

```prisma
model Entity {
  id    String @id @default(cuid())
  label String // Отображаемое значение (обязательно)
  // или
  name  String // Альтернативное имя поля
}
```

### 2. Индексы для производительности

```prisma
model Entity {
  id    String @id @default(cuid())
  label String

  @@index([label]) // Индекс для поиска
}
```

### 3. Конвенция для ZenStack hooks

```typescript
// Combobox автоматически использует:
// - useFindMany{Model} для загрузки
// - where: { label: { contains: searchTerm, mode: 'insensitive' } }

// Пример кастомной интеграции:
<Form.Field.Combobox
  name="userId"
  label="Пользователь"
  useQuery={(search) =>
    useFindManyUser({
      where: { name: { contains: search, mode: 'insensitive' } },
      take: 20,
    })}
  getLabel={(user) => user.name}
  getValue={(user) => user.id}
/>
```

### 4. Группировка результатов

Для группировки добавить поле категории:

```prisma
model Product {
  id       String @id @default(cuid())
  name     String
  category String // Поле для группировки

  @@index([name])
  @@index([category])
}
```

```tsx
<Form.Field.Combobox name="productId" groupBy={(product) => product.category} />
```

---

## Метрики успеха

| Метрика               | Цель | Текущее                                                      |
| --------------------- | ---- | ------------------------------------------------------------ |
| Компоненты контекстов | 6    | 6 ✅                                                         |
| Field компоненты      | 56   | 56 ✅                                                        |
| Form компоненты       | 20+  | 20+ ✅                                                       |
| Утилиты рефакторинга  | 2    | 2 ✅                                                         |
| Тестовое покрытие     | >80% | ~95% ✅ (112 файлов, 1074 теста)                             |
| Документация          | 100% | 100% ✅ (docs/fields.md: 56 полей, docs/analytics.md создан) |
| DX фичи (Фаза 6)      | 7    | 7 ✅                                                         |

---

## Приоритеты

1. ~~**Критический** — Фаза 2 (field компоненты)~~ ✅ Завершено
2. ~~**Высокий** — Фаза 3 (form компоненты)~~ ✅ Завершено
3. ~~**Средний** — Фаза 4 (DevTools)~~ ✅ Завершено
4. ~~**Низкий** — Фаза 5 (расширенные возможности)~~ ✅ Завершено
5. ~~**Средний** — Тестирование~~ ✅ 112 файлов, 1074 теста
6. ~~**Высокий** — Фаза 6 (DX фичи)~~ ✅ Завершено (v0.80.0)
7. ~~**Средний** — Аудит документации~~ ✅ v0.84.2 — 56 полей в docs/fields.md, analytics.md создан

---

## Технический долг / Known Issues

### Исправлено в v0.28.0

- [x] **Баги с form-level disabled/readOnly** — все 37 field-компонентов теперь корректно наследуют `disabled` и `readOnly` из контекста формы
- [x] **Дублирование кода** — создан рефакторинг с `useResolvedFieldProps` и `formatFieldErrors`/`hasFieldErrors`

### React Hooks в render callbacks

Следующие компоненты используют React hooks (`useMemo`, `useCallback`) внутри render callbacks `form.Field`, что нарушает правила hooks. Это вызывает предупреждения в консоли:

```
Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks.
```

**Требуется рефакторинг:**

- [x] `Form.Field.Schedule` — извлечь внутренний контент в отдельный компонент (ScheduleContent в v0.50.0)

**Уже исправлено:**

- [x] `Form.Field.ColorPicker` — исправлено извлечением `ColorPickerFieldContent`

---

## Backlog / Очередь задач

### Запросы от агентов

#### [2026-07-22] `Form.Field.Phone` — не проходит ввод в WebKit e2e (от dsperevod) ✅ ГОТОВО

- **Запросил:** root-weaver
- **Приоритет:** high
- **Описание:** `apps/dsperevod-e2e/src/callback-drawer.spec.ts` — все 4 теста (маска телефона + 3 сценария отправки) падают **только в WebKit**, все — на шаге ввода телефона (`phoneInput.pressSequentially('9185568172', { delay: 20 })` не приводит к ожидаемому значению маски). Chromium/Firefox проходят. Обнаружено §18.7 Тираж M1 batch2 (staging-e2e-гейт), не диагностировано глубоко — не в скоупе root-weaver (компонент `FieldPhone`, `libs/forms/src/lib/declarative/form-fields/specialized/field-phone.tsx`, использует `use-mask-input`/`withMask`, юнит-тестов на реальный ввод клавиш нет, только рендер/начальное значение — `field-phone.spec.tsx`). Подозрение: `withMask`/событийная модель WebKit (Safari) не синхронизируется с `pressSequentially` так же, как Chromium/Firefox — известный класс проблем у masked-input библиотек в WebKit.
- **Статус:** ✅ готово — v1.4.4 (коммит `58eb9d1b`), маска телефона переписана на чистый JS
  форматтер вместо `use-mask-input` (imask мутировал DOM в обход React, конфликтовало с
  controlled `value` при быстром посимвольном вводе в WebKit). Готово к перепроверке
  `dsperevod-e2e --project=webkit` со стороны root-weaver/dsperevod (thread
  `form-dsperevod-phone-webkit`, ответ forms-dev 2026-08-09)

#### [2026-06-12] Провайдер Yandex SmartCaptcha для Form.Captcha (от svoichuzhie)

- **Запросил:** MagentaRaven
- **Приоритет:** high
- **Описание:** новый провайдер `smartcaptcha` рядом с turnstile/recaptcha/hcaptcha (`libs/forms/src/lib/captcha/`). Причина: РФ-проект (152-ФЗ) — Turnstile/reCAPTCHA отправляют IP и телеметрию браузера на зарубежные серверы (трансграничная передача ПДн), SmartCaptcha хранит данные в РФ. Серверная верификация: `POST https://smartcaptcha.yandexcloud.net/validate`. Нужно к Фазе 1–2 svoichuzhie (регистрация фан-клуба, подписка) — сейчас не блокирует (идёт Фаза 0, дизайн).
- **Статус:** ожидание — не начато, forms-dev берёт следующим сразу после checkbox-бага
  (thread `form-svoichuzhie-smartcaptcha`, статус подтверждён 2026-08-09)

#### [2026-08-04] Серверный код forms не под `src/server/` — граница `no-restricted-imports` его не видит

- **Запросил:** GoldCreek (аудит границ `src/server/` на auth/pin-auth/cdek/forms)
- **Приоритет:** low
- **Описание:** `src/lib/captcha/verify.ts` (серверная верификация CAPTCHA) и `src/lib/server-errors/*` (экспортируется как `./server-errors` в `exports`) лежат в `src/lib/`, а не в `src/server/`. Правило `no-restricted-imports` в корневом `eslint.config.mjs` матчит только `**/src/server/**` — эти файлы вне его области. Нарушений сейчас нет (React/Chakra не тянут), но граница не защищает от будущей регрессии. Перенос меняет публичную поверхность API (`exports["./server-errors"]` в `libs/forms/package.json`, JSDoc-пример в `verify.ts` → `@letar/forms/captcha/server`) — паттерн есть готовый, образец `@letar/auth` (`src/server/` + `./server` в `exports` + `paths` на подпуть в каждом приложении-потребителе).
- **Статус:** ожидание (не блокирует)

### Документация и DX

- [x] **Улучшить документацию по обработке ошибок** — добавлено в `.claude/docs/forms.md`:
  - Паттерны возврата ошибок из Server Actions (простой и расширенный)
  - Обработка серверных ошибок в `onSubmit` (toast, fieldErrors)
  - Отображение глобальных ошибок формы (`<Form.Errors />`)
  - Типизация результатов (discriminated unions)

### Концепция переиспользуемых форм ✅

Реализовано через `createForm()`:

- App-specific формы (`DrivingSchoolForm`, `ImotForm`, `PremiumRosstilForm`)
- Автогенерируемые Select для всех ENUM'ов
- Combobox для асинхронного поиска моделей
- `withUIMeta` для обогащения ZenStack схем

---

## Англификация и Address Provider (v0.58.0) ✅

### Англификация для npm

- [x] Все JSDoc/комментарии/runtime ошибки переведены на английский (118 файлов)
- [x] Default UI строки на английском: "Save", "Reset", "Unsaved changes", "Leave", "Stay"
- [x] `build:npm` копирует `README.en.md` → `dist/README.md` + `README.ru.md`
- [x] 513 тестов обновлены и проходят

### Pluggable Address Provider

- [x] `AddressProvider` интерфейс для подключаемых сервисов геокодинга
- [x] `createDaDataProvider()` — встроенный провайдер DaData (Россия)
- [x] `createForm({ addressProvider })` — провайдер задаётся один раз
- [x] Приоритет: field prop → createForm context → token fallback → env
- [x] Обратная совместимость: `token` prop продолжает работать
- [x] `AddressValue.data` обобщён до `Record<string, unknown>`

---

## Фаза 6: Developer Experience — новые фичи ✅

> **Источник:** Исследование болей разработчиков с формами в React (апрель 2026).
> Реализовано в v0.80.0. 59 unit/render тестов + 13 E2E + 16 бенчмарков.

### 6.1 Form.Analytics — встроенная аналитика форм ✅

| Задача                                                                  | Статус |
| ----------------------------------------------------------------------- | ------ |
| `useFormAnalytics()` — хук трекинга (focus/blur/error/abandon/complete) | ✅     |
| `FormAnalyticsProvider` — контекст для трекинга                         | ✅     |
| `Form.Analytics.Panel` — dev-only панель                                | ✅     |
| `Form.Analytics.Funnel` — воронка мультистеп форм                       | ✅     |
| Adapter: Umami                                                          | ✅     |
| Adapter: Яндекс Метрика (goals + params)                                | ✅     |
| Adapter: Google Analytics 4                                             | ✅     |
| Adapter: PostHog                                                        | ✅     |
| Subpath export: `@letar/forms/analytics`                                | ✅     |
| analytics-demo страница (form-develop-app)                              | ✅     |
| Документация: guides/analytics.mdx + .ru.mdx                            | ✅     |
| Статья 13-analytics.md                                                  | ✅     |
| Тесты                                                                   | ✅     |

### 6.2 useFormHistory — Undo/Redo ✅

| Задача                                              | Статус |
| --------------------------------------------------- | ------ |
| `useFormHistory()` — хук с history stack + debounce | ✅     |
| Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)           | ✅     |
| `Form.History.Controls` — кнопки Undo/Redo          | ✅     |
| Persistence в sessionStorage (опционально)          | ✅     |
| undo-redo-demo страница (form-develop-app)          | ✅     |
| Документация: guides/undo-redo.mdx + .ru.mdx        | ✅     |
| Тесты                                               | ✅     |

### 6.3 mapServerErrors() — маппинг серверных ошибок ✅

| Задача                                                        | Статус |
| ------------------------------------------------------------- | ------ |
| `mapServerErrors()` — утилита с автодетектом формата          | ✅     |
| Парсеры: Zod flatten, Prisma (P2002/P2003), ZenStack, custom  | ✅     |
| `serverErrorMapper` в createForm middleware                   | ✅     |
| server-errors-demo страница (form-develop-app)                | ✅     |
| Обновить docs/zenstack.md — секция "Обработка ошибок мутаций" | ✅     |
| Документация: guides/server-errors.mdx + .ru.mdx              | ✅     |
| Обновить .claude/docs/forms.md — заменить ручной паттерн      | ✅     |
| Тесты                                                         | ✅     |

### 6.4 Form.ReadOnly — режим "только чтение" ✅

| Задача                                           | Статус |
| ------------------------------------------------ | ------ |
| `<Form readOnly>` — проп для всей формы          | ✅     |
| `<Form.ReadOnlyView>` — отдельный компонент      | ✅     |
| readonly-demo страница (form-develop-app)        | ✅     |
| Документация: guides/readonly-view.mdx + .ru.mdx | ✅     |

### 6.5 Form.Skeleton — Loading state ✅

| Задача                                                 | Статус |
| ------------------------------------------------------ | ------ |
| `<Form.Skeleton schema={S}>` — автоматический skeleton | ✅     |
| `<Form loading={true}>` — skeleton внутри формы        | ✅     |
| skeleton-demo страница (form-develop-app)              | ✅     |
| Документация: guides/form-skeleton.mdx + .ru.mdx       | ✅     |

### 6.6 Form.Comparison — Diff-view ✅

| Задача                                                      | Статус |
| ----------------------------------------------------------- | ------ |
| `<Form.Comparison original={old} current={new} schema={S}>` | ✅     |

### 6.7 Каскадная валидация (Form.DependsOn) ✅

| Задача                                                     | Статус |
| ---------------------------------------------------------- | ------ |
| `<Form.DependsOn field="x" schema={{ a: zodA, b: zodB }}>` | ✅     |

---

## Фаза: MCP Server + NPM + Claude Code Plugin

Детальный план: [`libs/form-mcp/PLAN.md`](../form-mcp/PLAN.md)

MCP сервер для AI-ассистентов — предоставляет полный контекст о 56 field-компонентах, паттернах форм и @form.\* директивах через tools/resources/prompts. Три этапа:

1. **Локальный MCP** (`libs/form-mcp/`) — для монорепо ✅ Phase 1 готов
2. **NPM пакет** (`@letar/form-mcp`) — для пользователей библиотеки
3. **Claude Code Plugin** — hooks, skills, автономный agent

---

## Form as State Manager ✅ (v1.4.0, 2026-05-22)

> Источник: статья 14-forms-as-state.md, 2026-05-22. Паттерны фильтров, URL-синхронизации и dashboard-контролов выявили пробелы в API.

### 1. `useFormUrlSync` — двусторонняя URL-синхронизация (приоритет: высокий)

Сейчас `useUrlPrefill` — только чтение (URL → форма). Нужен хук с двусторонней синхронизацией:

```ts
const form = useFormUrlSync(FilterSchema, {
  fields: ['search', 'category', 'minPrice'], // whitelist
  debounce: 300,
  replace: true, // router.replace вместо push
})
// form.initialValue считывается из URL при маунте
// при изменении значений → router.replace автоматически
```

- [x] Хук `useFormUrlSync(schema, options)` в `@letar/forms`
- [x] Поддержка Next.js `useRouter` и нативного `history.pushState`
- [x] Сериализация: `z.array` → повторяющиеся params (`?status=a&status=b`)
- [x] Тесты + демо в form-develop-app
- [x] Документация: обновить `guides/filters-state.mdx` и `guides/url-prefill.mdx`

### 2. `Form.Subscribe debounce` — встроенный debounce (приоритет: средний)

Сейчас debounce требует ручного `Form.Watch` + `setTimeout`. Нужен prop:

```tsx
<Form.Subscribe debounce={300}>{(values) => <ProductList filters={values} />}</Form.Subscribe>
```

- [x] Prop `debounce?: number` на `Form.Subscribe`
- [x] Prop `debounce?: number` на `useTypedFormSubscribe`
- [x] Тесты: убедиться что промежуточные значения не тригерят render

### 3. `onSubmit` опциональный (приоритет: средний)

Для no-submit форм (фильтры, контролы) сейчас нужен `onSubmit={async () => {}}`. Неочевидно и многословно. Сделать опциональным — когда `onSubmit` не передан, форма работает в режиме state-container без submit-логики.

- [x] `onSubmit` опциональный в `Form` props
- [x] Документация: добавить пример в `guides/filters-state.mdx`

### 4. `useFormRef` — доступ к инстансу снаружи дерева (приоритет: средний)

Для кнопки «Сбросить фильтры» в тулбаре страницы, которая живёт вне `<Form>`:

```tsx
const filterRef = useFormRef()

// В тулбаре (вне <Form>):
<Button onClick={() => filterRef.current?.reset()}>Сбросить всё</Button>

// В форме:
<Form formRef={filterRef} schema={FilterSchema} ...>
```

- [x] Prop `formRef` на `Form`
- [x] Хук `useFormRef()` возвращает `RefObject<FormApi>`
- [x] Тесты

### 5. `useActiveFiltersCount(defaults)` — счётчик активных фильтров (приоритет: низкий)

Частая потребность: бейдж «Фильтры (3)» над кнопкой открытия панели фильтров:

```tsx
const count = useActiveFiltersCount(defaultFilters)
// count = количество полей, значение которых != defaults

return <Button>Фильтры {count > 0 && <Badge>{count}</Badge>}</Button>
```

- [x] Хук `useActiveFiltersCount(defaults: Partial<T>): number`
- [x] Сравнение через deep-equal (учитывает массивы)
- [x] Документация

---

## Публикация на Хабре

Полное ТЗ по подготовке 14 статей к публикации: [ARTICLE.md](./ARTICLE.md)

### Статус (обновлено 2026-04-05)

| Этап                         | Статус        | Детали                                                  |
| ---------------------------- | ------------- | ------------------------------------------------------- |
| Часть 1: бенчмарки           | **done**      | `benchmarks.md`, `test-results.md`                      |
| Часть 1: визуалы P0          | **done**      | 4 SVG + 2 GIF + 3 PNG                                   |
| Часть 1: визуалы P1          | **частично**  | 3/5 SVG сделано, GIF автогенерации и MCP скриншот — нет |
| Часть 1: визуалы P2          | **не начато** | КДПВ, GIF i18n/offline, npm скриншот                    |
| Часть 2: редактура           | **done**      | Все 14 статей (00-13): шапка, спойлеры, финалы          |
| Часть 5: нераскрытые фичи    | **не начато** | Honeypot, Conversational, FormBuilder и др.             |
| Часть 4: финальный чеклист   | **не начато** | Перед каждой публикацией                                |
| Часть 6.1: testing utilities | **не начато** | `@letar/forms/testing` entry point                      |
| Часть 6.2: URL prefill       | **не начато** | `useUrlPrefill()` хук                                   |
| Часть 6.3-6.5: GitHub README | **не начато** | 3 пакета: forms, zenstack-plugin, form-mcp              |
| Часть 3: публикация          | **не начато** | 13 статей, 7 недель, вт/пт                              |

---

## Фаза 7: Стратегия дистрибуции (широкий OSS-охват) 🎯

> Направление принято 2026-07-05 (обсуждение с Kami). Цель: распространить `@letar/forms`
> на максимум React-разработчиков. Модель — **open-core** (ядро бесплатно, сервис вокруг форм — платно).

### Ключевой вывод анализа рынка (июль 2026)

- Рынок ушёл в **Tailwind/shadcn** (shadcn ~115k⭐, дефолт новых проектов). Chakra — меньшинство.
- Форм-стейт держит **React Hook Form** (~12M/нед). Мы на TanStack Form — растёт, но меньшинство.
- Ниша **schema-first zod→form** открыта: десятки генераторов, ни один не доминирует.
- **Chakra-лок = потолок охвата.** Аудитория «все React-devs» несовместима с Chakra-only.
- Наши редкие козыри: 56 полей, ZenStack `@form.*` (форма из схемы БД), offline/security/i18n,
  **MCP-сервер** (в 2026 llms.txt/MCP реально приводит юзеров через AI-ассистентов).

### Центральное решение: headless-ядро + UI-скины (модель AutoForm)

Инвертировать зависимость от Chakra. Целевая архитектура:

```
@letar/forms-core     ← Zod-мета + constraints + валидаторы + маппинг ошибок + i18n-словари
   ↓ потребляет UIKit-интерфейс (~20 примитивов)
@letar/forms-chakra   @letar/forms-shadcn   (@letar/forms-mui — потом)
```

### Архитектурный принцип (Clean Architecture / DIP) — решение Kami 2026-07-08

Фреймворк — это **деталь** (внешнее кольцо). Зависимость идёт **внутрь**: не ядро зависит от
React, а React-адаптер зависит от абстракций ядра.

- **Жёсткое правило:** `forms-core` **не импортирует ни один фреймворк** (ни React, ни Chakra, ни Vue) —
  чистые TS-функции, а не React-хуки, где это возможно. Не «React-free где получится», а точка.
- **React-адаптер = первый плагин** над ядром.
- **Второй фреймворк — это тест на фальсификацию границы**, а не «доброта к комьюнити». Абстракция с одним
  потребителем почти всегда протекает; настоящий seam доказывается только вторым потребителем (как тест
  доказывает код). Отсюда Vue-пруф (7.8) — верификация, а не тщеславие.
- **Противовес (тоже решение Kami):** SOLID — слуга, не господин. Антипаттерн — speculative generality /
  «архитектурный космонавт». Граница проведена + стрелка внутрь + задеплоено = архитектура уже честная;
  N адаптеров для этого не нужны. Знать, где остановиться — часть добродетели.

### Аудит связанности (факт по коду, 2026-07-05)

- **Chakra-free уже сейчас** (переезжают почти как есть в `forms-core`): `validators/`, `server-errors/`,
  `i18n/`, `utils/`, `contexts/`, `captcha/providers/` (0 Chakra); `analytics/` (1/9), `offline/` (2/8),
  `history/` (1/4) — логика чистая, на Chakra только UI-панели/индикаторы.
- **Вся связанность в `declarative/`: 153 из 177 файлов.** Точнее — **54 из 66 файлов полей** тянут Chakra напрямую.
- Обёртка поля (`Field.Root/Label/Error`) уже централизована в `form-fields/base/` (`field-wrapper.tsx`,
  `create-field.tsx`, `field-label.tsx`). Контролы (`Input`, `NumberInput`, `Select`, `Combobox`…) — размазаны по полям.
- **UIKit-интерфейс ≈ 20 примитивов:** FieldRoot/Label/Error/Helper + Input/NumberInput/Select/NativeSelect/
  Combobox/Checkbox/RadioGroup/SegmentGroup/PinInput + layout (Box/HStack/VStack/Text/Button/IconButton).

### Roadmap

- [ ] **7.1 Расслоение `forms-core`** — вынести Chakra-free логику + определить UIKit-интерфейс.
      Ценно само по себе (чистит архитектуру), даже оставаясь только на Chakra.
- [ ] **7.2 Standalone-проверка** — `npm i @letar/forms` в чистом Vite/Next вне монорепо (workspace-зависимости).
- [ ] **7.3 `@letar/forms-shadcn` beta** — 15–20 ходовых полей (Input/Textarea/Number/Select/Checkbox/Radio/Date).
      Покрывает ~80% форм. Тяжёлые (RichText/Table/Signature/Combobox) — «Chakra-only пока».
- [ ] **7.4 Замер трафика** → решение: доносить сложные поля или нет.
- [ ] **7.5 Docs-сайт на отдельном домене** + живые демо. SEO под `zod forms react`, `prisma form generator`.
- [ ] **7.6 `llms.txt` + усиление MCP** — недоиспользованный козырь №1 (дёшево, уникально).
- [ ] **7.7 Open-core сервис** — hosted-приём сабмитов + дашборд ответов + аналитика (синергия со studio/Tochka).
      Free — вся библиотека и оба скина; платно — сервис вокруг форм, не урезание кода.
- [ ] **7.8 Тонкий Vue-адаптер (архитектурный пруф границы)** — 5–8 базовых полей
      (Input/Number/Select/Checkbox) поверх `@tanstack/vue-form`. **Цель — доказать, что `forms-core`
      действительно framework-agnostic** (верификация DIP-границы) + подарок Vue-комьюнити (теплее/благодарнее) + маркетинговая правда «проверено на React + Vue». ⚠️ **Это НЕ полный порт Vue** (все 56 полей + вся
      декларативная композиция = месяцы, «второй Ark UI» — вне скоупа, заказчика нет). Только пруф на горстке
      полей. Делать **после** 7.1 (расслоение core), иначе доказывать нечего.

### Оценка объёма

- MVP (7.1–7.4): реалистично. Простые поля — свап контрола в 1 строку через UIKit.
- Полные 56 полей под shadcn: месяцы (тяжёлые — Combobox с `createListCollection`, Table на tanstack-table, Date, Steps).
- **Vue-пруф (7.8):** недели, не месяцы — только 5–8 полей ради доказательства границы, НЕ полный порт.
- **Бренд:** имя `@letar/forms` оставляем (решение Kami); дискаверабельность тянем позиционированием и docs-SEO, не именем.

### Порядок с учётом Clean Architecture

7.1 (расслоение core, dependency-free) — фундамент под всё. Затем параллельно: shadcn-скин (7.3, охват)
и Vue-пруф (7.8, верификация границы). Vue-пруф **строго после** 7.1 — до расслоения доказывать нечего.

---

## Связанные документы

- [README.md](./README.md) — описание и API библиотеки
- [ARTICLE.md](./ARTICLE.md) — ТЗ на публикацию статей на Хабре
- [TESTING_PLAN.md](./TESTING_PLAN.md) — план тестирования
- [apps/driving-school/TANSTACK_FORM_PLAN.md](../../apps/driving-school/TANSTACK_FORM_PLAN.md) — миграция форм driving-school
- [/.claude/docs/forms.md](../../.claude/docs/forms.md) — документация по формам

---

**Последнее обновление:** 2026-07-08 (v1.4.0) — Фаза 7: Clean Architecture (core dependency-free по DIP) + Vue-пруф-адаптер (7.8) как верификация границы, не полный порт
