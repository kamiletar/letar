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

#### [2026-06-12] Провайдер Yandex SmartCaptcha для Form.Captcha (от svoichuzhie) ✅ ГОТОВО

- **Запросил:** MagentaRaven
- **Приоритет:** high
- **Описание:** новый провайдер `smartcaptcha` рядом с turnstile/recaptcha/hcaptcha (`libs/forms/src/lib/captcha/`). Причина: РФ-проект (152-ФЗ) — Turnstile/reCAPTCHA отправляют IP и телеметрию браузера на зарубежные серверы (трансграничная передача ПДн), SmartCaptcha хранит данные в РФ. Серверная верификация: `POST https://smartcaptcha.yandexcloud.net/validate`. Нужно к Фазе 1–2 svoichuzhie (регистрация фан-клуба, подписка) — сейчас не блокирует (идёт Фаза 0, дизайн).
- **Статус:** ✅ готово — v1.4.5 (коммит `4c99c228`), провайдер `smartcaptcha` рядом с
  turnstile/recaptcha/hcaptcha, `<Form.Captcha provider="smartcaptcha">` +
  `verifyCaptcha(token, { provider: 'smartcaptcha', ... })`. `theme` проп не поддерживается
  Yandex SmartCaptcha (игнорируется). Документация: form-docs guides/captcha.mdx, демо в
  form-develop-app/form-example. Готово к использованию в svoichuzhie (Фаза 1–2)

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

