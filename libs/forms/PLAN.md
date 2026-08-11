# PLAN.md — @letar/forms

План развития UI-библиотеки компонентов форм.

---

## ✅ [2026-08-11] `lazy()`-изоляция тяжёлых peer-deps четырёх полей — закрыто

По аудиту QuietRidge (тред `forms-phase7-3-shadcn`, письмо #33): `FieldRichText`, `FieldMaskedInput`,
`Form.Document.*` (`createDocumentField`) и `FieldDataGrid`/`FieldTableEditor` резолвили тяжёлые
peer-deps (`@tiptap/*`, `use-mask-input`, `@tanstack/react-table`+`react-virtual`) для ЛЮБОГО
потребителя соответствующего барreла — не только тех, кто реально использует эти поля. Применён
паттерн `Form.Captcha` (`lazy()` + dynamic `import()`) в `@letar/forms` (2.0.3) и
`@letar/forms-shadcn` (0.18.1, только `FieldRichText` — остальные три поля там ещё не портированы).
Публичный API не изменился. Детали — CHANGELOG обоих пакетов.

## Backlog (запросы от агентов)

### [2026-08-11] tsup роняет `'use client'` в lazy-чанках (forms + forms-shadcn) — не чинить без сигнала

- **Запросил:** forms-dev (найдено при publish-prep `forms-shadcn`, письмо #49)
- **Приоритет:** low — вероятно безвредно, не подтверждённая проблема
- **Описание:** tsup выбрасывает директиву `'use client'` из собранных lazy-чанков
  (`field-rich-text-impl.js`, `field-data-grid-impl.js` и т.п.) с предупреждением "Module level
  directives cause errors when bundled". Не новое и не специфичное для `forms-shadcn` — `dist/*.js`
  уже опубликованного `@letar/forms` страдает тем же. Скорее всего безвредно: директива нужна на
  границе клиент/сервер, а `React.lazy`+`import()` внутри поля срабатывает уже из клиентского
  поддерева (обёртка поля directive сохраняет) — новую границу чанк не создаёт.
- **Статус:** backlog, не назначено. Не чинить проактивно — ждать реального репорта от Next.js
  App Router потребителя (пока такого не было ни у одного из ~20 приложений на `@letar/forms`).

### [2026-08-11] Рассинхрон источников истины по числу полей: form-mcp/docs/fields.md (49) vs реальность (56)

- **Запросил:** forms-dev (найдено при докрутке `forms-shadcn` до release-ready, тред
  `forms-phase7-3-shadcn`, письмо #45)
- **Приоритет:** medium — вводит в заблуждение внешних потребителей и AI-агентов, но не блокирует
  разработку
- **Описание:** `mcp__form-mcp__list_fields` и `libs/forms/docs/fields.md` отдают **49** полей —
  без `FieldCity` и всех 7 document-полей (`FieldInn`/`Kpp`/`Ogrn`/`Snils`/`Passport`/`Bik`/
  `BankAccount`). Реальный подсчёт по файлам `src/lib/declarative/form-fields/**/field-*.tsx`
  (минус инфраструктурные error/label/tooltip/wrapper/type-mapper) даёт **56** — с City и
  document-полями. `form-mcp` — авторитетный источник именно для AI-ассистентов (`list_fields`
  используется во всех формах согласно `.claude/rules/forms.md`), так что расхождение реально
  вводит в заблуждение агентов, не только людей.
- **Не в зоне резервации forms-dev по forms-shadcn** — `file_reservation_paths` не включает
  `libs/form-mcp`. Нужна отдельная резервация на `libs/form-mcp` + `libs/forms/docs/fields.md`.
- **Статус:** backlog, не назначено. Пофиксить — добавить City и 7 document-полей в
  `list_fields`/`docs/fields.md`, свериться, что остальные 4 группы (`get_field_props`,
  `get_field_example`, `get_form_pattern`, `get_directives`) их тоже знают.

### [2026-08-11] Свой mask-движок вместо use-mask-input — НУЖНА ОТДЕЛЬНАЯ ИССЛЕДОВАТЕЛЬСКАЯ СЕССИЯ

- **Запросил:** Ками (через QuietRidge)
- **Приоритет:** medium — после задачи `lazy()`-изоляции тяжёлых полей (не блокирует её)
- **Контекст:** `use-mask-input` (обёртка над Inputmask.js) — тяжёлая зависимость, уже один раз
  давшая WebKit-баг (мутация DOM в обход React), из-за которого её выпилили из `FieldPhone` и
  заменили на свой форматтер `formatPhoneNumber` (`forms-core/phone`). Та же библиотека сейчас
  используется в 9 местах: `FieldMaskedInput`, generic zod-meta тип `'maskedInput'`
  (`field-type-mapper.tsx`), и 7 document-полей (`FieldInn`/`Kpp`/`Ogrn`/`Snils`/`Passport`/`Bik`/
  `BankAccount`, все через `document-field-base.tsx`). Именно поэтому `forms-shadcn` сознательно
  пропустила `MaskedInput`/`CreditCard` при портировании — тащить `use-mask-input` в новый скин с
  той же WebKit-историей не хотелось.
- **⚠️ Формат работы — НЕ обычная задача форм-дева с ходу.** Ками прямо сказал: нужна отдельная
  **исследовательская сессия**, а не сразу реализация. Библиотечное решение, продуманное, с
  разбором разных кейсов (не только 7 российских документов + generic maskedInput — заложить
  расширяемость на будущее). Сессия должна:
  1. Найти актуальные боли существующих mask-библиотек (Inputmask.js, imask, react-input-mask,
     их issue-трекеры) — что именно ломается у них в проде (курсор, paste, backspace через
     литералы, IME/мобильная клавиатура, controlled-value конфликты типа WebKit-бага, который
     уже поймали на `FieldPhone`).
  2. Найти best practice современных решений (что делают библиотеки нового поколения, если такие
     есть, какие паттерны API/архитектуры признаны удачными).
  3. Только после этого — предложить архитектуру своего движка (framework-free, в `forms-core`,
     по аналогии с уже проверенным `formatPhoneNumber`).
  4. **Ками лично контролирует качество и возможности** — не автономная реализация как остальные
     56 полей, решение по объёму/API согласовывается с ним до и во время работы, не постфактум
     в отчёте.
- **Статус:** backlog, не назначено. Не давать forms-dev как обычную задачу из очереди — дождаться,
  когда Ками сам инициирует исследовательскую сессию.

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
      - ✅ **Дефект публикации `.d.ts` закрыт.** Был: `noExternal` инлайнит внутренние `@letar/*`
      только в JS, а в `dist/*.d.ts` оставались импорты `@letar/forms-core/...`, которых в npm
      нет (существовал с Фазы 7.1 — 7.2 закрыла проход сборки, но содержимое `.d.ts` не
      проверяли). **Причина, по которой `dts: { resolve: [...] }` выглядел неработающим:** tsup
      строит `external` для dts-прохода как `dependencies + peerDependencies`, и всё оттуда
      rollup помечает внешним **до** плагинов — резолвер не вызывается вообще (видно по
      `DEBUG=tsup:ts-resolve`: bare-пакетов в логе нет ни одного, только относительные пути).
      Фикс structural, а не точечный: внутренние слои переехали в `devDependencies`, где им и
      место — потребитель их не устанавливает. Проверено установкой `npm pack`-тарбола в чистый
      проект вне монорепо: `tsc --noEmit` зелёный, негативный контроль `name={42}` → `TS2322`.
      - ✅ **Побочная находка scratch-проверки закрыта (2026-08-10): два разных `BaseFieldProps`.**
      Решение Ками — переименовать легаси-тип. `src/lib/types.ts` (`label?: string`, старый
      `ChakraFormField`-API) → `LegacyFieldProps`; имя `BaseFieldProps` освобождено и теперь
      публично экспортирует реальный тип из `forms-react` (`label?: ReactNode`, `tooltip`,
      `asyncValidate`), от которого фактически наследуются все 56 полей. Мажорный бамп — v2.0.0.
      Проверено: ни одно приложение монорепо не импортировало `BaseFieldProps` напрямую.
      - ✅ **paths-находка letar-dev закрыта (2026-08-10): те же 6 подпутей `@letar/forms`
      (не `forms-core`) были неполными в 19 приложениях** (`/analytics`, `/i18n`, `/offline`,
      `/server-errors`, `/testing`, `/validators/ru`) — та же схема, что чинила аналогичный пробел
      у `forms-core`. Шесть private submodule (aboi, domwellbes, driving-school, dsperevod,
      studio, svoichuzhie) закоммичены и запушены отдельно внутри своих репо.
      - ✅ **Шаг 5 (`forms-shadcn`) — в работе, 32 из 56 полей на 2026-08-10** (детали каждого поля
      и находки — ниже по разделу). Добро координатора получено 2026-08-10. Зависимости установлены в корневой `package.json` по конвенции репо (реальные
      версии в корне, у библиотеки — `peerDependencies` с диапазоном): десять Radix-примитивов
      (`checkbox`, `select`, `radio-group`, `label`, `slot`, `popover`, `tooltip`, `switch`,
      `toggle-group`, `slider`) + `class-variance-authority` 0.7.1, `clsx` 2.1.1,
      `tailwind-merge` 3.6.0. `tailwindcss` 4.3.3 и `lucide-react` 1.30.0 уже были. Установка
      проверена компиляционной пробой (`Radix` + `cva` + `twMerge` + иконка) с негативным
      контролем: `tone="rainbow"` даёт `TS2322`, то есть типы настоящие, а не `any`.
      - **Решение по организации скина: прямые Radix-примитивы + `cva`/`tailwind-merge`, а НЕ
      `shadcn` CLI.** Причины: (1) CLI копирует готовые компоненты в проект и требует
      `components.json` со своим алиас-резолвом — для библиотеки в Nx это лишний слой генерации,
      который CLI потом не умеет обновлять; (2) нам нужны не компоненты shadcn как таковые, а
      реализация UIKit-контракта, поэтому копия shadcn-компонента была бы промежуточным слоем
      без пользы; (3) Radix + cva + tailwind-merge — ровно то, из чего shadcn и состоит, классы
      те же, визуальная совместимость сохраняется.
      - ⚠️ **Цена решения, которую надо задокументировать потребителю:** скин требует Tailwind 4 на
      стороне приложения, и в Tailwind 4 сканирование контента идёт через `@source` — без записи
      на путь пакета классы будут вычищены как неиспользуемые. Для наших приложений скин
      бесполезен (все на Chakra) — это пакет для внешней OSS-аудитории.
      - **Демо-площадка есть:** `apps/form-docs` уже на Tailwind 4 (`@import 'tailwindcss'` в
      `globals.css`, Fumadocs). `form-develop-app` и `form-example` — на Chakra, туда shadcn-демо
      не поставить без отдельной настройки.
      - ✅ **Каркас + первые 3 поля готовы (2026-08-10).** `libs/forms-shadcn` создан
      (`nx g @letar/generators:new-lib forms-shadcn --react`), `paths` на все 15 подпутей
      `forms-core` + `forms-react` в `tsconfig.lib.json`, `resolve.alias` в `vitest.config.ts`
      (та же `buildFormsCoreAlias`, что у `forms-react`, + вручную добавленный алиас на
      `forms-react`), тег `type:ui` (депендс-констрейнты те же, что у `@letar/forms`).
      - **`shadcnUIKit`** (`src/lib/uikit/uikit-shadcn.tsx`) реализует `UIKitCorePrimitives`
      целиком (`FieldRoot`/`FieldLabel`/`FieldError`/`Input`/`Checkbox`/`Select`) + `ErrorFallback`
      из extended — минимум, нужный `createFieldPrimitives` и трём полям. Прямые Radix-примитивы
      (`@radix-ui/react-checkbox`, `-label`, `-select`) + `cva`-стиль классов Tailwind (без cva
      как runtime-зависимости пока не понадобились варианты — только statiс-классы + `cn()`).
      - **Главная проверка архитектуры подтверждена: ни `forms-core`, ни `forms-react` не
      потребовалось менять.** `FieldString`/`FieldCheckbox`/`FieldSelect` — прямые аналоги
      Chakra-версий, тот же `createField`/`resolved`/`componentProps` API, только другой UIKit.
      - **Тесты:** 6 тестов (RTL + jsdom) на 3 поля через собственный `TestForm` (минимальный
      `useForm()` + `DeclarativeFormContext.Provider`, без полного `createForm()` — тот живёт в
      UI-скинах). Негативный контроль пройден (`type="rainbow"` → `TS2322` под `@ts-expect-error`).
      `Select`-тест не открывает выпадающий список (Radix `hasPointerCapture` не эмулируется в
      jsdom без мока) — проверяет только триггер/label.
      - ⚠️ **Известный пре-существующий лint-баг унаследован, не мой регресс:** `vitest.config.ts`
      падает на `@nx/enforce-module-boundaries` из-за относительного импорта
      `../forms-core/testing/vitest-alias` — та же ошибка уже есть у `forms-react` (не чинила,
      не в скоупе Шага 5).
      - ⚠️ **Живая браузерная проверка отложена до дев-харнесса.** `form-docs` технически на
      Tailwind 4, но там же живёт `ChakraProvider` для остальных демо — класть туда shadcn-демо
      сейчас означало бы ровно тот конфликт стилей, ради которого Ками решил не расширять
      `form-develop-app` (см. решение выше). Type-check + RTL-тесты — единственная проверка на
      этом шаге; визуальная — когда появится `form-develop-app-shadcn`.
      - **Известные упрощения beta** (см. `libs/forms-shadcn/README.md`): tooltip у `FieldLabel` —
      нативный `title`, не полноценный Radix Tooltip; нет группировки опций в `Select`.
      - ✅ **+5 полей (2026-08-10): Textarea/Number/RadioGroup/SegmentGroup/Date — 8 из 15-20.**
      Приоритет — по указанию координатора (покрыть ещё не проверенные UIKit-примитивы, а не
      плодить варианты String).
      - `NumberInput`/`RadioGroup`/`SegmentGroup` добавлены в `shadcnUIKit` (extended-контракт
      `forms-core` их уже типизировал в Этапе 4 — реализация только дописана, не менялся);
      `Textarea` и `Date` намеренно НЕ пошли через UIKit-примитив — тот же паттерн, что и у
      Chakra-скина (`libs/forms/.../form-fields/text/field-textarea.tsx` рисует Chakra
      `Textarea` напрямую внутри `FieldWrapper`, не через контракт): многострочный текст не
      входит в core-контракт, а `FieldWrapper` (Root+Label+Error) и так skin-agnostic сам по
      себе — оборачивать в отдельный примитив ради одного скина смысла не было.
      - `RadioGroup` — `@radix-ui/react-radio-group`; `SegmentGroup` — `@radix-ui/react-toggle-group`
      (`type="single"`, с защитой от снятия выбора кликом по активному сегменту — Radix
      ToggleGroup умеет выключать активный элемент, контракт `SegmentGroupProps` этого не
      предполагает). Оба пакета уже стояли в корневом `package.json` (установка Шага 5),
      добавлены в `peerDependencies` `libs/forms-shadcn/package.json` — были пропущены при
      установке, потому что тогда ещё ни одно поле их не использовало.
      - `FieldDate` — beta-упрощение, нативный `<input type="date">` через существующий core
      `Input` (контракт уже поддерживает `type`), не полноценный date picker с попапом —
      соразмерно тому, что уже документировано как beta-упрощение для `Select`/`FieldLabel`.
      - **Протечек границы не найдено** — все 5 полей легли на контракт без правок `forms-core`
      или `forms-react`.
      - **Проверки:** 18/18 тестов (RTL + jsdom, `npx vitest run` в `libs/forms-shadcn`, было
      6 → 18); `typecheck:tsgo` зелёный; негативный контроль на всех 5 новых полях одним
      прогоном (`min="rainbow"` → `TS2322`, `options` обязателен у RadioGroup/SegmentGroup,
      `rows="rainbow"` → `TS2322`, лишний проп у `FieldDate` → `TS2322`) — временный файл вне
      индекса, прогнан `tsgo --noEmit` и удалён, в git не попал.
      - ✅ **+5 полей (2026-08-10, тем же заходом): NativeSelect/Switch/Slider/Password/Combobox
      — 13 из 15-20.**
      - `NativeSelect` и `Combobox` добавлены в `shadcnUIKit` как extended-примитивы (оба уже
      типизированы в `forms-core` с Этапа 4, реализация только дописана). `Switch`/`Slider`
      рисуются напрямую в поле — их нет и в самом контракте `UIKitExtendedPrimitives`, тот же
      принцип, что у `Textarea`/`Date` (см. выше): расширять контракт примитивом, у которого
      пока один потребитель, не нужно.
      - **`FieldCombobox` — единственное поле с осознанным сужением скоупа против Chakra-версии:**
      только статичные `options`, фильтрация по вхождению подстроки в `label` на стороне
      поля (не в `shadcnUIKit.Combobox` — примитив принимает уже отфильтрованный список,
      симметрично тому, как Chakra-версия фильтрует в `useFieldState` до `Combobox.Root`).
      Без `useQuery`/debounce/группировки — портировать async-поиск целиком не входило в
      задачу «доказать контракт», это отдельный объём работы. Реализация — `Popover` (Radix)
      как якорь под текстовым инпутом + список `div[role=option]`, без `cmdk`/полноценного
      command-паттерна.
      - `FieldPassword` — `shadcnUIKit.Input` (уже в контракте) + toggle-кнопка видимости,
      без UIKit-примитива для самой кнопки (аналогично Chakra: там тоже `IconButton` вставлен
      напрямую, не через контракт).
      - **Протечек границы снова не найдено** — `forms-core`/`forms-react` не менялись.
      - **Побочная находка инфраструктуры:** Radix `Slider` вызывает `ResizeObserver` (меряет
      трек), которого нет в jsdom — тест падал `ResizeObserver is not defined` через
      `FieldErrorBoundary` (само по себе доказательство, что error boundary работает). Фикс —
      минимальный no-op стаб в `vitest.setup.ts`, тот же принцип, что уже описан для
      `Select`-теста в jsdom (Шаг 5, первая часть): окружение для тестов беднее браузера,
      дыры чинятся точечно по мере появления, не превентивно.
      - **Проверки:** 29/29 тестов (было 18); `typecheck:tsgo` зелёный; негативный контроль
      пройден на всех 5 полях одним прогоном (обязательные `options` у `NativeSelect`/
      `Combobox`, `min="rainbow"`/`maxLength="rainbow"` → `TS2322`, лишний проп у
      `FieldSwitch` → `TS2322`).
      - ✅ **+1 поле (2026-08-10, тем же заходом): PinInput — 14 из 15-20.**
      - `PinInput` добавлен в `shadcnUIKit` как extended-примитив (типизирован в `forms-core` с
      Этапа 4). Нативные `<input maxLength=1>` в ряд + `useRef`-массив для автоперехода
      фокуса между ячейками при вводе/Backspace — без сторонней либы, Radix не даёт
      готового PinInput-примитива, как и Chakra не использует Ark UI для этого поля тоже
      не через сторонний пакет.
      - **Известное упрощение (beta):** нет вставки кода из буфера обмена одним действием
      (paste на первую ячейку раскладывает по всем) — только посимвольный ввод.
      - Протечек границы не найдено.
      - **Проверки:** 32/32 теста (было 29); `typecheck:tsgo` зелёный; негативный контроль
      (`length="rainbow"` → `TS2322`, лишний `placeholder` → `TS2322`).
      - ✅ **+3 поля (2026-08-10, тем же заходом): Hidden/Rating/Tags — 17 из 15-20, план
      перевыполнен.**
      - `FieldHidden` — не идёт через `createField`/`UIKit` вообще: не рендерит DOM, только
      синхронизирует внешний `value` с form state через `useResolvedFieldProps` напрямую
      (`useEffect`), портирован как есть из Chakra-версии — там тоже без UIKit, потому что
      рендерить нечего.
      - `FieldRating` — ряд кнопок-звёзд (`lucide-react` `Star`), `FieldTags` — нативный инпут
      + чипы с Enter-добавлением. Оба не входят в UIKit-контракт, тот же принцип, что у
      `Switch`/`Slider`/`Textarea`/`Date`.
      - **Известные упрощения (beta):** `FieldTags` — только Enter добавляет тег, без
      кастомного `delimiter`/`addOnPaste` (вставка с несколькими разделителями не
      разбирается на несколько тегов).
      - Протечек границы не найдено — все 17 полей легли на существующий контракт без единой
      правки `forms-core`/`forms-react` за весь Шаг 5.
      - **Проверки:** 39/39 тестов (было 32); `typecheck:tsgo` зелёный; негативный контроль
      на всех 3 полях (лишний `label` у `FieldHidden`, `count="rainbow"`/`maxTags="rainbow"`
      → `TS2322`).
      - **Итог Шага 5 на 2026-08-10: 17 полей, план (15-20) выполнен в середине диапазона.**
      Оставшиеся кандидаты из плана Фазы 7.3 — RichText (Tiptap), FileUpload (своя
      инфраструктура загрузки), Address (DaData-провайдер), DateRange/DateTimePicker/Duration —
      каждый требует заметно больше инфраструктуры, чем уже смигрированные (внешние либы или
      сложная составная логика), и не добавляет новой уверенности в UIKit-контракте — все
      использованные им примитивы уже проверены. Решение о том, продолжать ли до полных 56 или
      остановиться здесь и перейти к дев-харнессу — за координатором/Ками.
      - ✅ **Решение принято (2026-08-10): остановиться на 17 ради визуальной проверки в
      дев-харнессе, не насовсем.** Оставшиеся поля (RichText/FileUpload/Address/DateRange/
      DateTimePicker/Duration и т.д. до полных 56) — не отменены, а отложены: 17 хватало,
      чтобы прогнать живую проверку в браузере и закрыть Шаг 5 как контрольную точку. Полный
      паритет с `@letar/forms` (Chakra-скин) — по-прежнему цель `forms-shadcn` в конце Фазы 7.3,
      просто не в этом заходе. Не считать 17 финальным скоупом при дальнейшем планировании.
      Поднял дев-харнесс.
      `apps/form-develop-app-shadcn` создан (`nx g @letar/generators:new-app`, Chakra-каркас
      заменён на Tailwind 4 + shadcn CSS-переменные — тот же конфликт стилей, из-за которого
      не расширяли `form-develop-app`). Демо-страница со всеми 17 полями через `DemoForm` —
      временный локальный form-root (`useForm` + `DeclarativeFormContext`), поскольку
      `@letar/forms-shadcn` пока не несёт свой `Form`/`createForm()` (отдельная задача,
      не входила в Шаг 5).
      - **Живая проверка в Chromium подтвердила все интерактивные поля**, включая находку
      инструмента автоматизации (не бага в коде): `computer{action:"key", text:"Return"}`
      в этом окружении не всегда проставляет `event.key === 'Enter'` — `FieldTags`
      выглядел сломанным, пока не проверили настоящим `KeyboardEvent({key:'Enter'})` через
      `dispatchEvent`, после чего тег добавился корректно. Стоит держать в голове при
      следующих e2e/browser-проверках `Enter`-логики в этом харнессе.
      - `paths` без `references` в `tsconfig.json` сразу — известный `TS6305`-редирект
      (`.claude/rules/libs.md`), пойман и исправлен на этапе генерации, не постфактум.
      - `typecheck:tsgo`/`lint` зелёные. Юнит-тестов нет — харнесс визуальный, не
      регрессионный гейт (в отличие от `form-develop-app` с его 21 e2e).
      - Зафиксирован триггер выноса CSS-переменных `globals.css` этого харнесса в саму
      библиотеку — не сейчас (единственный потребитель), а как только появится второй.
      Раздел «CSS-переменные для потребителей» в
      [`libs/forms-shadcn/README.md`](../forms-shadcn/README.md).
      - ✅ **Документационный цикл `forms-shadcn` закрыт (2026-08-10, forms-dev).** По итогам
      обсуждения с координатором (тред `forms-phase7-3-shadcn`) — README уже был release-ready
      (требования потребителя, CSS-переменные, таблица 17 полей, известные упрощения beta,
      подключение к приложению), не хватало только `CHANGELOG.md`. Создан по формату Keep a
      Changelog, версии 0.1.0→0.5.1 восстановлены из `git log -- libs/forms-shadcn/` (7
      коммитов, каждый — отдельная запись). `package.json` версия поднята 0.5.0 → 0.5.1 (сама
      запись о доккоммите). `createForm()`/`Form` для `forms-shadcn` — сознательно НЕ сделан в
      этом заходе, отдельная задача в бэклоге ниже (демо-харнесс работает на временном
      `useForm()+DeclarativeFormContext`, этого достаточно, пока задача — доказать
      `UIKit`-контракт, а не дать готовый паттерн внешним пользователям).
- [ ] **Backlog:** `createForm()`/`Form` form-root для `@letar/forms-shadcn` — сейчас пакет отдаёт
      только отдельные `Field*`-компоненты, сборка формы (`initialValue`/`onSubmit`/`Form.Button.Submit`
      и т.д.) у потребителя нет; `apps/form-develop-app-shadcn` временно обходится локальным
      `useForm()+DeclarativeFormContext`. Не блокирует 7.4/7.5 — нужен ближе к тому, как скин станет
      публичным npm-пакетом для внешних пользователей.
- ✅ **Унаследованный lint-баг `@nx/enforce-module-boundaries` в `vitest.config.ts` починен
  (2026-08-10, forms-dev).** Задача от координатора (тред `forms-phase7-3-shadcn`), баг был
  общий для `forms`/`forms-react`/`forms-shadcn` — все три относительным путём импортировали
  `buildFormsCoreAlias` из `libs/forms-core/testing/vitest-alias.ts`, лежавшего вне `src/` без
  записи в `exports`. Функция перенесена в `libs/forms-core/src/lib/testing/index.ts`, новый
  subpath-экспорт `@letar/forms-core/testing`. **Находка:** промежуточный реэкспорт-шим
  (`index.ts` → `export from './vitest-alias'`) не сработал — `vitest.config.ts` резолвится
  нативным Node-загрузчиком плагина `@nx/vitest` при построении графа проектов, а не
  Vite-бандлером; тот не умеет extensionless относительные импорты внутри `.ts`-модуля,
  полученного через bare-специфайер пакета (`Cannot find module '...vitest-alias'`), хотя
  прямой относительный импорт в самом `vitest.config.ts` это же самое разрешает без проблем.
  Фикс — вся реализация в одном файле `index.ts`, без внутреннего реэкспорта. Коммиты:
  `8dc49f3c` (forms-core), `7cc9cb46` (forms-react), `015fb539` (forms-shadcn), `68705f4c`
  (forms) — четыре отдельных, каждый по своему scope. Проверено: `nx lint`/`typecheck:tsgo`/
  `test` зелёные на всех четырёх пакетах (65с суммарно на тестах); остальные 38
  pre-existing проблем `nx lint forms` (`react-hooks/exhaustive-deps` и т.п.) — не в скоупе,
  не трогала.
- ✅ **`FieldAddress` добавлен — 18-е поле (2026-08-10, forms-dev), начало продолжения к
  паритету.** По уточнению координатора 17 полей — не финальный скоуп (см. выше). Переиспользует
  `shadcnUIKit.Combobox` (Popover + input, тот же примитив, что `FieldCombobox`) с
  async-подгрузкой подсказок из `AddressProvider` (`@letar/forms-core/address`) вместо
  статичного списка — провайдер резолвится в том же порядке, что у Chakra-версии (проп →
  `DeclarativeFormContext.addressProvider` → `token`-фолбэк на `createDaDataProvider`).
  Beta-упрощения: нет клавиатурной навигации стрелками/Escape по списку подсказок
  (Combobox-примитив UIKit её не поддерживает — только клик и Enter/Escape самого Popover) и
  нет визуального спиннера внутри инпута (`loading` прокинут как есть, текст «Загрузка...» в
  выпадающем списке). Протечек границы не найдено — легло на существующий `UIKit`-контракт без
  правок `forms-core`/`forms-react`.
  - Единственная находка: `eslint-disable-next-line react-hooks/exhaustive-deps` (портировано
    из Chakra-версии как есть) валит `nx lint forms-shadcn` — плагин `react-hooks` не
    зарегистрирован в этом воркспейсе, поэтому disable-комментарий на несуществующее правило сам
    по себе ошибка (`Definition for rule ... was not found`), тот же баг уже есть в
    `libs/forms/src/lib/utils/use-form-store-subscribe.ts` и в Chakra `field-address.tsx` (не
    чинила — не в скоупе). Обошла добавлением `fetchSuggestions` в зависимости эффекта вместо
    disable-комментария — `fetchSuggestions` стабилен по ссылке, пока не меняются
    `provider`/`minChars`/`locations`, включение в deps не добавляет лишних срабатываний.
  - **Проверки:** 5 новых RTL-тестов (44/44 в пакете, было 39), негативный контроль
    (`token={42}` → `TS2322`), `typecheck:tsgo`/`lint` зелёные. Живая проверка в Chromium на
    `apps/form-develop-app-shadcn` (мок-провайдер вместо DaData — токена в песочнице нет): ввод
    текста → debounce → подсказки в Popover → клик по подсказке → значение инпута обновилось,
    список закрылся — весь путь воспроизведён через `dispatchEvent`, а не только unit-тестами.
  - CHANGELOG/версия (`0.5.1` → `0.6.0`), README (таблица полей, «Известные упрощения») —
    обновлены.
- ✅ **`FieldDateRange` добавлен — 19-е поле (2026-08-10, forms-dev).** Опирается на уже
  проверенный `FieldDate` (нативный `<input type="date">`), два синхронизированных инпута
  (max начала = значение конца и наоборот) + опциональные пресеты (7 штук — сегодня/вчера/эта
  и прошлая неделя/этот и прошлый месяц/этот год).
  - **Находка 1:** UIKit-контракт `Input` не пропускает `min`/`max` (не нужны обычному
    текстовому полю) — пришлось рендерить нативный `<input>` напрямую с теми же tailwind-классами,
    что у `shadcnUIKit.Input`, вместо прогона через примитив контракта. Не протечка границы в
    смысле «контракт неполон для существующих полей» — просто DateRange первым понадобился
    HTML-атрибут, которого в контракте нет и не должно быть (остальные 18 полей его не используют).
  - **Находка 2:** `useId()` внутри `render`-функции `createField` валит
    `react-hooks/rules-of-hooks` — ESLint распознаёт хуки по имени функции-обёртки
    (`useFieldState` матчит как «это хук», `render` — нет). Решение — не городить id вообще:
    саб-лейблы С/По — `<span>`, не связанный `<label htmlFor>` (то же ограничение, что и с
    `min`/`max` — UIKit `Input` не пропускает `id` наружу).
  - **Пресеты — ряд кнопок, не выпадающее меню** (сознательное beta-упрощение, не находка):
    `@radix-ui/react-dropdown-menu` не установлена, заводить новую Radix-зависимость ради 7
    текстовых пунктов смысла не было — то же решение, каким был обход с Popover
    для Address/Combobox, только в другую сторону (там переиспользовали уже имеющийся Popover,
    здесь не стали добавлять новый примитив).
  - Протечек границы `forms-core`/`forms-react` не найдено.
  - **Проверки:** 6 новых RTL-тестов (50/50 в пакете, было 44), негативный контроль
    (`orientation="diagonal"` → `TS2322`), `typecheck:tsgo`/`lint` зелёные. Живая проверка в
    Chromium на `form-develop-app-shadcn`: клик по пресету «Эта неделя» → оба инпута и
    крест-накрест min/max выставились верно (2026-08-10 — понедельник, диапазон
    2026-08-10..2026-08-16); ручное изменение начала через `dispatchEvent` пересчитало
    `end.min` синхронно.
  - CHANGELOG/версия (`0.6.0` → `0.7.0`), README — обновлены.
- ✅ **`FieldDuration` и `FieldDateTimePicker` добавлены — 20-е и 21-е поле (2026-08-10,
  forms-dev), одним заходом.** Обе опирались на уже проверенные примитивы: `FieldDuration` —
  на `shadcnUIKit.NumberInput` (полностью в UIKit-контракте, без единого обхода — в отличие от
  Address/DateRange), `FieldDateTimePicker` — на тот же паттерн нативного `<input>`, что
  `FieldDateRange` (UIKit `Input` не пропускает `min`/`max`/`step`).
  - `FieldDuration`: значение — число минут, формат `HH:MM` (два `NumberInput` рядом, клампинг
    часов/минут раздельно с пересчётом в минуты) или `minutes` (один `NumberInput`, клампинг
    напрямую). Тот же контракт значения, что у Chakra-версии.
  - `FieldDateTimePicker`: значение — строка ISO (`YYYY-MM-DDTHH:MM:00`), парсинг/сборка той же
    regex-схемой, что у Chakra. `type="time"` рендерится нативным `<input>` (не через UIKit —
    нужен `step` в секундах, которого в контракте нет), `type="date"` тоже нативный ради min/max.
  - Протечек границы `forms-core`/`forms-react` не найдено.
  - **Проверки:** 9 новых RTL-тестов (59/59 в пакете, было 50), негативные контроли
    (`format="seconds"` → `TS2322` на Duration, `timeStep="15"` строкой вместо числа → `TS2322`
    на DateTimePicker), `typecheck:tsgo`/`lint` зелёные с первого прогона — обошлось без находок,
    характерных для предыдущих двух полей. Живая проверка в Chromium на
    `form-develop-app-shadcn`: изменение часов в Duration и раздельное изменение
    даты/времени в DateTimePicker (каждое сохраняет другую половину значения) — оба
    воспроизведены через `dispatchEvent`.
  - CHANGELOG/версия (`0.7.0` → `0.8.0`), README — обновлены.
- ✅ **`FieldPhone`, `FieldCurrency`, `FieldPercentage` добавлены — 22-е/23-е/24-е поля
  (2026-08-10, forms-dev), одним заходом.** Дешёвая тройка: `FieldPhone` вообще без новых
  Radix-зависимостей (переиспользует `@letar/forms-core/phone`, WebKit-safe форматтер маски
  из v1.4.4), `FieldCurrency`/`FieldPercentage` — тонкая обёртка вокруг уже проверенного
  `shadcnUIKit.NumberInput`.
  - `FieldPhone`: флаг страны (`showFlag`) — соседний `<span>`, не «приклеенный» бордер как
    `Group attached` у Chakra (в UIKit-контракте нет примитива для составных инпутов).
  - `FieldCurrency`/`FieldPercentage`: без живого Intl-форматирования значения внутри инпута
    при вводе (Chakra `NumberInput.Root formatOptions` форматирует посимвольно, аналога в
    UIKit-контракте нет) — символ валюты/`%` рядом с полем, определяется один раз через
    `Intl.NumberFormat().formatToParts` (Currency) или статичен (Percentage).
  - Протечек границы не найдено — все три легли на существующие примитивы/утилиты без единой
    правки `forms-core`/`forms-react`.
  - **Проверки:** 10 новых RTL-тестов (69/69 в пакете, было 59), негативные контроли
    (`country="XX"` → `TS2322` на Phone, `min="0"`/`max="100"` строкой вместо числа → `TS2322`
    на Currency/Percentage), `typecheck:tsgo`/`lint` зелёные с первого прогона. Единственная
    находка — не в коде: тест на плейсхолдер маски телефона сам был неверен (`mask.replace(/9/g,
    '_')` заменяет только цифру `9`, а не первый символ `+7` — литерал страны в маске остаётся),
    поймано и поправлено в самом тесте. Живая проверка в Chromium на
    `form-develop-app-shadcn`: ввод цифр телефона форматируется в маску `+7 (916) 123-45-67`
    вживую через `dispatchEvent`.
  - CHANGELOG/версия (`0.8.0` → `0.9.0`), README — обновлены.
- ✅ **`FieldAutocomplete` и `FieldListbox` добавлены — 25-е и 26-е поля (2026-08-10,
  forms-dev), одним заходом.** По пути пропущен `FieldMaskedInput` — сознательно, не забыто:
  Chakra-версия использует `use-mask-input` (imask), ту самую библиотеку, что пришлось выпилить
  из `FieldPhone` ещё в v1.4.4 Chakra-скина из-за WebKit-бага (мутация DOM в обход React,
  конфликт с controlled `value`). Реинтродукция той же зависимости в новый скин — не beta-
  упрощение, а реальный регресс; нужен общий framework-free mask-движок в `forms-core`
  (плейсхолдеры цифра/буква/алфанум, не только цифровые, как у `formatPhoneNumber`) — отдельная
  задача, не текущего захода. Также пропущен `FieldCreditCard` — у Chakra-версии это не
  `createField`-компонент, а отдельный compound (`CreditCardField`, 3 суб-поля с
  auto-focus-chain, brand-иконки, tooltip) — архитектурно не вписывается в паттерн остальных 26
  полей, отдельная оценка объёма нужна до начала.
  - `FieldAutocomplete`: переиспользует `shadcnUIKit.Combobox` (тот же примитив, что
    `FieldCombobox`), но `onInputChange` сразу пишет введённый текст в значение поля
    (`allowCustomValue`), не дожидаясь выбора из списка — как у Chakra-версии. Beta: только
    статичные `suggestions`, без `useQuery` (тот же статус, что у `FieldCombobox`); типы
    `emptyMessage`/`loadingMessage`/`size`/`variant`/`getLabel` из Chakra-версии сознательно НЕ
    портированы в props — примитив контракта их не поддерживает, декларировать неработающие
    пропы было бы вводящей в заблуждение поверхностью API.
  - `FieldListbox`: без отдельного Radix-примитива — обычные кнопки с `role="option"`/
    `aria-selected`, тот же визуальный класс, что у пунктов Combobox. Группировка через
    `groupOptions`/`getOptionLabel` из `@letar/forms-core/uikit` (framework-free утилита,
    добавлена ещё в Этапе 4 Фазы 7.1 — просто не была использована ни одним полем до сих пор).
  - Протечек границы не найдено — обе легли на существующие примитивы/утилиты.
  - **Проверки:** 11 новых RTL-тестов (80/80 в пакете, было 69), негативные контроли
    (`minChars="1"` строкой → `TS2322` на Autocomplete, `selectionMode="triple"` → `TS2322` на
    Listbox), `typecheck:tsgo`/`lint` зелёные с первого прогона. Живая проверка в Chromium на
    `form-develop-app-shadcn`: множественный выбор в Listbox (клики по разным опциям
    независимы — первая попытка теста показала ложный отрицательный результат из-за двух
    синхронных `dispatchEvent` без ре-рендера между ними, не бага компонента; с раздельными
    кликами оба выбора применились корректно), Autocomplete принял текст `Владивосток`,
    не входящий в `suggestions` — allowCustomValue подтверждён вживую.
  - CHANGELOG/версия (`0.9.0` → `0.10.0`), README — обновлены.
- ✅ **`FieldRadioCard` и `FieldCheckboxCard` добавлены — 27-е и 28-е поля (2026-08-10,
  forms-dev), одним заходом.** Тот же принцип, что у `FieldListbox` — вместо нового
  Radix-примитива обычные кнопки с ARIA-ролями (`role="radio"`/`role="radiogroup"` для
  RadioCard, `role="checkbox"`/`role="group"` для CheckboxCard), визуально card-стиль
  (border+ring на выборе) вместо мелких кружков/квадратов.
  - Beta: без `keyboardNavigation` (циклическая навигация стрелками, опциональна у
    Chakra-версии `FieldRadioCard`) — не портирована.
  - Протечек границы не найдено.
  - **Проверки:** 8 новых RTL-тестов (88/88 в пакете, было 80), негативные контроли
    (`orientation="diagonal"` → `TS2322` на обоих полях), `typecheck:tsgo`/`lint` зелёные с
    первого прогона. Живая проверка в Chromium на `form-develop-app-shadcn`: клик по карточке
    RadioCard/CheckboxCard переключает `aria-checked` вживую через `dispatchEvent`.
  - CHANGELOG/версия (`0.10.0` → `0.11.0`), README — обновлены.
- ✅ **`FieldCity` добавлен — 29-е поле (2026-08-10, forms-dev).** Тот же
  `AddressProvider`/`shadcnUIKit.Combobox`-паттерн, что `FieldAddress`, но значение — простая
  строка (имя города, извлечённое из `suggestion.data.city`/`.settlement`, фолбэк на
  `suggestion.value`), `bounds: { from: 'city', to: 'settlement' }` ограничивает подсказки.
  - **Известное ограничение (не протечка, архитектурный потолок примитива):** Chakra-версия
    сохраняет набранный вручную текст на `blur`, если пользователь не кликнул подсказку —
    `UIKitComboboxProps` не даёт колбэк `onBlur` (общий примитив с `FieldCombobox`/`FieldAddress`,
    им это не требовалось). Здесь значение обновляется только через выбор подсказки или полное
    стирание текста. Задокументировано в CHANGELOG/README как Known limitation, не тихо.
  - **Находка при написании теста (не регресс, вскрыла существующий паттерн):** тест с
    непустым `defaultValues` (`{ city: 'Казань' }`) вызвал React-warning «Cannot update a
    component while rendering a different component» — источник в самом паттерне инициализации
    `inputValue` из `field.state.value`, унаследованном от `FieldAddress`/Chakra: `useFieldState`
    не получает доступ к `field` (только `componentProps`), поэтому синхронизация с начальным
    значением поля вынужденно происходит в `render()` через ref-guard, а не в `useEffect`. У
    `FieldAddress` тот же код есть, просто ни один существующий тест не использует непустой
    `defaultValues` — путь остаётся непокрытым и предупреждение никогда не всплывало. Тест
    проходит (утверждения корректны), это только консольный warning в dev-режиме, не поломка —
    не чинила архитектуру походя (затронула бы и Address, и потенциально Chakra-паттерн), но
    зафиксировала здесь: если продолжать паттерн Address/City для будущих provider-полей —
    заранее знать про эту находку, возможный фикс — прокинуть `field` в `useFieldState` или
    переключить инициализацию на `useEffect` с зависимостью от `field.state.value`.
  - **Проверки:** 5 новых RTL-тестов (93/93 в пакете, было 88; тест на непустой
    `defaultValues` **специально оставлен** — фиксирует находку выше, а не скрывает её),
    негативный контроль (`token={42}` → `TS2322`), `typecheck:tsgo`/`lint` зелёные. Живая
    проверка в Chromium на `form-develop-app-shadcn` (мок-провайдер без `data.city` —
    подтверждён фолбэк на `suggestion.value`): ввод → debounce → подсказки → выбор → значение
    обновилось.
  - CHANGELOG/версия (`0.11.0` → `0.12.0`), README — обновлены.
- ✅ **Фикс находки выше (2026-08-10, forms-dev, задача от Ками, не из очереди `QuietRidge`):
  render-time `setState` в `FieldAddress`/`FieldCity` (обе версии — Chakra и shadcn) убран
  архитектурно, не патчем.** Симптом: React-warning «Cannot update a component while rendering a
  different component» на непустых `defaultValues` — `setInputValue()` вызывался синхронно в
  теле `render()`, которое исполняется внутри рендера `<form.Field>` (чужого компонента).
  - **Рассмотренные варианты и почему выбран не самый очевидный:**
    1. `useEffect` прямо внутри `render()` — технически исполняется в контексте `<form.Field>`
       (хук регистрируется по месту вызова), но нарушает Rules of Hooks: `<form.Field>` вызывает
       `children()` не на верхнем уровне своего рендера, а изнутри `useStore`/`useSyncExternalStore`
       — React ругается «Do not call Hooks inside useEffect(...), useMemo(...), or other built-in
       Hooks». Проверено эмпирически (полный тестовый прогон), отклонено.
    2. **Выбрано:** `CreateFieldOptions.useFieldState` теперь получает третий параметр —
       `FieldStateContext { form, fullPath }` — доступный уже на верхнем уровне `FieldComponent`,
       до монтирования `<form.Field>` (`libs/forms-react/src/lib/field/create-field-primitives.tsx`).
       `FieldAddress`/`FieldCity` читают живое значение поля через `useStore(form.store, () =>
       form.getFieldValue(fullPath))` (реэкспорт `@tanstack/react-store` из `@tanstack/react-form`)
       и синхронизируют `inputValue` в обычном `useEffect` внутри `useFieldState` — легальный
       хук на верхнем уровне компонента.
  - **Совместимость:** параметр добавлен третьим и опциональным по использованию — все ~30
    остальных полей `forms-shadcn`/`@letar/forms`, чей `useFieldState` объявлен с 2 параметрами,
    не меняются (TS допускает функцию с меньшим числом параметров там, где ожидается большее).
    `render()` обоих полей больше не читает `field.state.value` для инициализации — убрана
    мёртвая переменная и связанный `initializedRef`-паттерн в render-scope.
  - **Проверки:** `nx test forms,forms-react,forms-shadcn` — 0 предупреждений «Cannot update»/
    «Do not call Hooks» в полном прогоне (промежуточный вариант 1 выше давал предупреждение на
    каждый рендер обоих полей во всех их тестах — легко воспроизводимый негативный контроль),
    все тесты зелёные без изменения ассертов (тест
    «стирание текста сразу очищает значение поля» с непустым `defaultValues` — тот же, только
    warning больше не всплывает). `typecheck:tsgo`/`lint` зелёные на `forms`, `forms-react`,
    `forms-shadcn` (в `forms` есть 23 не связанных с этой правкой lint-ошибки — унаследованный
    долг, отдельная задача от `QuietRidge`, не мои файлы). Живая проверка в Chromium —
    `form-develop-app-shadcn`, City/Address с непустым `defaultValues`.
  - Не понадобилось трогать Chakra-версии сверх `field-address.tsx`/`field-city.tsx` — у них тот
    же баг был независимо (не унаследован от shadcn, симметричный паттерн), фикс идентичен через
    тот же новый `FieldStateContext`.
  - CHANGELOG/версия обоих пакетов — обновлены (см. ниже).
- ✅ **`FieldOTPInput`, `FieldEditable`, `FieldColorPicker` добавлены — 30-е/31-е/32-е поля
  (2026-08-10, forms-dev), одним заходом.** Три поля, у каждого свой уровень переиспользования
  готового.
  - `FieldOTPInput`: переиспользует `shadcnUIKit.PinInput` (тот же примитив, что
    `FieldPinInput`) + таймер повторной отправки поверх. Beta: только числовой ввод —
    `inputMode="numeric"` зашит в сам примитив, `type="alphanumeric"` из Chakra-версии не
    поддержан контрактом `UIKitPinInputProps`.
  - `FieldEditable`: клик по превью (кнопка) переключает в режим редактирования (нативный
    `<input>`/`<textarea>`). Beta: без `showControls` (набора Edit/Cancel/Submit-кнопок) —
    `submitOnBlur` + Enter/Escape покрывают тот же сценарий проще; только `activationMode`
    `click`/`none`, без `dblclick`/`focus`.
  - `FieldColorPicker`: нативный `<input type="color">` (системный picker браузера) + hex-инпут
    - свотчи — не полный Ark UI `ColorPicker.Root` с областью насыщенности/яркости и
      hue/alpha-слайдерами. Сознательное решение по объёму, не техническое ограничение контракта:
      портировать такой compound под Radix/tailwind — отдельная задача существенно большего
      размера, чем остальные 31 поле.
  - **Находка (поймана линтом, не в проде):** `useState`/`useDeclarativeForm`, вызванные внутри
    `render()` (а не `useFieldState()`), валят `react-hooks/rules-of-hooks` — ESLint распознаёт
    хуки по имени функции-обёртки (`useFieldState` матчит, `render` нет), тот же класс находки,
    что была на `FieldDateRange` с `useId()`. Обе исправлены переносом состояния в
    `useFieldState`.
  - Протечек границы `forms-core`/`forms-react` не найдено.
  - **Проверки:** 14 новых RTL-тестов (107/107 в пакете, было 93), негативные контроли
    (`activationMode="dblclick"` → `TS2322` на Editable, `swatches="red"` → `TS2322` на
    ColorPicker, `length="6"` → `TS2322` на OTPInput), `typecheck:tsgo`/`lint` зелёные после
    фикса находки выше. Отдельная находка в собственном тесте OTPInput — асинхронный клик
    resend без `waitFor` давал `act()`-warning в консоли (не баг компонента, только незавершённый
    промис в тесте) — исправлено добавлением `waitFor` на пост-условие.
  - Живая проверка в Chromium на `form-develop-app-shadcn`: Editable — клик → ввод → Enter →
    возврат в превью с новым текстом; ColorPicker — смена `<input type="color">` синхронизирует
    hex-инпут; OTPInput — посимвольный ввод во все 6 ячеек с автопереходом, подтверждено что это
    именно поле `smsCode` (не спутано с соседним `FieldPinInput` на той же странице — оба рядом
    используют один `data-slot="pin-input"`).
  - CHANGELOG/версия (`0.12.0` → `0.13.0`), README — обновлены.
- ✅ **Дедупликация кода после 15 новых полей — рефакторинг без изменения поведения (2026-08-10,
  forms-dev).** По итогам серии заходов (17→32 поля) накопились три идентичные копии:
  - `useAddressProvider` (`field-address.tsx`) и `useCityProvider` (`field-city.tsx`) — byte-for-byte
    одинаковый резолв провайдера (проп → `DeclarativeFormContext.addressProvider` → `token`-фолбэк).
    Вынесены в `useResolvedAddressProvider` (`lib/utils/use-address-provider.ts`).
  - `DATE_INPUT_CLASS`/`DATETIME_INPUT_CLASS` (`field-date-range.tsx`/`field-datetime-picker.tsx`) —
    та же строка tailwind-классов, что и у `shadcnUIKit.Input` (обход UIKit-контракта ради
    `min`/`max`/`step`, задокументированного «Находкой 1» на `FieldDateRange` выше). Вынесены в
    `NATIVE_INPUT_CLASS` (`lib/uikit/primitives/native-input-class.ts`), используется теперь и
    самим `Input`-примитивом — визуальный стиль синхронен при будущей смене темы.
  - `cardClass` (`field-radio-card.tsx`/`field-checkbox-card.tsx`) — идентичная реализация
    border+ring/opacity. Вынесена в `lib/utils/card-class.ts`.
  - Ни один из трёх случаев не был протечкой границы — все три копии жили внутри `forms-shadcn`,
    `forms-core`/`forms-react` не затронуты.
  - **Проверки:** 107/107 тестов (без изменений — рефакторинг переносит реализацию, не поведение),
    `typecheck:tsgo` зелёный. `lint` — 2 pre-existing `react-hooks/rules-of-hooks` ошибки в
    `field-address.tsx`/`field-city.tsx` (из отдельного, не связанного с этим рефакторингом
    исправления `useEffect` в `render()`) остались как есть — вне скоупа этой задачи, не трогала.
  - CHANGELOG/версия (`0.13.0` → `0.13.1`, patch — внутренний рефакторинг без изменения публичного API).
- ✅ **`FieldSignature` добавлен — 33-е поле (2026-08-10, forms-dev), первое из приоритетного
  списка координатора (Signature → FileUpload → Steps → Table → RichText, тред
  `forms-phase7-3-shadcn`).** Canvas-рисование мышью/пальцем + typed mode (текстовый ввод
  курсивом), переключатель режимов — две обычные кнопки, без нового Radix-примитива (у Chakra-версии
  это `SegmentGroup`, здесь не заводили новую зависимость ради переключателя из двух пунктов — тот
  же принцип, что у пресетов `FieldDateRange`). Логика геометрии штрихов и SVG-сборки
  (`escapeXml`/`buildSvgString`/`buildTypedSvgString`/`getCoords`) портирована из Chakra-версии
  как есть — заменена только UI-обвязка. Значение — data URI (`image/png` или `image/svg+xml`
  base64). Не входит в UIKit-контракт (нет примитива для canvas), тот же принцип, что у
  `Rating`/`Tags`/`ColorPicker`. Протечек границы `forms-core`/`forms-react` не найдено.
  - **Проверки:** 5 новых RTL-тестов (112/112 в пакете, было 107) — jsdom не реализует
    `HTMLCanvasElement.getContext`, поэтому тесты покрывают переключение режимов/видимость
    контролов, а не пиксельную отрисовку (тот же класс ограничения, что уже был у `ResizeObserver`
    для `Slider`). Негативный контроль (`exportFormat="jpeg"` → `TS2322`, `width="rainbow"` →
    `TS2322`), `typecheck:tsgo`/`lint` зелёные. Живая проверка в Chromium на
    `form-develop-app-shadcn` компенсирует пробел jsdom: реальный `MouseEvent`-штрих на canvas
    (`mousedown`→`mousemove`→`mouseup` через `dispatchEvent`) дал валидный `canvas.toDataURL()`
    (`data:image/png;base64,...`) и показал кнопку «Очистить»; typed mode — ввод текста показал
    «Очистить», клик по нему вернул canvas в пустое состояние с плейсхолдером; переключение
    draw↔typed корректно.
  - CHANGELOG/версия (`0.13.2` → `0.14.0`), README (таблица полей, «Известные упрощения») —
    обновлены. Демо-страница `form-develop-app-shadcn` дополнена (счётчик 32→33).
- ✅ **`FieldFileUpload` добавлен — 34-е поле (2026-08-10, forms-dev), второе из приоритетного
  списка координатора (Signature ✅ → FileUpload ✅ → Steps → Table → RichText, тред
  `forms-phase7-3-shadcn`).** Значение — `File[]`. Три варианта отображения (`button`/`dropzone`/
  `input`), портированы все из Chakra-версии. Не входит в UIKit-контракт (нет примитива
  `FileUpload` — у Chakra-версии это Ark UI `FileUpload.Root`, здесь нет ни Radix, ни Ark UI
  аналога) — вместо него скрытый нативный `<input type="file">`, триггер по клику на кнопку/
  дропзону, drag&drop через нативные `onDragOver`/`onDrop`. Превью изображений — `<img
  src={URL.createObjectURL(file)}>` вместо `FileUpload.ItemPreviewImage`. Security-проверка
  (`processFileWithSecurity` из `@letar/forms-core/security`) портирована без изменений —
  framework-free утилита, общая с Chakra-скином, протечек границы не найдено. Добавлена
  собственная клиентская проверка `maxFileSize` (без `security` тоже работает — Chakra-версия
  такой возможности не имела, `FileUpload.Root` Ark UI её делает сам).
  - **Проверки:** 5 новых RTL-тестов (117/117 в пакете, было 112) — jsdom не реализует
    `URL.createObjectURL`, поэтому тесты избегают `accept="image/*"` (та же стратегия обхода
    пробела jsdom, что у `FieldSignature`/canvas); покрыты выбор файла через `fireEvent.change`
    на скрытом инпуте, оба варианта (`button`/`dropzone`), `clearable=false`, удаление файла из
    списка. Негативный контроль (`variant="bogus"` → `TS2322`), `typecheck:tsgo`/`lint` (в т.ч.
    `oxlint(react-hooks/rules-of-hooks)` за `useRef` вне `useFieldState` и
    `next/no-img-element` за превью-`<img>`, оба исправлены) зелёные.
  - CHANGELOG/версия (`0.14.0` → `0.15.0`), README (таблица полей, «Известные упрощения») —
    обновлены. Демо-страница `form-develop-app-shadcn` дополнена (счётчик 33→34,
    `variant="dropzone" maxFiles={3} showSize`).
  - Живая проверка в Chromium: `DataTransfer`+`change`-событие на скрытом инпуте (реальный путь
    браузера для выбора файла) дало `field.handleChange` → в списке появились иконка, имя
    (`notes.txt`) и размер (`11 B`); клик по кнопке удаления вернул поле в пустое состояние.
- ✅ **`FormSteps` добавлен (2026-08-10, forms-dev), третье из приоритетного списка координатора
  (Signature ✅ → FileUpload ✅ → Steps ✅ → Table → RichText, тред `forms-phase7-3-shadcn`).**
  В отличие от предыдущих 34 полей — **не `createField()`-поле**, а compound-компонент
  форм-уровня (`FormSteps`, `.Step`, `.Indicator`, `.Navigation`, `.CompletedContent`), та же
  категория, что `Form.Steps` у Chakra-версии. Работает поверх `useDeclarativeForm()` из
  `@letar/forms-react` напрямую — не потребовался `createForm()`/`Form` (у `forms-shadcn` его
  всё ещё нет, отдельный пункт backlog). Framework-free логика (`use-step-state.ts` — регистрация/
  сортировка шагов; `use-step-navigation.ts` — переходы/валидация текущего шага, все нестабильные
  значения через рефы против бесконечного цикла регистрации; `use-step-persistence.ts` —
  localStorage) портирована из Chakra-версии практически без изменений. UI (индикатор с
  прогрессом, кнопки) — нативная разметка вместо Chakra `Steps.Root`/`Button`.
  - **Beta-упрощения (осознанно, не протечка границы):** без интеграции с `Form.When`
    (`hiddenFields` в оригинале — условное исключение полей шага из валидации) и без пропа
    `segment` (авто-обёртка `Form.Group` — в оригинале через `FormGroupDeclarative`, которого нет
    в `@letar/forms-react`; там есть похожий `FormGroup`/`useFormGroup`, но не идентичный API, не
    портировала ради экономии времени — можно добавить отдельной задачей, если понадобится). Без
    анимаций перехода между шагами (`framer-motion` — Chakra-версия тянет её как зависимость,
    здесь не добавляла новый peer ради первого прохода). Все три упрощения — за пределами того,
    что показывает 34 предыдущих поля (не связаны с `UIKit`-контрактом), задокументированы в
    README `forms-shadcn`.
  - **Проверки:** 5 новых RTL-тестов (122/122 в пакете, было 117) — сценарий из 2 шагов
    (`firstName` required → `email`), проверены: рендер только активного шага, блокировка
    перехода без заполнения обязательного поля, успешный переход, смена «Далее»→«Отправить» на
    последнем шаге, «Назад». Негативный контроль (`orientation="diagonal"` → `TS2322`),
    `typecheck:tsgo`/`lint` зелёные (два мелких фикса по ходу: unused `useState` в
    `form-steps-step.tsx` после удаления `when`-логики; `form.setFieldMeta` — явная аннотация типа
    параметра оказалась ýже контракта TanStack Form, убрана в пользу инференса — тот же код, что
    в оригинале, без аннотации проходит).
  - CHANGELOG/версия (`0.15.0` → `0.16.0`), README (новый раздел `FormSteps` с примером и
    beta-упрощениями) — обновлены. Демо-страница `form-develop-app-shadcn` дополнена отдельной
    изолированной 2-шаговой формой (не смешана с основной демо-формой — `FormSteps` скрывает
    неактивные шаги, что несовместимо с плоским списком остальных 34 полей на одной странице).
  - Живая проверка в Chromium: заполнение `firstName` + клик «Далее» → показался `email`-инпут
    второго шага, индикатор отметил первый шаг завершённым (галочка, `bg-primary`); на втором шаге
    кнопка «Далее» стала «Отправить»; клик «Назад» вернул на первый шаг с `firstName`-инпутом.
  - ✅ **Дедуп FormSteps-хуков в `@letar/forms-react` (2026-08-10, forms-dev).** Портирование
    `FormSteps` в shadcn-скин продублировало `use-step-state.ts`/`use-step-navigation.ts`/
    `use-step-persistence.ts` почти дословно (framework-free, не зависят ни от Chakra, ни от
    Radix — уже работали только с React + `@tanstack/react-form`). Построчное сравнение нашло
    один реальный сущностный разрыв: `hiddenFields`/`hideFieldsFromValidation`/
    `showFieldsForValidation` (интеграция с `Form.When`, условное скрытие полей от валидации) —
    есть только в Chakra-версии, у shadcn нет `Form.When` вовсе (см. beta-упрощения в
    `libs/forms-shadcn/README.md`).
    - Решение — вынести все три хука + типы `StepInfo`/`StepDirection` в `@letar/forms-react`,
      не дублировать. Разрыв не потребовал ветвления сигнатур: `hiddenFields` в
      `useStepNavigation` стал optional-параметром (`undefined` → фильтрация по пустому
      `Set`, поведение как было у shadcn — валидируются все поля шага); `useStepState`
      как и раньше всегда несёт `hiddenFields`-состояние — скины без `Form.When` просто не
      вызывают сеттеры, лишней абстракции/флага «включить hiddenFields» не потребовалось.
    - Второе найденное отличие — `STORAGE_PREFIX` в `useStepPersistence` (`'form-steps:'` у
      Chakra, `'form-steps-shadcn:'` у shadcn — чтобы оба скина одной формы не затирали друг
      другу прогресс в `localStorage`). Стало полем `storagePrefix?: string` конфига,
      по умолчанию `'form-steps:'`; `FormStepsRoot` (`forms-shadcn`) передаёт
      `'form-steps-shadcn:'` явно.
    - `FormStepsContextValue` **не унифицирован** — осознанно: у Chakra-версии в контексте
      ещё 6 chakra-специфичных полей (`orientation`/`size`/`variant`/`colorPalette`/`animated`/
      `animationDuration`), которых у shadcn нет и не будет (нативная разметка вместо
      `Steps.Root`). Обобщать под общий тип означало бы либо делать эти поля опциональными
      (падение типобезопасности без выигрыша), либо городить generic — не стоит экономии на
      двух похожих, но разных интерфейсах. `StepInfo`/`StepDirection` (без UI-специфики)
      вынесены как общие типы, `FormStepsContextValue` — как был, по одному на скин.
    - Публичный API обоих пакетов не изменился — `StepInfo`/`StepDirection` реэкспортируются
      из `form-steps-context.tsx` каждого скина, как раньше. Версии: `@letar/forms` `2.0.1` →
      `2.0.2`, `@letar/forms-shadcn` `0.16.0` → `0.16.1`, `@letar/forms-react` `0.2.0` → `0.2.1`
      (все три — patch, внутренний рефакторинг).
    - **Проверки:** `nx test forms` (без изменений в счёте), `nx test forms-shadcn` (без
      изменений в счёте), `typecheck:tsgo`/`lint` зелёные на всех трёх пакетах. Lint `forms`
      репортит 23 предсуществующих ошибки в несвязанных файлах (`form-comparison.tsx`,
      `use-form-analytics.ts`, `render-count.spec.tsx` и т.д.) — не в диффе этой задачи, не
      трогались.
- ✅ **`FieldTableEditor` добавлен (2026-08-10, forms-dev), четвёртое из приоритетного списка
  координатора (Signature ✅ → FileUpload ✅ → Steps ✅ → Table ✅ → RichText, тред
  `forms-phase7-3-shadcn`).** Как и `FormSteps` — не `createField()`-поле, а compound-компонент,
  компонующий `form.Field(mode="array")` напрямую. Портирован из `@letar/forms` (Chakra-скин)
  практически без изменений логики: `use-table-columns.ts`/`use-table-navigation.ts` (обе —
  framework-free, ни одной Chakra-зависимости в оригинале) скопированы дословно, `table-utils.ts`
  вообще не понадобился отдельным файлом — `@letar/forms-core/table` уже экспортирует
  `buildTSV`/`coerceValue`/`computeAggregate`/`formatCellValue`/`getDefaultRow`/`parseTSV`
  напрямую, а `@letar/forms-core/schema` даёт `traverseSchema`/`getZodConstraints` с тем же API,
  что использовала Chakra-версия. Сменилась только разметка: native `<table>`/`<thead>`/`<tbody>`/
  `<tfoot>` + Tailwind вместо `Table.Root`/`Table.Header`/`Table.Body`/`Table.Footer`, `FieldRoot`/
  `FieldLabel`/`FieldError` — те же примитивы UIKit-скина, что использует `createField()` (прямой
  импорт из `../uikit/primitives/*`, не `createField()`-обёртка, т.к. это не single-value поле).
  8 файлов в `libs/forms-shadcn/src/lib/table/` (types, context, cell, row, header, footer,
  toolbar, mobile-view, root) + `use-table-columns.ts`/`use-table-navigation.ts`.
  - **Beta-упрощение (осознанно, не протечка границы):** `sortable` — нативный HTML5 drag&drop
    (`draggable` на `<tr>` + `onDragStart`/`onDragOver`/`onDrop`, состояние перетаскиваемой строки
    — `useRef`, ячейка под курсором — `useState` для подсветки `border-t-primary`), не
    `@dnd-kit/sortable` — тот же принцип, что у `FormSteps` без `framer-motion`: не тянуть новый
    peer ради одной фичи в первом проходе (у `forms-shadcn` `@dnd-kit` вообще не было peer'ом,
    в отличие от `@letar/forms`, где `SortableWrapper`/`SortableItem`/`DragHandle` уже тянут его
    транзитивно через `FormGroupList`). Функционально эквивалентно (перетаскивание строк работает,
    вызывает `moveRow` → `arrayField.moveValue`), но без keyboard-DnD и анимации перестроения
    списка, которые даёт `@dnd-kit/sortable`. Задокументировано в README `forms-shadcn`.
  - **Cell-level редактирование:** enum-колонки — нативный `<select>` (не Radix `Select` — та же
    причина, что у Chakra-версии с `NativeSelect`: слишком тяжёлый примитив для inline-ячейки),
    boolean — нативный `<input type="checkbox">`, number/string — нативный `<input>`. Навигация
    Tab/Shift+Tab/Enter/Escape/стрелки между ячейками — `useTableNavigation`, портирован без
    изменений (работает через `data-row`/`data-col` DOM-атрибуты и `document.querySelector`
    внутри `containerRef`, framework-free независимо от UI-библиотеки).
  - **Проверки:** 11 новых RTL-тестов (133/133 в пакете, было 122) — рендер колонок/строк,
    computed-ячейка (не открывает inline-редактирование), inline-редактирование обычной ячейки
    (клик → `input` → `change` → `blur` → значение сохранено), пустая таблица (`emptyText`),
    добавление/удаление строки, `minRows`/`maxRows` (disabled-состояние кнопок), `selectable`
    (число чекбоксов), `readOnly` (скрыты toolbar/удаление), footer с `aggregate: 'sum'`.
    **Находка теста:** jsdom не применяет media queries — mobile-карточки и desktop `<table>`
    рендерятся в DOM одновременно (различаются только классами `hidden`/`md:block`, не реальным
    display), поэтому текстовые запросы дают дубли (лейбл колонки в шапке таблицы совпадает с
    лейблом поля в мобильной карточке) — решение: скоуп через `within(table)`, не общий
    `screen.getByText`. Негативный контроль (`size="bogus"` → `TS2322`), `typecheck:tsgo`/`lint`
    зелёные (один фикс по ходу: `no-empty-function` на плейсхолдер-рефе `addRowRef` — тот же
    паттерн, что в оригинале Chakra-версии, там просто другой eslint-конфиг это не ловил).
  - CHANGELOG/версия (`0.16.1` → `0.17.0`), README (таблица полей, новый раздел
    `FieldTableEditor`) — обновлены.
  - Живая проверка в реальном браузере (Chromium, `form-develop-app-shadcn`): изолированная форма
    с array-полем `items` (позиции заказа), computed-колонка «Итого» = `qty × price` с
    `format` в рубли, footer-сумма — 8970 ₽ по двум строкам. Добавление строки через toolbar-кнопку
    — новая пустая строка с `computed` = 0 ₽. Escape в режиме редактирования — откат без
    сохранения (проверено через настоящий `KeyboardEvent`, не эмуляцию). Удаление строки, чекбокс
    select-all → появление кнопки «Удалить выбранные (N)» со счётчиком, `draggable=true` на
    `<tr>` при `sortable`. **Находка:** программный `blur()`/`dispatchEvent(new Event('blur'))` из
    `javascript_tool` не закрывал inline-редактирование в этой сессии (Browser pane был свёрнут —
    `computer{action:"screenshot"}` отдельно вернул ошибку «pane is not displayed, not compositing
    frames») — вероятно документ без реального фокуса
    не доставляет focus/blur-события так же, как в активной вкладке. Не протечка границы: RTL-тест
    того же сценария (`fireEvent.blur`) зелёный, `KeyboardEvent`/`click()`-события в той же живой
    сессии отработали корректно (Escape, add/remove row, select-all) — похоже на артефакт
    свёрнутой панели превью, не баг компонента.
  - **`FieldRichText`** — пятое, последнее из приоритетного списка координатора (Signature ✅ →
    FileUpload ✅ → Steps ✅ → Table ✅ → **RichText** ✅) — паритет по этому списку закрыт.
    WYSIWYG-редактор на Tiptap, портирован из `@letar/forms` (Chakra-скин): тот же домен
    (`StarterKit`+`Underline`+`Link`+`Placeholder` extensions, `onUpdate` → `field.handleChange`,
    синхронизация `value` при внешнем изменении без прыжка курсора, `outputFormat: 'html' | 'json'`),
    другая обвязка — native `<button>`-тулбар вместо Chakra `IconButton`/`HStack`, Tailwind
    arbitrary-selector'ы (`[&_.tiptap_h1]:...`, `content-[attr(data-placeholder)]`) вместо Chakra
    `css`-пропа для стилизации содержимого и placeholder.
    - **Beta-упрощения:** без `imageUpload`/`ImagePopover` — вставка изображений с загрузкой на
      сервер не портирована (требует app-specific upload endpoint, не framework-free логика).
      Кнопка `link` — `window.prompt` вместо Popover-формы с полем ввода; тот же фолбэк уже
      существовал в Chakra `TOOLBAR_CONFIG.link.action` как запасной вариант без отдельного
      `LinkPopover` — здесь он стал основным путём, не запасным.
    - **Проверки:** 8 новых RTL-тестов (141/141 в пакете, было 133) — рендер contenteditable,
      label, тулбар по умолчанию/ограниченный `toolbarButtons`/скрытый `showToolbar={false}`,
      `readOnly` скрывает тулбар, `disabled` блокирует кнопки, негативный контроль типов.
      **Находка теста:** клик по кнопке форматирования (`toggleBold()`) не проверяется на реальное
      переключение `aria-pressed` — jsdom не реализует DOM Selection API до состояния, нужного
      ProseMirror, чтобы команда применилась к выделению; тест ограничен проверкой отсутствия
      краша. Тот же класс находки, что blur-события в `FieldTableEditor` — среда, не баг
      компонента.
    - CHANGELOG/версия (`0.17.0` → `0.18.0`), README (таблица полей, новый раздел
      `FieldRichText`), peer-зависимости `@tiptap/react`/`@tiptap/starter-kit`/
      `@tiptap/extension-link`/`@tiptap/extension-underline`/`@tiptap/extension-placeholder`
      (уже установлены в корне монорепо для `@letar/forms`, здесь заявлены как peer) — обновлены.
    - Живая проверка в реальном браузере (Chromium, `form-develop-app-shadcn`): изолированная
      форма с `defaultValues.content` непустым HTML — рендер `<strong>`/`<em>` подтверждён через
      `innerHTML` редактора, все кнопки тулбара присутствуют в DOM. Вставка текста через
      `document.execCommand('insertText', ...)` изменила содержимое и **не была откачена**
      эффектом синхронизации внешнего `value` — подтверждает, что `onUpdate` реально доходит до
      `field.handleChange` и обратно (petля `value` ↔ `editor` работает). Клик по кнопке
      «Полужирный» и `computer{action:"screenshot"}` не удалось проверить визуально в этой
      сессии — Browser pane не композитил кадры (`the Browser pane is not displayed`), тот же
      известный артефакт свёрнутой панели, что и в проверке `FieldTableEditor`; DOM/JS-проверки
      остаются валидными независимо от него.
- ✅ **Шаг 5 — 47 из 56 полей `forms-shadcn` портировано (2026-08-11, forms-dev),
  `@letar/forms-shadcn` 0.30.0.** Одна непрерывная сессия дожала оставшиеся 12
  полей вслед за приоритетным списком координатора (Signature→FileUpload→Steps→Table→RichText,
  все ✅ ранее): `FieldYesNo`, `FieldNumberInput`, `FieldPasswordStrength`, `FieldTime`,
  `FieldCascadingSelect`, `FieldImageChoice`, `FieldSchedule`, `FieldLikert`,
  `FieldMatrixChoice`, `FieldDataGrid`, `FieldCalculated`, `FieldAuto` — каждое отдельным
  коммитом (lib + демо), с тестами, README/CHANGELOG/версией по ходу.
  - **`FieldCascadingSelect`** — не `createField()`-поле (как `FormSteps`/`FieldTableEditor`),
    компонует `form.Subscribe` напрямую: рендер зависит от значения ДРУГОГО поля (`dependsOn`).
  - **`FieldDataGrid`** — первое поле, добавившее `@tanstack/react-table` в `peerDependencies`
    (`bun install` перерезолвил `libs/forms-shadcn/node_modules/@tanstack/react-table`).
    Изолировано через `lazy()` + dynamic `import()` (`field-data-grid-impl.tsx`) — тот же
    паттерн, что `FieldRichText` для `@tiptap/*`. Beta: без виртуализации
    (`@tanstack/react-virtual` — второй тяжёлый peer, тот же принцип отказа, что у
    `FieldTableEditor`), без resize/drag-reorder колонок, без auto-резолва из schema.
  - **`FieldCalculated`** — `useComputedValue` (`useSyncExternalStore` на `form.store`, защита
    от циклических зависимостей) скопирован framework-free дословно из Chakra-версии,
    `useDebounce` переиспользован из уже публичного экспорта `@letar/forms-react`.
  - **`FieldAuto`** (последнее, замкнуло паритет) — `traverseSchema` + поиск по dot-path,
    диспетчеризация на уже существующие поля пакета по базовому Zod-типу. Beta: без
    `renderFieldByType`/`meta.fieldType`-диспетчеризации на ~50 типов, которую даёт
    Chakra-версия — только string/number/boolean/date/enum.
  - Общий паттерн beta-упрощений по всем 12: одна разметка на все брейкпоинты (без раздельных
    мобильных/десктопных DOM-деревьев — `FieldLikert`/`FieldMatrixChoice`), без стрелочной
    клавиатурной навигации по ячейкам/точкам, без auto-резолва колонок/полей из schema там, где
    Chakra-версия это делает.
  - `FieldAuto` живая проверка — в Chromium (Browser pane): изолированная форма со своей
    Zod-схемой (`DemoForm` расширен опциональным `schema`-пропом под эту задачу — раньше был
    только `form`), все 5 веток диспетчеризации (string/textarea/number/switch/enum) подтверждены
    через `read_page`/`javascript_tool`, консоль чистая (только HMR WebSocket-шум прокси).
    `FieldDataGrid` — рендер/данные/rowSelection подтверждены в Browser pane; сортировка по
    клику заголовка проверена через RTL (`fireEvent.click`), не через Browser pane — известный
    класс артефактов JS-харнесса (raw `dispatchEvent(MouseEvent)` не триггерит React-обработчик
    так же, как реальный клик в этой сессии), не баг компонента.
  - `apps/form-develop-app-shadcn` синхронизирован по ходу — по демо-коммиту на каждое поле,
    финальный счётчик страницы «47 из 56 полей портировано».
  - ⚠️ **Формулировка "56 из 56 / полный паритет" — исправлена на "47 из 56" (2026-08-11,
    v0.30.1).** 56 — верный знаменатель (реальный подсчёт по файлам `@letar/forms`, включая
    `City` и 7 document-полей), но числитель ошибочно включал 9 полей, которые не портированы:
    `FieldMaskedInput`, `FieldCreditCard`, `FieldInn`, `FieldKpp`, `FieldOgrn`, `FieldSnils`,
    `FieldPassport`, `FieldBik`, `FieldBankAccount` — все ждут исследовательскую сессию по
    замене `use-mask-input` (backlog выше). Найдено при release-ready ревизии, решение
    зафиксировано координатором `QuietRidge` (тред `forms-phase7-3-shadcn`): знаменатель не
    занижать. Заодно найден попутный баг синхронизации источников истины на Chakra-стороне —
    `form-mcp`/`docs/fields.md` дают только 49 полей (без `City` и document-полей) — вне
    резервации `forms-shadcn`, координатор заводит отдельной backlog-записью.
  - Следующий шаг — 7.4 (замер трафика, всё ещё не начат — трафика нет) или publish-prep
    (`tsup.config.ts`/`package.publish.json`/entry-сплиттинг, задача координатора #47).
- [ ] **7.4 Замер трафика** → решение: доносить сложные поля или нет.
- [ ] **7.5 Docs-сайт на отдельном домене** + живые демо. SEO под `zod forms react`, `prisma form generator`.
- [x] **7.6 `llms.txt` + усиление MCP** (2026-08-11, задача координатора `QuietRidge` #54) —
      недоиспользованный козырь №1 закрыт:
  - **Фикс `form-mcp` (v1.0.3).** `field-registry.ts` терял 7 российских документных полей —
    `CATEGORY_MAP` ждал ключ `'Российские документы'`, реальный заголовок секции в
    `libs/forms/docs/fields.md` — `## Документные поля (Россия)`. Несовпадение строк, парсер
    молча пропускал секцию целиком. `list_fields`/`get_field_props`/`get_field_example` (все три
    читают общий `fieldRegistry`) теперь видят `INN`/`KPP`/`OGRN`/`BIK`/`BankAccount`/`SNILS`/
    `Passport`. Заодно найдено: `FieldCity` отсутствовал в `docs/fields.md` целиком (не баг
    парсера — поле было не задокументировано, хотя экспортируется как `Form.Field.City`) —
    добавлена строка в таблицу «Специализированные», счётчик в шапке файла поправлен 56 → 57.
  - **`llms.txt` (`apps/form-docs`, v0.1.9).** Route Handler `src/app/llms.txt/route.ts`, формат
    llmstxt.org — ручной курируемый список ключевых доков (Getting Started, Installation, Quick
    Start, createForm(), Field.\* Reference, API, ZenStack Plugin, Offline, i18n, MCP Server,
    demo, changelog, npm). Не автогенерация из Fumadocs source API — 90+ MDX-файлов с RU-дублями
    превратили бы компактный указатель в карту сайта (для карты сайта уже есть `sitemap.ts`).
    Проверено в Browser pane: `http://localhost:3020/llms.txt` отдаёт корректный markdown.
- [ ] **7.7 Open-core сервис** — hosted-приём сабмитов + дашборд ответов + аналитика (синергия со studio/Tochka).
      Free — вся библиотека и оба скина; платно — сервис вокруг форм, не урезание кода.
- [x] **7.8 Тонкий Vue-адаптер (архитектурный пруф границы)** (2026-08-12, задача координатора
      `QuietRidge` #58) — новая библиотека `libs/forms-vue` (`@letar/forms-vue` 0.1.0), 5 полей
      (Input/Textarea/Number/Checkbox/Select) поверх `@tanstack/vue-form`.
  - **Главный результат — граница подтверждена.** `forms-core` не потребовал ни одного изменения:
    `getFieldMeta` (`@letar/forms-core/schema`) читает `.meta({ ui: {...} })` той же Zod-схемы,
    что и React-скин, без единой модификации. DIP-граница, которую держали с 2026-07-08, реальна,
    не только на бумаге.
  - **Архитектура:** `AppForm` (`useForm` + `provide`/`inject` контекста `{form, schema}`) +
    `createField(displayName, render)` — Vue-эквивалент `createField` из `forms-react`, но с
    `defineComponent`/`h()` вместо JSX (файлы `.ts`, не `.vue` — так `typecheck:tsgo`/`tsc`
    проверяют их наравне с остальными библиотеками, без `vue-tsc`). `FieldSelect` (нужен доп.
    проп `options`) собран напрямую по тому же контексту, не через фабрику.
  - **Без UIKit-слоя.** Решение по вопросу из задачи координатора: одна референсная
    реализация на голом HTML/классах (`letar-field__*`), не полноценный свопаемый скин —
    для пруфа границы этого достаточно, второй дизайн-скин под Vue не нужен.
  - **Валидация:** `onChange: schema.shape[name]` — `@tanstack/vue-form` принимает Zod-схему
    напрямую (Standard Schema), отдельный адаптер не понадобился.
  - **Тесты:** vitest + `@vue/test-utils`, `libs/forms-vue/src/lib/app-form.spec.ts` (5 сценариев:
    метки из схемы, показ ошибки, блокировка невалидного сабмита, успешный сабмит, guard «поле
    вне `<AppForm>`»). `nx test/lint/typecheck:tsgo forms-vue` — зелёные.
  - **Побочные находки:** общий `.oxlintrc.json` включает `react-hooks/rules-of-hooks` для всех
    проектов — ложно триггерится на Vue composables (`useForm`, `useAppFormContext`), названных по
    конвенции `use*`, но не являющихся React Hook. Первый non-React `use*`-код в репо. Фикс —
    `libs/forms-vue/.oxlintrc.json` (`extends` корневого + `rules-of-hooks: off`) и свой
    `--config` в `project.json` таргета `oxlint`, без правки общего конфига.
  - **Демо** — не заводилось отдельным приложением (непропорционально объёму задачи, как и
    разрешала формулировка координатора), пример — в README.md пакета.

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