- [x] **7.1 Расслоение `forms-core`** — вынести Chakra-free логику + определить UIKit-интерфейс.
      Ценно само по себе (чистит архитектуру), даже оставаясь только на Chakra.
      ✅ **Завершено 2026-08-09** (делегировано forms-dev, thread
      `forms-phase7-1-core-split`). Готово: Этап 1 (каркас `libs/forms-core`, пилот
      `validators/ru`, граница без React/Chakra проверена негативной пробой линта), Этап 2
      (Zod-мета-движок, ~2030 строк — самая ценная часть ядра), Этапы 3а/3б (`server-errors/`,
      `utils/`, `security/file-security.ts`, `offline/`, `captcha/`, `analytics/adapters/`), Этапы
      3в-3г (коммит `80545685`) — пять новых subpath-экспортов `forms-core`: `./credit-card`
      (luhn, detectBrand/getBrandInfo, formatExpiry/isExpiryValid, formatCardNumber,
      creditCardSchema), `./phone` (WebKit-safe форматтер из v1.4.4), `./table` (table-utils +
      Chakra-free часть table-types), `./address` (createDaDataProvider),
      `./i18n` (createFormErrorMap). `nx typecheck:tsgo,test --projects=forms,forms-core`:
      750/750 тестов зелёные, affected-typecheck по потребителям (form-develop-app, form-docs,
      form-example, dashboard, animatrona, grandslamcup, label-printer-desktop) — все ошибки
      pre-existing, не связаны с переносом.
      ✅ **Находка закрыта окончательно** (коммит `ad318324` добавил вычисление
      `formsCoreAlias` из `exports`, но не подключил его — старый ручной список остался
      активным, отсюда ESLint-warning про неиспользуемую переменную; довершено в рамках
      Этапа 4, 2026-08-09): `resolve.alias` теперь `...formsCoreAlias` вместо ручного списка.
      Подключение вскрыло вторую, более глубокую проблему — `rollup-plugin-alias` матчит
      объектные алиасы по префиксу, и bare `@letar/forms-core` (без подпути, идёт первым в
      `Object.entries(exports)` из-за `.` в начале) перехватывал `/schema`, `/utils` и другие
      подпути раньше их собственной записи, ломая 70/98 тестов. Фикс — сортировка ключей по
      длине по убыванию перед сборкой alias-объекта. Рассинхрон между `exports` и alias теперь
      структурно невозможен, а не просто починен разово.
      Публичный API `@letar/forms` не менялся — реэкспорт-шимы.
      **Этап 4** — `@letar/forms-core/uikit`: TS-контракт `UIKit` (~20 примитивов). Три
      показательных поля переведены на контракт вместо прямого импорта Chakra: `Field.String`
      (текстовое), `Field.Checkbox` (бинарное), `Field.Select` (самое структурно сложное —
      compound API + портал). `chakraUIKit` в `base/uikit-chakra.tsx` — единственное место, где
      контракт связывается с Chakra; будущий `forms-shadcn` даст свою реализацию без изменений
      в самих полях. Остальные примитивы (`NumberInput`/`NativeSelect`/`Combobox`/`RadioGroup`/
      `SegmentGroup`/`PinInput` + layout) типизированы, добавятся по мере миграции полей.
      **Этап 5** — документация всех 6 групп: `libs/forms/README.md` (раздел про архитектуру),
      CHANGELOG + v1.4.7, `libs/forms-core/README.md` написан с нуля (таблица 15
      subpath-экспортов, раздел про UIKit, архитектурный принцип). Demo-приложения не тронуты —
      внутренний рефакторинг без нового пользовательского API. Коммиты: `e2c0026d` (Этап 4),
      `a310995d` (Этап 5). Итог всей фазы — `libs/forms/PLAN_COMPLETED.md`.
      **Фаза 7.1 полностью завершена 2026-08-09.**
      - ✅ **Этап 1 закрыт (2026-08-09):** каркас `libs/forms-core` (Nx-проект, теги
      `scope:shared`/`type:core`/`owner:letar`), пилотный модуль `validators/ru` (476 строк, 9
      файлов) перенесён из `libs/forms` целиком, `@letar/forms/validators/ru` теперь тонкий
      реэкспорт — публичный API не изменился. Граница ядра держится на двух независимых
      ESLint-правилах (`depConstraints` для `type:core` + `no-restricted-imports` на
      `**/forms-core/src/**/*.ts` против `react`/`@chakra-ui/*`/`@tanstack/react-*`) —
      подтверждено негативной пробой (временный импорт `Box` из Chakra в ядро валит `nx lint
        forms-core`, без импорта — зелёный). `nx run-many -t typecheck:tsgo --all` зелёный по
      всему монорепо (кроме 5 предсуществующих несвязанных проблем — Prisma-дрейф в
      `form-example`, `webkitRequestFullscreen` в `grandslamcup`, TS6310 project-references в
      `animatrona-main`/`-renderer`, не относящиеся к forms-core падения в
      `label-printer-desktop`).
      - **Находка при внедрении:** резолв `@letar/forms-core` в приложениях-потребителях идёт
      ДВУМЯ независимыми механизмами одновременно, оба пришлось завести — иначе часть
      приложений не собирается: (1) `paths` в `apps/*/tsconfig.json` (~20 приложений,
      механически) — нужен для приложений, у которых `@letar/forms` разрешается через явный
      alias; (2) реальная workspace-зависимость `"@letar/forms-core": "workspace:*"` в
      `libs/forms/package.json` + `bun install` — материализует symlink
      `libs/forms/node_modules/@letar/forms-core`, нужен для приложений вроде `dashboard`,
      которые резолвят `@letar/forms` вообще без `paths`, только через
      `customConditions: ["@letar/source"]` + `exports` в `package.json` (см.
      `.claude/rules/libs.md` § «Подключение к приложению»). Три приложения
      (`label-printer-desktop`, `animatrona`) с «смешанной моделью» `include`
      (`../../libs/forms/src/**/*.ts` в списке) дополнительно требовали такой же строки для
      `forms-core` — иначе TS6307, ровно ловушка из
      [lib-entry-points.md](/.claude/docs/lib-entry-points.md).
      - ✅ **Этап 2 закрыт (2026-08-09):** Zod-мета-движок перенесён целиком (9 файлов,
      ~2030 строк: `schema-constraints.ts`, `schema-traversal.ts`, `constraint-hints.ts`,
      `common-meta.ts`, `with-ui-meta.ts`, `schema-meta.ts`, `zod-utils.ts`,
      `types/meta-types.ts`, `types/size-types.ts`) под новый subpath
      `@letar/forms-core/schema`. Карго-культный `'use client'` снят со всех — они чистые TS
      без единого runtime-импорта фреймворка (были просто помечены директивой без причины).
      Все 7 flat-файлов в `libs/forms` стали тонкими реэкспорт-шимами (тот же паттерн, что
      `validators/ru/index.ts` в Этапе 1) — внутренние относительные импорты (`./zod-utils`,
      `./schema-constraints` и т.п.) по всей `declarative/` не пришлось трогать. Единственная
      находка при переносе: `schema-meta.ts` импортировал `FieldUIMeta` через барrel `./types`
      (тянущий `field-types.ts` с `ReactNode` — React-зависимый), пришлось переключить на
      прямой `./types/meta-types` — иначе ядро унесло бы React-тип транзитивно. 4 spec-файла
      (`schema-constraints`, `schema-traversal`, `constraint-hints`, `with-ui-meta`) переехали
      вместе с реализацией — тестировать через реэкспорт-шим смысла нет. Тот же двойной
      механизм резолва из Этапа 1 (`paths` в ~20 `apps/*/tsconfig.json` + subpath в
      `package.json`) повторён для `@letar/forms-core/schema`. `nx run-many -t typecheck:tsgo
        --all` — те же 5 предсуществующих несвязанных падений, что после Этапа 1, регрессий нет.
      - ✅ **Этап 3а закрыт (2026-08-09):** первый батч остальных чистых модулей —
      `server-errors/` (существующий публичный subpath `@letar/forms/server-errors`,
      переехал целиком, включая bench), `utils/` (только `deepEqual`+`safeStringify`;
      `useFormStoreSubscribe` остался в адаптере — React-хук) и
      `declarative/security/file-security.ts` (только он; `honeypot.tsx`/`rate-limiter.ts`
      остались — React-хуки). Новые subpath'ы: `@letar/forms-core/server-errors`,
      `@letar/forms-core/utils`, `@letar/forms-core/security`. **Находка:** 5 файлов в
      `libs/forms` импортировали `deepEqual`/`safeStringify`/`processFileWithSecurity`
      напрямую по относительному пути в обход барreля (`../utils/deep-equal` и т.п.) —
      пришлось поправить каждый отдельно, реэкспорт-шим их не подхватывает. **Находка 2:**
      `file-security.ts` framework-free (без React/Chakra), но использует DOM API
      (`Image`, `document`, `canvas`) напрямую — понадобился `"lib": ["dom", ...]` в
      `tsconfig.lib.json`/`tsconfig.spec.json` ядра (не только `es2022`, которого по
      умолчанию хватало остальным модулям). Framework-free ≠ platform-free — это разные оси.
      - ✅ **Этап 3б закрыт (2026-08-09):** второй батч — `offline/` (только
      `offline-service.ts`+`types.ts`; React-хуки `use-offline-form.ts`,
      `use-offline-status.ts`, `use-sync-queue.ts` и компоненты-индикаторы остались в
      адаптере), `captcha/` (только `verify.ts`+`types.ts`; `captcha-context.tsx`,
      `captcha-field.tsx` остались — React), `analytics/` (`types.ts` + все 4 адаптера
      `adapters/*.ts`; `use-form-analytics.ts` и `analytics-panel.tsx` остались — React).
      Новые subpath'ы: `@letar/forms-core/offline`, `/captcha`, `/analytics`.
      **Находка, крупнее предыдущих:** `offline-service.ts` framework-free, но делает
      `await import('idb-keyval')` — **динамический** импорт реального npm-пакета, который
      статический грep по `from '...'` в исходном аудите Фазы 7 не ловил вообще. Тесты
      падали не из-за резолва (idb-keyval хоистится в root `node_modules`), а из-за
      отсутствия окружения: `canUseIDB()` проверяет `typeof indexedDB !== 'undefined'`, а
      голый jsdom не реализует IndexedDB — нужен `fake-indexeddb/auto` (был в
      `libs/forms/vitest.setup.ts`, но `forms-core` не имел вообще никакого setup-файла).
      Заодно понадобился и localStorage-полифилл оттуда же. **Вывод для будущих батчей:**
      аудит на «framework-free» по статическим импортам недостаточен — платформенные API
      (DOM, IndexedDB, localStorage, `fetch`) и **динамические** импорты npm-пакетов нужно
      проверять раздельно, тестовый прогон — единственный надёжный сигнал полноты миграции
      окружения, само по себе успешное `typecheck` этого не ловит.
      - ✅ **Этап 4 закрыт (2026-08-09):** зафиксирован TS-интерфейс `UIKit` под
      `@letar/forms-core/uikit` (~20 примитивов). Реализованы и используются:
      `FieldRoot`/`FieldLabel`/`FieldError`/`Input`/`Checkbox`/`Select`. Типизированы без
      адаптера: `NumberInput`/`NativeSelect`/`Combobox`/`RadioGroup`/`SegmentGroup`/`PinInput` +
      layout. Три показательных поля (`Field.String`, `Field.Checkbox`, `Field.Select` —
      текстовое/бинарное/выборное со сложным compound-API) переведены на потребление контракта
      через `chakraUIKit` вместо прямого импорта Chakra. Публичный API не менялся, 750/750
      тестов зелёные. Побочно найден и исправлен баг предыдущей сессии: вычисленный
      `formsCoreAlias` в `vitest.config.ts` был добавлен, но не подключён; при подключении
      вскрылась вторая проблема — `rollup-plugin-alias` матчит по префиксу, bare
      `@letar/forms-core` обязан сортироваться после всех подпутей. Детали —
      `PLAN_COMPLETED.md`.
      - ✅ **Этап 5 закрыт (2026-08-09):** документация всех 6 групп — `libs/forms/README.md`
      (раздел про архитектуру ядра), `CHANGELOG.md` + версия 1.4.7, `libs/forms-core/README.md`
      (написан с нуля, был заглушкой генератора). Demo-приложения не тронуты — внутренний
      рефакторинг без нового пользовательского API.
      - **🎉 Фаза 7.1 полностью завершена.** Итог: `libs/forms-core` — самостоятельный
      dependency-free пакет с 15 subpath-экспортами + типовым UIKit-контрактом, готовый фундамент
      под 7.3 (shadcn-скин) и 7.8 (Vue-пруф).
- [x] **7.2 Standalone-проверка** — ✅ диагностика + фикс завершены 2026-08-09 (forms-dev). Ками
      выбрал вариант (б): `tsup dts: true` вместо отдельного `tsc --project tsconfig.publish.json`
      прохода (тот же structural-fix принцип, что и у vitest-alias находки). Thread
      `forms-phase7-1-core-split`.
      - **Метод:** `nx run "@letar/forms:build:npm"` → `npm pack` дистрибутив → чистый scratch-проект
      ВНЕ монорепо (`C:\Users\Kami\...\Temp\...\scratchpad\forms-standalone-check`, свой
      `node_modules`, без `@letar/source` condition) → `npm install <tarball>` → минимальная форма
      с `Form.Field.Phone` (тянет `@letar/forms-core/phone`) → `tsc --noEmit` + рантайм-резолв
      через `node --input-type=module -e "import('@letar/forms/fields/specialized')"`.
      - **Рантайм (JS) — работает из коробки.** `noExternal: ['@letar/forms-core']` в
      `tsup.config.ts` инлайнит весь `forms-core` внутрь бандла `forms` — в `dist/*.js` нет ни
      одного нерезолвленного `import`/`require` на `@letar/forms-core` (только оставленные
      esbuild source-комментарии с путём). ESM-резолв subpath `@letar/forms/fields/specialized`
      через обычный `node_modules` подтверждён живым импортом в Node — экспорты (`FieldPhone` и
      другие) приходят корректно.
      - **🔴 `.d.ts`-генерация для публикации СЛОМАНА — до этой сессии, не мной внесено.**
      `nx run "@letar/forms:build:npm"` падает на шаге `tsc --project tsconfig.publish.json`:
      80 ошибок TS6059 (`forms-core` не под `rootDir: "src"` пакета `forms`) + TS6307 (файлы
      `forms-core` не входят в `include` `tsconfig.publish.json`). Из-за этого `tsc`-шаг падает
      ДО того как отработают `cp package.publish.json dist/package.json` и остальные —
      `dist/package.json`/`README`/`LICENSE` тоже не создаются при обычном прогоне таргета.
      Итог — если бы кто-то опубликовал `@letar/forms` на npm прямо сейчас через
      `nx run "@letar/forms:build:npm" && npm publish`, публикация вообще не прошла бы (build
      падает с ненулевым кодом); при принудительном/частичном прогоне ушёл бы пакет без единого
      `.d.ts` — TS-потребитель получил бы `TS7016: Could not find a declaration file`, что и
      воспроизведено в scratch-проекте (единственная оставшаяся ошибка `tsc --noEmit` после того,
      как я вручную дособрал `dist/` через `cp`-шаги и добавила `@types/react` в сам scratch,
      чтобы не путать чужую ошибку со своей).
      - **Корень:** `tsconfig.publish.json` пакета `forms` не обновлялся вместе с ростом
      subpath-экспортов `forms-core` за Фазу 7.1 — в `paths` всего 8 записей (`validators/ru`,
      `schema`, `server-errors`, `utils`, `security`, `offline`, `captcha`, `analytics`), а
      `forms-core` сейчас отдаёт 15 (плюс `credit-card`/`phone`/`table`/`address`/`i18n`/`uikit`
      появились уже после того, как `tsconfig.publish.json` в последний раз правили). `rootDir`
      жёстко `"src"` — то же семейство TS6059/TS6307, что задокументировано в
      `.claude/docs/libs.md` для приложений-потребителей библиотек, только здесь внутри самой
      публикующей библиотеки.
      - **НЕ чинила** — по инструкции координатора это архитектурный вопрос (два варианта решения:
      (а) `rootDir` пакета `forms` расширить до общего корня + догнать `paths` до всех 15
      подпутей, либо (б) раз `forms-core` физически инлайнится и не существует для потребителя
      как отдельный пакет — можно генерировать `.d.ts` иначе, например через `dts: true` в самом
      `tsup` вместо отдельного `tsc`-прохода, что заодно избавит от рассинхрона `paths`). Решение
      — за координатором/Ками.
      - **Отдельно:** `forms-core` **не имеет и не должен получить свой `build:npm`** — комментарий
      в `tsup.config.ts` («`@letar/forms-core` — не npm-пакет, Фаза 7.1, ядро без публикации —
      вбандливается внутрь») говорит, что архитектурно пакет задуман только как internal-зависимость
      `forms` (и будущих `forms-shadcn`/`forms-vue`), не как самостоятельный npm-пакет. Заводить
      для него `build:npm`/`publish:npm` «по аналогии» с `forms`, как буквально просил первый
      пункт задачи, значило бы противоречить уже принятому архитектурному решению — не стала
      этого делать, зафиксировала расхождение здесь.
      - **✅ Фикс (вариант б) реализован и проверен 2026-08-09:**
      - `tsup.config.ts`: `dts: false` → `dts: true` — декларации теперь генерирует сам tsup
      (rollup-plugin-dts) per-entry, синхронно со списком `entry`, структурный рассинхрон
      `paths` больше невозможен по построению.
      - `project.json` → `build:npm`: убран отдельный шаг `tsc --project tsconfig.publish.json`
      из списка команд — декларации больше не генерируются вторым проходом.
      - `tsconfig.publish.json`: убраны `composite`/`outDir`/`rootDir` — они принадлежали
      tsc-project-build режиму (`composite: true` включал строгую проверку TS6307 «файл не в
      явном списке проекта», `rootDir: "src"` давал TS6059 на файлы `forms-core` вне
      `libs/forms/src`); ни одно из этих полей tsup не использует для `dts: true`. `paths`
      догнан до всех 15 subpath-экспортов `forms-core` (было 8), `include` явно добавил
      `../forms-core/src/**/*.ts` — на случай если rollup-plugin-dts начнёт учитывать
      `include` для отсутствующих в графе файлов.
      - Промежуточная находка при отладке: сразу после включения `dts: true` (ещё с
      `composite: true` в конфиге) сборка падала на **другом** TS6307 — уже не по
      `forms-core`, а по соседним файлам внутри самого `libs/forms/src` (например
      `field-editable.tsx` из `form-fields/text/index.ts`). Причина — `composite: true`
      заставляет TS требовать явный список файлов даже для tsup'ного мульти-entry прохода,
      где каждый entry обрабатывается как собственный синтетический "project ''". Снятие
      `composite` убрало сразу оба класса ошибок (и по `forms-core`, и по соседним файлам
      `forms`), не только тот, что был найден в диагностике.
      - **Проверка:** `nx run "@letar/forms:build:npm"` проходит целиком — 12 `.d.ts` для всех
      entry points (`index`, `offline`, `i18n`, `fields/*` ×6, `server-errors`, `analytics`,
      `validators/ru`), все `cp`-шаги (`package.json`/`README`/`LICENSE`/`CHANGELOG`)
      отрабатывают. `nx run "@letar/forms:typecheck:tsgo"` и `nx run "@letar/forms:test"`
      (весь тестовый набор) — зелёные, обычный workspace-путь не задет (`tsconfig.lib.json`
      отдельный от `tsconfig.publish.json`, тестировавшийся файл не участвует в build:npm).
      - **Финальная проверка в чистом scratch-проекте** (тот же вне монорепо, что и в
      диагностике): `npm pack` нового `dist/` → чистая переустановка (`rm -rf node_modules
          package-lock.json && npm install` — первая переустановка без чистки лока молча
      использовала закешированный по integrity-хешу старый tarball, версия `1.2.0` не менялась
      между итерациями теста, это артефакт тестового стенда, не продукта) → `tsc --noEmit`
      зелёный, exit code 0, `TS7016` больше нет. Негативный контроль — намеренно добавленный
      несуществующий проп `thisPropDoesNotExist` на `Form.Field.Phone` даёт `TS2322` с точным
      списком реальных пропсов поля: типы не `any`-заглушка, а настоящие сгенерированные
      декларации.
      - Изменённые файлы: `libs/forms/tsup.config.ts`, `libs/forms/project.json`,
      `libs/forms/tsconfig.publish.json`.
      - Полный отчёт — в тред `forms-phase7-1-core-split` (agent-mail).
- [ ] **7.3 `@letar/forms-shadcn` beta** — 15–20 ходовых полей (Input/Textarea/Number/Select/Checkbox/Radio/Date).
      Покрывает ~80% форм. Тяжёлые (RichText/Table/Signature/Combobox) — «Chakra-only пока».
      🔄 **В работе с 2026-08-09 (forms-dev), но переосмыслена по ходу.** Аудит перед стартом
      показал: Этап 4 Фазы 7.1 закрыл только слой **контролов**, а сборка формы ниже уровня поля
      по-прежнему шла мимо контракта. Пока это не исправлено, shadcn-скин не может быть тонким —
      ему пришлось бы либо тянуть Chakra транзитивно через `@letar/forms`, либо дублировать всю
      form-wiring логику. Решение Ками — вариант (а): расширять слои, а не дублировать.
      - ✅ **Шаг 1 (аудит) закрыт.** Найдено 9 точек связанности композиционного слоя. Важная
      поправка к первоначальной оценке: `createForm()`, `form-context`, `form-root`
      (`FormSimple`/`FormWithApi`), `form-group-declarative`, `form-group-list-declarative` и
      большая часть `form-fields/base/` (`base-field`, `use-resolved-field-props`, `field-utils`,
      `use-debounce`, `use-async-search`, `use-async-field-validation`, `autocomplete-map`) —
      **уже Chakra-free**, вопреки опасению, что «composition завязан на Chakra целиком».
      Объём потребителей: `createField` — 38 файлов, `FieldLabel` — 27, `FieldWrapper` — 13.
      - ✅ **Шаг 2 (расширение контракта) закрыт** — v1.5.0 / forms-core v0.2.0. Добавлены
      примитивы `Tooltip`/`RequiredIndicator`/`ErrorFallback` + расширенные `Button`/`IconButton`;
      на контракт переведены `FieldWrapper`, `FieldErrorBoundary`, `FieldLabel` и обе кнопки
      массива. 754/754 теста зелёные (было 750 — +12 на `groupOptions`, +4 на
      `FieldErrorBoundary`, который вообще не был покрыт), оба негативных контроля пройдены,
      Add/Remove и `tone: 'danger'` проверены живым кликом в Chromium на `form-develop-app`.
      - **Две находки, каждая — отдельный класс протечки:**
      1. **Стилевые токены сквозь границу.** `FieldWrapper` красил рамку `css`-пропом
      (`borderColor: 'blue.200'`), кнопка удаления несла `colorPalette="red"` — типы сходились,
      но конкретная UI-библиотека протекала насквозь. Заменено семантикой: `validating?: boolean`
      у `FieldRoot`, `tone: 'danger'` у кнопок. Правило записано в `libs/forms-core/README.md`.
      2. **Протечка на уровне ДАННЫХ, а не рендера.** `useGroupedOptions` возвращал
      `createListCollection` — рантайм-структуру Ark UI, обязательную как проп `collection` для
      `Select`/`Combobox`/`Listbox`. Примитивом UIKit это не подменяется: у shadcn такой функции
      нет вовсе. Чистая группировка вынесена в `@letar/forms-core/uikit`
      (`groupOptions`/`hasGroups`/`getOptionLabel`), построение коллекции осталось адаптеру.
      - ✅ **Шаги 3-4 закрыты** — v1.6.0, новый пакет `@letar/forms-react` v0.1.0. Блокер снят
      решением Ками 2026-08-09: заводим третий пакет, правило «`forms-core` не импортирует ни
      один фреймворк» (2026-07-08) остаётся неприкосновенным. Инструкция «перенести в
      `forms-core`» была невыполнима как написана — это React (хуки, JSX,
      `@tanstack/react-form`), а ядро защищено двумя независимыми механизмами.
      - **Что переехало:** `createField`, `FieldWrapper`, `FieldErrorBoundary`, контекст формы,
      `FormGroup`, хуки поля (`useResolvedFieldProps`, `useDeclarativeField`,
      `useAsyncFieldValidation`, `useAsyncSearch`, `useDebounce`), `field-utils`,
      `autocomplete-map`, React-часть i18n, UI-независимые типы (`BaseFieldProps`,
      `DeclarativeFormContextValue`, `ResolvedFieldProps`).
      - **Что осталось в скине — намеренно:** `uikit-chakra.tsx`, `field-label.tsx`,
      `field-tooltip.tsx`, `selection-field-label.tsx`, `field-error.tsx` (вынесен из
      `create-field.tsx`), `use-grouped-options.ts`, `form-group-list-sortable.tsx`. Это Chakra-код,
      он и есть реализация контракта — в UI-library-free пакет он физически не может переехать,
      иначе новая линт-граница упала бы на первом же импорте.
      - **Механизм связывания:** `createFieldPrimitives(uikit)` — фабрика, вызываемая один раз на
      уровне модуля скина (`form-fields/base/primitives.ts`). Не контекст и не проп: компоненты
      должны быть стабильны по ссылке, иначе React размонтирует поддерево поля на каждой
      перерисовке формы.
      - **Ни одно из 56 полей не правилось** — на местах переехавших модулей стоят
      реэкспорт-шимы. Публичный API `@letar/forms` не изменился.
      - **Проверки:** 678 тестов в `forms` + 76 в `forms-react` (было 754 в одном — сходится
      файл-в-файл); `typecheck:tsgo` зелёный на 20 потребителях, включая шесть приватных;
      обе линт-границы `forms-react` (тег + `no-restricted-imports`) подтверждены негативной
      пробой; живая проверка в Chromium — рендер `fields-demo`, валидация с `data-invalid` +
      `error-text`, async-путь (`Username занят`).
      - **Побочная находка — техдолг 7.1.** Потребители держали 9 подпутей `forms-core` из 15.
      Всплыло сразу, как только композиционный слой начал импортировать `/uikit`, `/i18n`,
      `/address`. Дописан полный набор во все 17 приложений, чтобы следующее такое использование
      не ломало их заново.
      - ⚠️ **Открытый дефект публикации (не блокирует 7.3).** `noExternal` в `tsup.config.ts`
      инлайнит внутренние `@letar/*` только в JS; декларации собирает `rollup-plugin-dts`, и в
      `dist/*.d.ts` остаются импорты `@letar/forms-core/...`, которых в npm нет. **Это не регресс
      от `forms-react`** — `forms-core` торчит там же с Фазы 7.1, то есть 7.2 закрыла проход
      сборки, но не проверила содержимое `.d.ts`. Попытка `dts: { resolve: [/^@letar\//] }`
      результата не дала. Проверять только установкой в scratch-проект: сборка при дефекте
      успешна.
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
