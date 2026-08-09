# Выполненные задачи — Form Develop App

Детальное описание всех реализованных фич.

## Версия 0.1.0

### Фаза 1: Концепция переиспользуемых форм

- Декларативный compound component API (`Form`, `Form.Group`, `Form.Group.List`, `Form.Field.*`, `Form.Button.*`)
- Прототип в `@letar/forms/declarative`
- Полное E2E покрытие

### Фаза 2: Базовые поля

- String, Number, Date, Time, Password, Textarea
- Checkbox, Switch, RadioGroup, Select, NativeSelect
- Интеграция с Zod валидацией
- CRUD рецептов (list, create, edit, delete)

### Фаза 2.5: Продвинутые поля выбора

- Combobox (async поиск, группировка), Listbox (single/multi)
- CheckboxCard, RadioCard, SegmentedGroup
- ColorPicker (swatches, eye dropper), Editable (inline edit)
- Schedule (редактор расписания с перерывами)
- PinInput (OTP, маскированный ввод), Slider (marks, orientation), Rating

### Фаза 3: Form-level фичи

- localStorage Persistence (автосохранение черновиков, TTL, dialog восстановления)
- Form.Button.Reset, Form.DirtyGuard (beforeunload)

### Фаза 4: Расширенные компоненты

- FileUpload (button, dropzone, input варианты)
- RichText (Tiptap WYSIWYG: bold, italic, заголовки, списки, ссылки)
- Form.When (условный рендеринг: is, isNot, in, notIn, condition, fallback)
- Form.Steps (мультистеп: Indicator, Navigation, CompletedContent, validateOnNext, linear)

### Фаза 5: DateRange, Tags, Autocomplete

- DateRange (start/end, пресеты: today, thisWeek, thisMonth)
- Tags (Enter/разделитель, maxTags, удаление)
- Autocomplete (static/async suggestions, debounce)

### Фаза 6: Числовые, маски, продвинутые

- NumberInput (стрелки, step), Currency (₽/$, разделители), Percentage (суффикс %)
- Phone (маска по стране, флаг), MaskedInput (произвольная маска)
- Address (DaData интеграция), Duration (HH:MM → минуты), DateTimePicker
- PasswordStrength (индикатор силы, требования), OTPInput (таймер resend)

### Фаза 7: Оффлайн формы

- useOfflineForm, useOfflineStatus, useSyncQueue
- Form.OfflineIndicator, Form.SyncStatus
- IndexedDB очередь синхронизации (idb-keyval)
- Интеграция persist + offline

### Фаза 8: Улучшения Form

- Form.Steps анимации (framer-motion slide transitions)
- validateOn: change/blur/submit/mount
- disabled/readOnly на уровне формы

### Фаза 9: Рефакторинг

- createField factory с useFieldState
- useDebounce общая утилита
- 20+ компонентов через factory pattern
- Все комментарии на русском

### Фаза 10: Controlled State

- Form без onSubmit — controlled state container
- form.Subscribe для подписки на изменения
- /controlled-state-demo с live preview

### Фаза 11: Автоматические Zod constraints

- getZodConstraints() — извлечение constraints из Zod v4
- Автоматические minLength/maxLength, min/max, type в полях
- minItems/maxItems для Form.Group.List
- /constraints-demo (14 тестов × 3 браузера)

### Фаза 12: Генерация из Zod схемы

- Form.FromSchema — полностью автоматическая форма
- Form.AutoFields (include/exclude/recursive/fieldWrapper)
- Form.Field.Auto — автовыбор компонента
- 37 fieldType маппингов
- /auto-fields-demo

### Фаза 13: ZenStack интеграция

- withUIMeta() / withUIMetaDeep() для обогащения ZenStack схем
- @letar/zenstack-form-plugin v2.1.0 — генерация из schema.zmodel
- enumMeta(), relationMeta(), textMeta() и другие хелперы
- RelationFieldProvider для автозагрузки опций
- /relation-demo

### Фаза 14: i18n для ошибок валидации

- createFormErrorMap() — Zod error map с i18n
- FormI18nProvider с setupZodErrorMap
- Генерация validation.\* ключей в ZenStack плагине
- /i18n-demo с переключением локали

### Фаза 15: Unit тесты и cleanup

- form-from-schema.spec.tsx (15 тестов)
- form-with-api.spec.tsx (12 тестов)
- Deprecated type aliases централизация
- error.tsx и not-found.tsx

### Фикс typecheck:tsgo (2026-08-04)

Приложение не проходило `nx typecheck:tsgo` (17 ошибок, техдолг из корневого `PLAN.md` §29).

- `schema.zmodel` никогда не имел блока `generator client` — добавлен, `@/generated/prisma`
  стал реально генерироваться. Попутно `datasource.url` вынесен в `prisma.config.ts` (Prisma 7
  P1012).
- Импорты enum'ов/`PrismaClient` переведены на подпути `@/generated/prisma/enums` и `/client` —
  Prisma 7 больше не отдаёт barrel-файл.
- `field-change-demo`: `NativeSelectOption` использует `title`, не `label`.
- `relation-demo`: приведение `useQuery` к `RelationConfig['useQuery']` — пропс объявлен без
  параметров типа.
- `data-grid-demo`: собранные `submittedData` не отображались — добавлен `SubmittedDataPreview`.
- Мелкие точечные фиксы (useRef с initialValue, unknown в JSX).

### Фикс nx lint (2026-08-05)

Приложение не проходило `nx lint` (6 ошибок, все правило `curly`).

- `autofill-demo/page.tsx`, `filters-state-demo/page.tsx`: однострочные `if (cond) return x`
  переведены в блочную форму `if (cond) { return x }`. `--fix` не годится — dprint снимает
  фигурные скобки с однострочного `if` обратно при автоформатировании, конфликтуя с ESLint.

### Фикс `references` на библиотеки в `tsconfig.json` (2026-08-07)

`apps/form-develop-app/tsconfig.json` ссылался на 4 библиотеки (`query-provider`, `forms`,
`format-utils`, `chakra-provider`) через `references`. Такая ссылка ведёт на solution-конфиг
библиотеки, TypeScript редиректит на **последний** из его `references` (`tsconfig.spec.json`),
чей output никем не собирается — `TS6305` + каскад `TS7006`/`TS2305`. Подробности механизма —
`.claude/rules/libs.md` (раздел «Тот же редирект под обычным `tsc`»), фикс сделан по образцу
`dashboard-agent` (0.11.1).

- Убран весь блок `references` — приложение уже резолвит библиотеки напрямую через `paths`.
- После удаления вылез `TS6059: not under 'rootDir'` — приложение расширяет общий пресет
  `tsconfig.next-app.json`, у которого задан `outDir`, из-за чего TypeScript сам вывел `rootDir`
  как `apps/form-develop-app` и не принял файлы из `libs/*`. Добавлен явный
  `"rootDir": "../.."` в `compilerOptions`, чтобы `rootDir` заведомо покрывал и `apps/`, и
  `libs/`.
- `nx typecheck:tsgo form-develop-app --skip-nx-cache` — чисто (0 ошибок).
- `nx build form-develop-app --skip-nx-cache` — TypeScript-стадия проходит («Finished
  TypeScript»); билд падает на пререндере `/controlled-state-demo` (`formContext only works
  within a formComponent`) — рантайм-баг демо-страницы, не связан с этой правкой, вне скоупа.

---

> Перенесено из PLAN.md: 2026-08-09

## Backlog

### CreditCard + CAPTCHA ✅

- [x] **credit-card-demo** — ввод данных карты (inline + stacked layout, brand detection)
- [x] **captcha-demo** — API reference и конфигурация (Turnstile, reCAPTCHA, hCaptcha)

### MatrixChoice (Фаза 19) ✅

- [x] **Form.Field.MatrixChoice** — матричный выбор (radio/checkbox/rating)
- [x] 3 варианта: radio, checkbox, rating
- [x] Responsive мобильный вид (карточки)
- [x] **matrix-choice-demo** — демо-страница (NPS + навыки + рейтинг)

### TableEditor Inline Table (Фаза 16.1) ✅

- [x] **Form.Field.TableEditor** — инлайн-редактируемая таблица для array-полей
- [x] Авто-колонки из Zod schema или кастомные через `columns` prop
- [x] Inline editing: клик по ячейке → Input/NativeSelect/Checkbox
- [x] Tab/Enter навигация, Escape для выхода
- [x] Computed columns, footer aggregates (SUM, AVG, etc.)
- [x] Copy-paste из Excel (TSV парсинг)
- [x] Чекбокс-выбор строк + массовое удаление
- [x] **table-editor-demo** — демо-страница (заказ + контакты)

### Russian Documents (Фаза 25) ✅

- [x] **zRu validators** — 9 Zod-валидаторов с контрольными суммами (ИНН, ОГРН, БИК, СНИЛС, etc.)
- [x] **Form.Document.\*** — 8 UI-полей с масками и иконками
- [x] **createDocumentField** — фабрика для кастомных документных полей
- [x] **Subpath export** `@letar/forms/validators/ru`
- [x] **documents-demo** — демо-страница
- [x] **Тесты** — 46 unit-тестов для валидаторов

### Signature (Фаза 17) ✅

- [x] **Form.Field.Signature** — canvas-подпись мышью/пальцем + typed mode
- [x] Draw mode: рисование с lineCap round, touch support
- [x] Typed mode: ввод текста, отрисовка курсивом на canvas
- [x] Переключение режимов через SegmentedControl
- [x] Кнопка очистки, placeholder, responsive
- [x] **signature-demo** — демо-страница с 3 примерами
- [x] **Тесты** — 7 unit-тестов

### Security Patterns (Фаза 28) ✅

- [x] **Honeypot** — ловушка для ботов (`<Form honeypot={true}>`)
- [x] **Rate Limiting** — клиентский лимит (`<Form rateLimit={{ maxSubmits: 3, windowMs: 60000 }}>`)
- [x] **Secure File Upload** — MIME проверка по magic bytes, удаление EXIF, переименование в UUID
- [x] **security-demo** — демо-страница со всеми 3 компонентами
- [x] **Тесты** — 21 unit-тест

### Вычисляемые поля (Фаза 18) ✅

- [x] **Form.Field.Calculated** — вычисляемое поле с автопересчётом
- [x] **useComputedValue** — хук реактивного вычисления (useSyncExternalStore)
- [x] **deps оптимизация** — пересчёт только при изменении зависимых полей
- [x] **format** — форматирование отображаемого значения
- [x] **hidden mode** — вычисление без отображения (как Hidden)
- [x] **Защита от циклов** — runtime detection циклических зависимостей
- [x] **calculated-demo** — демо-страница с 4 примерами
- [x] **Тесты** — 8 unit-тестов

### Утилитарные компоненты (Фаза 22) ✅

- [x] **Form.InfoBlock** — info/warning/error/success/tip блок на базе Chakra Alert
- [x] **Form.Divider** — разделитель секций с меткой и иконкой на базе Chakra Separator
- [x] **Form.Field.Hidden** — скрытое поле (не рендерится, только в form state)
- [x] **utility-demo** — демо-страница со всеми компонентами
- [x] **Тесты** — 10 unit-тестов

### Smart Autofill (Фаза 20) ✅

- [x] **autocomplete-map** — 30+ маппингов name → autocomplete (email, phone, address...)
- [x] **resolveAutoComplete** — prop > meta > auto-detect приоритет
- [x] **FieldUIMeta.autocomplete** — override через `.meta({ ui: { autocomplete } })`
- [x] **field-string, field-password, field-textarea** — автоматический autocomplete
- [x] **autofill-demo** — демо с инспектором атрибутов
- [x] **Тесты** — 22 unit-теста маппинга

### onFieldChange & Form.Watch ✅

- [x] **onFieldChange prop** — реактивные побочные эффекты при изменении полей
- [x] **Form.Watch component** — renderless компонент-наблюдатель с поддержкой FormGroup
- [x] **field-change-demo** — демо-страница с примерами обоих API
- [x] **Тесты** — 7 unit-тестов для хука и компонента

### Концепция переиспользуемых форм ✅

- [x] **Пример желаемого API** — декларативный compound component API
- [x] **Анализ требований** — определены компоненты Form, Form.Group, Form.Group.List, Form.Field._, Form.Button._
- [x] **План доработки** — составлен план изменений в `@letar/forms`
- [x] **Прототип** — реализован в `@letar/forms/declarative`
- [x] **Тестирование** — полное E2E покрытие всех компонентов

---

## TODO

- [x] Добавить Form.Field.Select для выбора из списка (базовый FieldSelect)
- [x] Интеграция с Zod валидацией через schema prop
- [x] Автоматическое извлечение UI метаданных из Zod `.meta({ ui: {...} })`
- [x] Добавить Form.Field.Checkbox / Form.Field.Switch
- [x] Добавить кнопки управления массивами (Add, Remove)
- [x] Добавить DnD сортировку для массивов (`sortable` prop + `DragHandle`)
- [x] Тестирование на реальном примере Recipe
- [x] CRUDL страницы для рецептов
- [x] Обновить E2E тесты под новую разметку (data-field-name, role-based селекторы, xpath для карточек)
- [x] Добавить Form.Field.Textarea для многострочного текста
- [x] Добавить Form.Field.Date для выбора даты
- [x] Добавить Form.Field.Time для выбора времени
- [x] Добавить Form.Field.Password с toggle visibility

---

## Backlog — Новые компоненты (Фаза 2.5) ✅

### 🔴 Высокий приоритет — Реализовано

- [x] **Form.Field.Combobox** — асинхронный поиск:
  - Интеграция с TanStack Query и ZenStack hooks
  - Debounce ввода (настраиваемый, по умолчанию 300ms)
  - Минимальное количество символов для поиска
  - Поддержка группировки результатов
  - Пример: поиск продукта по категориям

- [x] **Form.Field.Listbox** — выбор из списка:
  - Single и Multiple режимы
  - Статический список значений

- [x] **Form.Field.CheckboxCard** — карточки с чекбоксами:
  - Группировка CheckboxCard
  - Иконки, описания, addon

- [x] **Form.Field.RadioCard** — карточки с радиокнопками:
  - Группировка RadioCard
  - Варианты layout (horizontal, vertical, centered)

- [x] **Form.Field.SegmentedGroup** — сегментированный выбор:
  - Замена для простых Radio/Tabs
  - Поддержка иконок

- [x] **Form.Field.ColorPicker** — выбор цвета:
  - Swatches (предустановленные цвета)
  - Eye dropper
  - Форматы: hex, rgba, hsla

- [x] **Form.Field.Editable** — inline редактирование:
  - Двойной клик для активации
  - Кнопки подтверждения/отмены

- [x] **Form.Field.Schedule** — редактор расписания:
  - Полный редизайн WorkingHoursEditor из driving-school
  - Declarative API совместимый с Form
  - Настраиваемые дни (по умолчанию пн-вс)
  - Настраиваемый шаг времени (15, 30, 60 мин)
  - Поддержка перерывов
  - Быстрые действия: "Скопировать на будни", "Скопировать на все"
  - Валидация пересечения интервалов

### 🟢 Средний приоритет — Готово

- [x] **Form.Field.PinInput** — ввод OTP кода:
  - Поддержка count (количество полей)
  - Типы: numeric, alphanumeric, alphabetic
  - Маскированный ввод (mask prop)
  - OTP режим (otp prop для autocomplete)
  - onComplete callback
  - Варианты: outline, subtle, flushed
  - Размеры: 2xs, xs, sm, md, lg, xl, 2xl
  - Attached режим (поля без промежутков)
- [x] **Form.Field.Slider** — ползунок для диапазонов:
  - min, max, step настройки
  - showValue для отображения текущего значения
  - marks для меток на треке (число или { value, label })
  - orientation: horizontal, vertical
  - size: sm, md, lg
  - variant: outline, solid
  - colorPalette для цветовой схемы
  - origin: start, center, end
  - Интеграция с Zod валидацией
- [x] **Form.Field.Rating** — рейтинг звёздами:
  - count для количества звёзд (по умолчанию 5)
  - allowHalf для половинчатых значений
  - size: xs, sm, md, lg
  - colorPalette для цветовой схемы
  - icon для кастомной иконки
  - Интеграция с Zod валидацией

---

## Backlog — Form-level фичи (Фаза 3)

### localStorage Persistence ✅

- [x] **Автосохранение черновика** в localStorage:
  - Сохранение при изменении (debounced)
  - Восстановление при перезагрузке страницы
  - **Dialog** с выбором: "Восстановить данные?" / "Начать заново"
  - Показывать время последнего сохранения
  - Кнопка "Очистить черновик"
  - Настраиваемый TTL (по умолчанию 24 часа)

```tsx
// Пример API
<Form
  persist={{
    key: 'recipe-form-draft',
    ttl: 24 * 60 * 60 * 1000,
  }}
>
```

### Другие фичи

- [x] **Form.Button.Reset** — кнопка сброса формы:
  - Сброс всех полей к начальным значениям
  - Поддержка variant, colorPalette
  - onReset callback
  - Автоматическое отключение во время submit
- [x] **Form.DirtyGuard** — предупреждение при уходе с несохранённой формой:
  - beforeunload event для предотвращения закрытия вкладки
  - Настраиваемое сообщение (message prop)
  - Условное включение (enabled prop)
  - Callback при блокировке (onBlock prop)

---

## Backlog — Новые компоненты (Фаза 4)

### Form.Field.FileUpload ✅

- [x] **Form.Field.FileUpload** — загрузка файлов:
  - Три варианта отображения: button, dropzone, input
  - Drag & drop поддержка
  - Превью изображений
  - Настройка accept (MIME types)
  - maxFiles, maxFileSize ограничения
  - showSize, clearable опции
  - Интеграция с Zod валидацией

```tsx
// Button variant
<Form.Field.FileUpload name="avatar" accept="image/*" maxFiles={1} />

// Dropzone variant
<Form.Field.FileUpload
  name="gallery"
  variant="dropzone"
  accept="image/*"
  maxFiles={5}
  dropzoneLabel="Drag images here"
/>

// Input variant
<Form.Field.FileUpload name="file" variant="input" placeholder="Select file..." />
```

### Form.Field.RichText ✅

- [x] **Form.Field.RichText** — WYSIWYG редактор на базе Tiptap:
  - Toolbar с форматированием (bold, italic, underline, strikethrough)
  - Заголовки (H1, H2, H3)
  - Списки (bullet, ordered)
  - Цитаты и код
  - Ссылки
  - Undo/Redo
  - Настраиваемый набор кнопок (toolbarButtons prop)
  - HTML или JSON output (outputFormat prop)
  - Настраиваемая высота (minHeight, maxHeight)
  - Read-only режим
  - Интеграция с Zod валидацией

```tsx
// Basic usage
<Form.Field.RichText name="content" label="Content" />

// With limited toolbar
<Form.Field.RichText
  name="comment"
  toolbarButtons={['bold', 'italic', 'link']}
/>

// JSON output for database
<Form.Field.RichText
  name="article"
  outputFormat="json"
  minHeight="200px"
  maxHeight="400px"
/>
```

### Form.When ✅

- [x] **Form.When** — условный рендеринг полей:
  - `is` — точное совпадение значения
  - `isNot` — отрицание значения
  - `in` — значение в массиве
  - `notIn` — значение не в массиве
  - `condition` — кастомная функция
  - `fallback` — контент при false
  - Работает внутри Form.Group (relative paths)
  - Оптимизирован через form.Subscribe

```tsx
// Exact value match
<Form.When field="type" is="company">
  <Form.Field.String name="companyName" />
</Form.When>

// With fallback content
<Form.When field="isPremium" is={true} fallback={<Text>Upgrade to premium</Text>}>
  <Form.Field.Select name="theme" options={themes} />
</Form.When>

// Custom condition
<Form.When field="age" condition={(age) => age >= 18}>
  <Form.Field.Checkbox name="adultContent" />
</Form.When>

// Array of values
<Form.When field="role" in={['admin', 'moderator']}>
  <Form.Field.Checkbox name="canEdit" />
</Form.When>

// Nested in Form.Group
<Form.Group name="settings">
  <Form.When field="notifications" is={true}>
    <Form.Field.Select name="frequency" />
  </Form.When>
</Form.Group>
```

### Form.Steps ✅

- [x] **Form.Steps** — мультистеп формы:
  - `Form.Steps` — контейнер с валидацией на каждом шаге
  - `Form.Steps.Step` — отдельный шаг с title, description, icon
  - `Form.Steps.Indicator` — индикатор прогресса (stepper)
  - `Form.Steps.Navigation` — кнопки "Назад"/"Далее"/"Отправить"
  - `Form.Steps.CompletedContent` — контент после завершения всех шагов
  - `validateOnNext` — валидация полей перед переходом на следующий шаг
  - `linear` — режим без пропуска шагов (только по порядку)
  - Интеграция с Chakra UI Steps компонентом
  - Поддержка orientation, size, variant, colorPalette

```tsx
<Form initialValue={data} schema={Schema} onSubmit={handleSubmit}>
  <Form.Steps validateOnNext linear colorPalette="brand">
    <Form.Steps.Indicator showDescriptions />

    <Form.Steps.Step title="Personal" description="Your details">
      <Form.Field.String name="firstName" label="First Name" />
      <Form.Field.String name="lastName" label="Last Name" />
    </Form.Steps.Step>

    <Form.Steps.Step title="Contact" description="How to reach you">
      <Form.Field.String name="email" label="Email" />
      <Form.Field.String name="phone" label="Phone" />
    </Form.Steps.Step>

    <Form.Steps.Step title="Settings">
      <Form.Field.Switch name="notifications" label="Enable notifications" />
    </Form.Steps.Step>

    <Form.Steps.CompletedContent>All steps complete! Review and submit.</Form.Steps.CompletedContent>

    <Form.Steps.Navigation prevLabel="Back" nextLabel="Continue" submitLabel="Create Account" />
  </Form.Steps>
</Form>
```

---

## Backlog — Новые компоненты (Фаза 5)

### Form.Field.DateRange ✅

- [x] **Form.Field.DateRange** — выбор диапазона дат:
  - Два поля дат (start, end) в одном компоненте
  - Валидация: end >= start
  - Предустановки: "Сегодня", "Эта неделя", "Этот месяц"
  - Настраиваемые label для start/end полей
  - min/max ограничения для обоих полей

```tsx
<Form.Field.DateRange
  name="period"
  label="Period"
  startLabel="From"
  endLabel="To"
  presets={['today', 'thisWeek', 'thisMonth']}
/>
// Value: { start: '2024-01-01', end: '2024-01-31' }
```

### Form.Field.Tags ✅

- [x] **Form.Field.Tags** — ввод тегов:
  - Добавление тегов по Enter или разделителю
  - Удаление тегов кликом на X
  - Настраиваемые разделители (по умолчанию: Enter, запятая)
  - Валидация минимальной длины тега
  - maxTags ограничение
  - size, variant опции
  - Интеграция с Zod (z.array(z.string()))

```tsx
<Form.Field.Tags name="tags" label="Tags" placeholder="Add tag..." maxTags={10} delimiter={/[;,]/} />
// Value: ['react', 'typescript', 'chakra']
```

### Form.Field.Autocomplete ✅

- [x] **Form.Field.Autocomplete** — текстовое поле с подсказками:
  - Упрощённая версия Combobox (только строковые значения)
  - Статические suggestions или async загрузка
  - Debounce для async режима
  - allowCustomValue по умолчанию true
  - Клавиатурная навигация

```tsx
// Static suggestions
<Form.Field.Autocomplete
  name="city"
  label="City"
  suggestions={['Moscow', 'Saint Petersburg', 'Kazan']}
/>

// Async suggestions
<Form.Field.Autocomplete
  name="product"
  label="Product"
  useQuery={(search) => useFindManyProduct({ where: { name: { contains: search } } })}
  getLabel={(p) => p.name}
/>
```

---

## Backlog — Новые компоненты (Фаза 6) ✅

### Числовые поля

- [x] **Form.Field.NumberInput** — числовое поле со стрелками:
  - Chakra NumberInput с increment/decrement кнопками
  - min, max, step настройки
  - Форматирование (разделители тысяч)
  - Клавиатурные стрелки для изменения значения
  - clampValueOnBlur для ограничения диапазона

```tsx
<Form.Field.NumberInput name="quantity" label="Quantity" min={1} max={100} step={1} />
```

- [x] **Form.Field.Currency** — ввод денежных сумм:
  - Символ валюты (₽, $, €)
  - Форматирование с разделителями тысяч
  - Фиксированное количество десятичных знаков
  - Позиция символа (prefix/suffix)

```tsx
<Form.Field.Currency name="price" label="Price" currency="RUB" decimalScale={2} />
// Value: 1500.00, Display: "1 500,00 ₽"
```

- [x] **Form.Field.Percentage** — ввод процентов:
  - Диапазон 0-100 (или настраиваемый)
  - Суффикс %
  - Slider опционально

```tsx
<Form.Field.Percentage name="discount" label="Discount" max={50} />
// Value: 15, Display: "15%"
```

### Поля с маской

- [x] **Form.Field.Phone** — телефон с маской:
  - Предустановленные маски для стран
  - Автоопределение страны по коду
  - Валидация формата
  - Флаг страны (опционально)

```tsx
<Form.Field.Phone name="phone" label="Phone" country="RU" showFlag />
// Mask: +7 (999) 999-99-99
```

- [x] **Form.Field.MaskedInput** — универсальная маска:
  - Настраиваемый паттерн маски
  - Плейсхолдер для незаполненных позиций
  - Поддержка regex для символов

```tsx
<Form.Field.MaskedInput name="passport" label="Passport" mask="99 99 999999" placeholder="__ __ ______" />
```

### Продвинутые поля

- [x] **Form.Field.Address** — адрес с автодополнением:
  - Интеграция с DaData API
  - Подсказки при вводе
  - Парсинг компонентов адреса (город, улица, дом)
  - Опциональная карта для выбора

```tsx
<Form.Field.Address name="address" label="Address" provider="dadata" apiKey={process.env.DADATA_API_KEY} />
// Value: { value: "г Москва, ул Тверская, д 1", data: { city: "Москва", ... } }
```

- [x] **Form.Field.Duration** — ввод длительности:
  - Формат HH:MM или только минуты
  - Преобразование в минуты для хранения
  - min/max ограничения

```tsx
<Form.Field.Duration name="duration" label="Lesson Duration" format="HH:MM" min={30} max={180} />
// Display: "01:30", Value: 90 (minutes)
```

- [x] **Form.Field.DateTimePicker** — дата и время вместе:
  - Комбинированный picker
  - Настраиваемый формат
  - min/max datetime ограничения
  - Timezone поддержка

```tsx
<Form.Field.DateTimePicker name="appointmentAt" label="Appointment" minDateTime={new Date()} />
// Value: "2024-01-15T14:30:00"
```

### UI улучшения

- [x] **Form.Field.PasswordStrength** — пароль с индикатором силы:
  - Визуальный индикатор (weak/medium/strong)
  - Список требований с галочками
  - Настраиваемые правила валидации
  - Toggle visibility

```tsx
<Form.Field.PasswordStrength
  name="password"
  label="Password"
  requirements={['minLength:8', 'uppercase', 'number', 'special']}
  showRequirements
/>
```

- [x] **Form.Field.OTPInput** — OTP с таймером:
  - Расширение PinInput для SMS-кодов
  - Таймер обратного отсчёта для resend
  - onResend callback
  - Автоматический submit при заполнении

```tsx
<Form.Field.OTPInput
  name="code"
  label="Verification Code"
  length={6}
  resendTimeout={60}
  onResend={handleResendCode}
  autoSubmit
/>
```

---

## Backlog — Оффлайн формы (Фаза 7) ✅

Интеграция оффлайн-функциональности в декларативный Form API. Базируется на существующей реализации в `driving-school`.

### Архитектура

```
libs/forms/src/lib/
├── offline/
│   ├── index.ts                    # Реэкспорт API
│   ├── types.ts                    # Типы (SyncAction, SyncQueueItem, etc.)
│   ├── offline-service.ts          # IndexedDB операции (idb-keyval)
│   ├── use-offline-status.ts       # useOfflineStatus хук
│   ├── use-sync-queue.ts           # useSyncQueue хук
│   ├── use-offline-form.ts         # useOfflineForm хук
│   ├── form-offline-indicator.tsx  # Form.OfflineIndicator
│   └── form-sync-status.tsx        # Form.SyncStatus
```

### Form.Offline — декларативный offline режим ✅

- [x] **Интеграция с Form root** — добавлен `offline` prop:

```tsx
<Form
  initialValue={data}
  offline={{
    actionType: 'UPDATE_PROFILE',
    storageKey: 'profile-sync-queue', // опционально
    onQueued: () => toaster.info('Сохранено локально'),
    onSynced: () => toaster.success('Синхронизировано'),
    onSyncError: (error) => toaster.error(error),
  }}
  onSubmit={handleSubmit}
>
  <Form.Field.String name="name" />
  <Form.OfflineIndicator />
  <Form.Button.Submit />
</Form>
```

### Form.OfflineIndicator — индикатор режима ✅

- [x] **Form.OfflineIndicator** — автоматический бейдж оффлайн режима:
  - Показывает "Оффлайн режим" когда нет соединения
  - Скрывается автоматически при восстановлении связи
  - Настраиваемые label, colorPalette, variant
  - Работает только внутри Form с `offline` prop

```tsx
// Базовый
<Form.OfflineIndicator />

// С настройками
<Form.OfflineIndicator
  label="Нет связи"
  colorPalette="orange"
  variant="subtle"
/>
```

### Form.SyncStatus — индикатор синхронизации ✅

- [x] **Form.SyncStatus** — показывает статус очереди синхронизации:
  - Количество ожидающих действий
  - Spinner при синхронизации
  - "Синхронизировано" когда очередь пуста
  - Работает глобально (не требует Form контекста)

```tsx
// В layout или header
<Form.SyncStatus />

// С настройками
<Form.SyncStatus
  showWhenEmpty={false}
  syncingLabel="Синхронизация..."
  pendingLabel={(count) => `Ожидает: ${count}`}
  syncedLabel="Всё синхронизировано"
/>
```

### Базовые хуки (экспорт из библиотеки) ✅

- [x] **useOfflineStatus** — определение онлайн/оффлайн:

```tsx
import { useOfflineStatus } from '@letar/forms/offline'

const isOffline = useOfflineStatus()
```

- [x] **useSyncQueue** — работа с очередью:

```tsx
import { useSyncQueue } from '@letar/forms/offline'

const { queue, queueLength, pendingCount, addAction, processQueue, isProcessing } = useSyncQueue()
```

- [x] **useOfflineForm** — высокоуровневый хук для форм:

```tsx
import { useOfflineForm } from '@letar/forms/offline'

const { submit, isOffline, pendingCount, isProcessing } = useOfflineForm({
  actionType: 'UPDATE_PROFILE',
  onlineSubmit: async (value) => await updateProfile(value),
  onSuccess: () => toast.success('Сохранено'),
  onQueued: () => toast.info('Сохранено локально'),
})
```

### Типы действий ✅

- [x] **Настраиваемые SyncActionType** — расширяемые типы действий:

```tsx
// В библиотеке — базовые типы
type BaseSyncActionType = 'FORM_SUBMIT' | 'FORM_UPDATE' | 'FORM_DELETE'

// В приложении — расширение
declare module '@letar/forms/offline' {
  interface SyncActionTypeRegistry {
    BOOK_LESSON: true
    UPDATE_PROFILE: true
  }
}

type SyncActionType = BaseSyncActionType | keyof SyncActionTypeRegistry
```

### Интеграция с persist (localStorage черновики) ✅

- [x] **Объединение offline и persist** — умная логика:
  - `persist` — сохраняет черновик при вводе (localStorage)
  - `offline` — сохраняет в очередь при submit (IndexedDB)
  - При успешной синхронизации — очищает persist черновик

```tsx
<Form
  initialValue={data}
  persist={{ key: 'profile-draft', ttl: 24 * 60 * 60 * 1000 }}
  offline={{ actionType: 'UPDATE_PROFILE' }}
  onSubmit={handleSubmit}
>
  {/* Черновик сохраняется при вводе */}
  {/* При submit оффлайн — добавляется в очередь */}
  {/* При успешной синхронизации — черновик удаляется */}
</Form>
```

### E2E тесты ✅

- [x] **offline-demo.spec.ts** — тесты оффлайн форм:
  - Отображение OfflineIndicator при отключении сети
  - Сохранение в очередь при оффлайн submit
  - Синхронизация при восстановлении соединения
  - SyncStatus обновляется корректно
  - Интеграция persist + offline

### Демо страница ✅

- [x] **/offline-demo** — демонстрация оффлайн возможностей:
  - Форма с offline support
  - Кнопка "Go Offline" для эмуляции
  - Отображение очереди синхронизации
  - Логи событий (queued, synced, error)

---

## Backlog — Form Improvements (Фаза 8) ✅

### Form.Steps — Slide анимации ✅

- [x] **Animated transitions** — плавные slide анимации между шагами:
  - `animated` prop для включения анимаций
  - `animationDuration` prop для настройки скорости (по умолчанию 0.3s)
  - Slide влево при переходе вперёд, вправо при переходе назад
  - Использует framer-motion (добавлен в peerDependencies)

```tsx
<Form.Steps animated animationDuration={0.3}>
  <Form.Steps.Step title="Step 1">...</Form.Steps.Step>
  <Form.Steps.Step title="Step 2">...</Form.Steps.Step>
</Form.Steps>
```

### Form root — Новые props ✅

- [x] **validateOn** — настраиваемый режим валидации:
  - `'change'` — валидация при изменении (по умолчанию)
  - `'blur'` — валидация при потере фокуса
  - `'submit'` — валидация только при отправке
  - `'mount'` — валидация при монтировании
  - Можно комбинировать: `validateOn={['blur', 'submit']}`

```tsx
<Form validateOn="blur" ...>
  ...
</Form>
```

- [x] **disabled** — глобальное отключение всех полей:

```tsx
<Form disabled>
  <Form.Field.String name="name" /> {/* автоматически disabled */}
</Form>
```

- [x] **readOnly** — глобальный режим только для чтения:

```tsx
<Form readOnly>
  <Form.Field.String name="name" /> {/* автоматически readOnly */}
</Form>
```

---

---

## Backlog — Рефакторинг библиотеки (Фаза 9) ✅

### @letar/forms v0.37.0

Рефакторинг Фазы 6 библиотеки завершён:

- **35 файлов изменено**: +2616 / -3288 строк
- **Коммит**: `155acc97`

#### Изменения в библиотеке:

1. **Расширен `createField` API** — добавлен `useFieldState` для локального состояния:

   ```typescript
   interface CreateFieldOptions<P, TValue, TState> {
     displayName: string
     useFieldState?: (props: P, resolved: ResolvedFieldProps) => TState
     render: (props: FieldRenderProps<TValue> & { fieldState: TState }) => ReactElement
   }
   ```

2. **Создан хук `useDebounce`** — общая утилита в base/

3. **Рефакторено 20+ Field компонентов** через createField factory:
   - FieldPassword, FieldMaskedInput
   - FieldNumberInput, FieldCurrency, FieldPercentage
   - FieldPinInput, FieldOTPInput
   - FieldRadioGroup, FieldSegmentedGroup, FieldRating
   - FieldDateTimePicker, FieldDuration, FieldDateRange
   - FieldTags, FieldRadioCard, FieldCheckboxCard
   - FieldPhone, FieldEditable, FieldPasswordStrength, FieldColorPicker, FieldSlider
   - FieldAddress, FieldFileUpload

4. **Упрощены 4 компонента с дженериками**:
   - FieldSelect<T>, FieldListbox<T>, FieldAutocomplete<TData>, FieldCombobox<T, TData>
   - Используют общие утилиты: useDebounce, FieldError

5. **Минимально изменены сложные компоненты**:
   - FieldSchedule (469 строк)
   - FieldRichText (494 строки)

6. **Все комментарии переведены на русский**

#### API не изменился

Это внутренний рефакторинг — все демо-страницы и тесты работают без изменений.

---

## Backlog — Controlled State (Фаза 10) ✅

### Controlled State (Form без onSubmit)

- [x] **Form без onSubmit** — использование формы как controlled state container:
  - Form работает без обязательного `onSubmit`
  - Подписка на изменения через `form.Subscribe`
  - Доступ к form API через `useFormContext()`
  - `Form.Button.Reset` работает для сброса к initialValue
  - Полезно для настроек UI, фильтров, конфигураторов

```tsx
// Form БЕЗ onSubmit — только controlled state
<Form initialValue={settings} schema={SettingsSchema}>
  <Form.Field.Slider name="fontSize" min={12} max={32} showValue />
  <Form.Field.Slider name="columns" min={1} max={4} step={1} />

  {/* Контент, реагирующий на настройки */}
  <LivePreview />
</Form>

// Компонент с подпиской на значения
function LivePreview() {
  const form = useFormContext()

  return (
    <form.Subscribe selector={(s) => s.values}>
      {(settings) => <div style={{ fontSize: `${settings.fontSize}px` }}>Динамический контент</div>}
    </form.Subscribe>
  )
}
```

### Демо-страница

- [x] **/controlled-state-demo** — демонстрация controlled state:
  - Панель настроек со слайдерами
  - Live preview с динамическими стилями
  - Отображение текущих значений через form.Subscribe
  - Кнопка сброса настроек

---

---

## Backlog — Автоматические constraints из Zod (Фаза 11) ✅

### Автоматическое извлечение constraints

- [x] **Создать `schema-constraints.ts`** — функция `getZodConstraints()` для извлечения constraints из Zod v4 схем
- [x] **Создать `constraint-hints.ts`** — генерация автоматических helperText подсказок
- [x] **Unit-тесты** — покрытие всех типов constraints (строки, числа, даты, массивы)

### Интеграция в Field компоненты

- [x] **FieldString** — `maxLength`, `minLength`, автоматический `type` (email/url)
- [x] **FieldTextarea** — `maxLength`
- [x] **FieldNumber** — `min`, `max`, `step`
- [x] **FieldSlider** — `min`, `max`, `step`
- [x] **FieldDate** — `min`, `max` (конвертация Date → YYYY-MM-DD)

### Интеграция в Form.Group.List

- [x] **maxItems** — автоматическое отключение кнопки Add при достижении лимита
- [x] **minItems** — автоматическое отключение кнопки Remove при минимуме элементов

### Поддерживаемые Zod методы

| Zod метод                   | Поле   | HTML/UI атрибут                   |
| --------------------------- | ------ | --------------------------------- |
| `.min(n)` / `.max(n)`       | String | `minLength` / `maxLength`         |
| `.length(n)`                | String | `minLength={n}` + `maxLength={n}` |
| `.email()`                  | String | `type="email"`                    |
| `.url()`                    | String | `type="url"`                      |
| `.regex()`                  | String | `pattern`                         |
| `.min(n)` / `.max(n)`       | Number | `min` / `max`                     |
| `.int()`                    | Number | `step={1}`                        |
| `.multipleOf(n)`            | Number | `step={n}`                        |
| `.min(date)` / `.max(date)` | Date   | `min` / `max` (YYYY-MM-DD)        |
| `.min(n)` / `.max(n)`       | Array  | `minItems` / `maxItems`           |

### DRY принцип

До:

```tsx
const Schema = z.object({
  title: z.string().min(2).max(100),
  rating: z.number().min(1).max(10),
})

// Нужно дублировать constraints в props
<Form.Field.String name="title" minLength={2} maxLength={100} />
<Form.Field.Number name="rating" min={1} max={10} />
```

После:

```tsx
// Constraints автоматически из схемы!
<Form.Field.String name="title" />
<Form.Field.Number name="rating" />
```

### Демо и тесты

- [x] **/constraints-demo** — демонстрация автоматических constraints
- [x] **E2E тесты** — проверка работы constraints в полях (14 тестов × 3 браузера = 42 теста)

---

## Backlog — Генерация из Zod схемы (Фаза 12) ✅

### Form.FromSchema — полностью автоматическая форма

- [x] **Form.FromSchema** — генерация всей формы из Zod схемы:
  - Автоматический рендеринг всех полей
  - Кнопки submit/reset
  - Настраиваемые labels

```tsx
<Form.FromSchema
  schema={UserSchema}
  initialValue={data}
  onSubmit={handleSubmit}
  submitLabel="Создать пользователя"
  showReset
  resetLabel="Очистить"
/>
```

### Form.AutoFields — генерация полей

- [x] **Form.AutoFields** — генерация полей внутри Form:
  - `include` — только указанные поля
  - `exclude` — кроме указанных полей
  - `recursive` — вложенные объекты (по умолчанию true)
  - `fieldWrapper` — кастомный wrapper для полей

```tsx
<Form schema={ProfileSchema} initialValue={data} onSubmit={save}>
  <Form.AutoFields include={['name']} />
  <Box p={4} bg="gray.50">
    <Form.AutoFields include={['settings']} />
  </Box>
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

### Form.Field.Auto — одиночное автополе

- [x] **Form.Field.Auto** — автоматический выбор компонента по имени поля:

```tsx
<Form schema={ArticleSchema} initialValue={data} onSubmit={save}>
  <HStack>
    <Form.Field.Auto name="title" />
    <Form.Field.Auto name="slug" />
  </HStack>
  <Form.Field.Auto name="category" />
  <Form.Field.RichText name="content" /> {/* Кастомный рендер */}
</Form>
```

### fieldType в meta — указание типа поля

- [x] **fieldType** — явное указание типа компонента в схеме:

```tsx
const Schema = z.object({
  bio: z.string().meta({ ui: { title: 'Биография', fieldType: 'richText' } }),
  published: z.boolean().meta({ ui: { title: 'Опубликовано', fieldType: 'switch' } }),
  rating: z
    .number()
    .min(1)
    .max(5)
    .meta({ ui: { title: 'Рейтинг', fieldType: 'rating' } }),
})
```

### Поддерживаемые fieldType (37 типов)

| Категория      | Типы                                                              |
| -------------- | ----------------------------------------------------------------- |
| Текстовые      | string, textarea, password, passwordStrength, editable, richText  |
| Числовые       | number, numberInput, slider, rating, currency, percentage         |
| Дата/время     | date, time, dateRange, dateTimePicker, duration, schedule         |
| Булевые        | checkbox, switch                                                  |
| Выбор          | select, nativeSelect, combobox, autocomplete, listbox, radioGroup |
|                | radioCard, segmentedGroup, checkboxCard, tags                     |
| Специализиров. | phone, address, pinInput, otpInput, colorPicker, fileUpload       |
|                | maskedInput                                                       |

### Новые файлы

- [x] **schema-traversal.ts** — обход Zod схемы и извлечение информации о полях
- [x] **field-type-mapper.tsx** — маппинг Zod типов на компоненты
- [x] **form-auto-fields.tsx** — компонент Form.AutoFields
- [x] **form-from-schema.tsx** — компонент Form.FromSchema

### Демо и тесты

- [x] **/auto-fields-demo** — демонстрация трёх подходов:
  1. Form.FromSchema — полностью автоматическая форма
  2. Form.AutoFields — с кастомным layout
  3. Смешанный подход — AutoFields + ручные поля

---

## Backlog — Интеграция с ZenStack (Фаза 13)

### withUIMeta() — обогащение ZenStack Zod схем ✅

- [x] **withUIMeta()** — добавление UI метаданных к ZenStack-сгенерированным Zod схемам:
  - Плоская конфигурация (только верхний уровень)
  - Типобезопасная — TypeScript подсказывает доступные поля
  - Частичное применение — не обязательно указывать все поля

```tsx
import { ProductCreateInputSchema } from '@/generated/zod/objects/ProductCreateInput.schema'
import { withUIMeta } from '@letar/forms'

const ProductFormSchema = withUIMeta(ProductCreateInputSchema, {
  name: { title: 'Название', placeholder: 'Введите название' },
  price: { title: 'Цена', fieldType: 'currency', fieldProps: { currency: 'RUB' } },
  isActive: { title: 'Активен', fieldType: 'switch' },
})

<Form.FromSchema schema={ProductFormSchema} initialValue={data} onSubmit={save} />
```

- [x] **withUIMetaDeep()** — поддержка вложенных объектов:
  - Рекурсивная конфигурация
  - `_meta` для метаданных группы

```tsx
const UserFormSchema = withUIMetaDeep(UserCreateInputSchema, {
  firstName: { title: 'Имя' },
  address: {
    _meta: { title: 'Адрес доставки' },
    city: { title: 'Город' },
    street: { title: 'Улица' },
  },
})
```

### Хелперы для common-meta ✅

- [x] **enumMeta()** — enum поля с кастомными метками:

```tsx
role: enumMeta({
  title: 'Роль',
  fieldType: 'radioCard',
  labels: { ADMIN: 'Администратор', USER: 'Пользователь' },
})
```

- [x] **relationMeta()** — relation поля:

```tsx
categoryId: relationMeta({
  title: 'Категория',
  model: 'Category',
  labelField: 'name',
})
```

- [x] **textMeta()**, **numberMeta()**, **booleanMeta()**, **dateMeta()** — типизированные хелперы
- [x] **commonMeta** — пресеты для id, createdAt, updatedAt

### Unit-тесты ✅

- [x] **with-ui-meta.spec.ts** — 31 тест:
  - Простые поля (string, number, boolean)
  - Enum поля
  - Вложенные объекты (1 и 2+ уровней)
  - Optional/nullable поля
  - Массивы
  - Все хелперы (enumMeta, relationMeta, etc.)

### ZenStack плагин @letar/zenstack-form-plugin ✅

- [x] **ZenStack плагин v1.2.0** — генерация Zod схем с UI метаданными из `schema.zmodel`:
  - Синтаксис `@form.*` в doc-комментариях (ПЕРЕД полем)
  - Генерация `*CreateFormSchema`, `*UpdateFormSchema`
  - Генерация enum схем с метками из `///` комментариев
  - Автоматическое исключение `id`, `createdAt`, `updatedAt`, relation полей, ссылок на модели
  - **Автоматическое разделение `@form.props`:**
    - Zod constraints (`min`, `max`, `minLength`, `maxLength`, `pattern`, `email`, `url`, `uuid`) → методы схемы
    - UI props (`count`, `allowHalf`, `showValue`, etc.) → `fieldProps`

```zmodel
plugin formSchema {
  provider = '../../libs/zenstack-form-plugin/dist/index.js'
  output = './src/generated/form-schemas'
}

enum RecipeType {
  /// Сладкое
  SWEET
  /// Солёное
  SALTY
}

model Recipe {
  /// @form.title("Название")
  /// @form.placeholder("Введите название")
  title String

  /// @form.title("Порции")
  /// @form.fieldType("numberInput")
  /// @form.props({ min: 1, max: 100 })
  portions Int @default(1)
}
```

Генерирует:

```typescript
// portions: min/max становятся Zod constraints
portions: z.number()
  .int()
  .min(1)
  .max(100)
  .meta({ ui: { title: 'Порции', fieldType: 'numberInput' } })

// rating: count/allowHalf остаются в fieldProps
rating: z.number().meta({ ui: { fieldType: 'rating', fieldProps: { count: 5, allowHalf: true } } })
```

### RelationFieldProvider — загрузка опций relation полей ✅

- [x] **RelationFieldProvider** — контекст для автозагрузки опций relation полей:
  - Интеграция с ZenStack hooks (`useFindManyCategory`, etc.)
  - Автоматическая загрузка опций через `RelationConfig`
  - Хук `useRelationOptions(model)` для доступа к опциям
  - `withRelations()` HOC для оборачивания компонентов
  - Интеграция с `Form.AutoFields` через `SchemaFieldWithRelations`
  - Поддержка `fieldType` в `relationMeta()` (select, combobox, listbox, etc.)

```tsx
import { useFindManyCategory } from '@/generated/hooks'

<RelationFieldProvider
  relations={[
    { model: 'Category', useQuery: useFindManyCategory, labelField: 'name' },
  ]}
>
  <Form schema={RecipeFormSchema} ...>
    <Form.AutoFields />  {/* categoryId получит options автоматически */}
  </Form>
</RelationFieldProvider>
```

### Демо-страница

- [x] **/relation-demo** — демонстрация RelationFieldProvider:
  - Создание категорий (справочник)
  - Форма рецепта с автозагрузкой категорий
  - Документация по интеграции

### Новые файлы

```
libs/forms/src/lib/declarative/
├── with-ui-meta.ts             # withUIMeta() + withUIMetaDeep()
├── with-ui-meta.spec.ts        # 31 тест
├── common-meta.ts              # enumMeta, relationMeta, textMeta, etc.
└── relation-field-provider.tsx # RelationFieldProvider + useRelationOptions

libs/zenstack-form-plugin/
├── package.json             # @letar/zenstack-form-plugin v1.0.0
├── src/
│   ├── index.ts             # Plugin entry point
│   ├── generator.ts         # Основная логика генерации
│   ├── enum-generator.ts    # Генерация enum схем с метками
│   ├── model-generator.ts   # Генерация model схем
│   ├── parser.ts            # Парсинг @form.* директив
│   └── types.ts             # Типы
└── README.md                # Документация
```

---

## Backlog — i18n для ошибок валидации (Фаза 14) ✅

### Проблема

Label/placeholder переводятся через i18nKey, но сообщения об ошибках валидации остаются на языке схемы.

### Решение

Zod v4 global error map + i18n ключи. `FormI18nProvider` с `setupZodErrorMap` prop автоматически настраивает Zod.

### Реализовано

- [x] **TranslateParams** — тип для параметров интерполяции `{minimum}`, `{maximum}`, etc.
- [x] **TranslateFunction** — расширена для поддержки параметров
- [x] **createFormErrorMap()** — фабрика Zod error map с i18n:
  - Преобразует Zod issue codes в ключи: `validation.{code}.{origin}`
  - Извлекает параметры (minimum, maximum, expected, etc.)
  - Поддержка fallback при отсутствии перевода
- [x] **FormI18nProvider setupZodErrorMap** — prop для автоматической настройки `z.config()`
- [x] **ZenStack плагин** — генерация `validation.*` секции в JSON переводах
- [x] **/i18n-demo** — демо с переключением локали и отображением переведённых ошибок

### Структура ключей валидации (Zod v4)

```json
{
  "validation": {
    "invalid_type": "Ожидался тип {expected}, получен {received}",
    "required": "Обязательное поле",
    "too_small": {
      "string": "Минимум {minimum} символов",
      "number": "Минимум {minimum}",
      "array": "Минимум {minimum} элементов"
    },
    "too_big": {
      "string": "Максимум {maximum} символов",
      "number": "Максимум {maximum}"
    },
    "invalid_format": {
      "email": "Некорректный email",
      "url": "Некорректный URL"
    },
    "invalid_value": "Недопустимое значение. Ожидается: {options}",
    "not_multiple_of": "Должно быть кратно {multipleOf}"
  }
}
```

### Использование

```tsx
import { FormI18nProvider } from '@letar/forms'
import { useLocale, useTranslations } from 'next-intl'

function App({ children }) {
  const t = useTranslations('formSchemas')
  const locale = useLocale()

  return (
    <FormI18nProvider t={t} locale={locale} setupZodErrorMap>
      {children}
    </FormI18nProvider>
  )
}
```

### Версии

- **@letar/forms**: 0.51.0 → 0.52.0
- **@letar/zenstack-form-plugin**: 2.0.0 → 2.1.0

---

---

## Рефакторинг @letar/forms (Фаза 15) ✅

### Unit тесты для критичных компонентов

- [x] **form-from-schema.spec.tsx** — 15 тестов:
  - Рендеринг с автогенерированными полями
  - Submit/Reset кнопки
  - exclude prop
  - disabled/readOnly состояния
  - beforeButtons/afterButtons слоты

- [x] **form-with-api.spec.tsx** — 12 тестов:
  - Рендеринг с children
  - Loading state
  - Edit mode (загруженные данные)
  - Create mode (initialValue)
  - Submit handlers
  - apiState в контексте

### Deprecated type aliases cleanup

- [x] Централизованы в `form-fields/index.ts`
- [x] Удалены локальные deprecated экспорты из 7 selection компонентов
- [x] Обратная совместимость сохранена через реэкспорт

### Error handling в form-develop-app

- [x] `error.tsx` — Error boundary для runtime ошибок
- [x] `not-found.tsx` — 404 страница

---

## Фаза: DX фичи (из исследования болей разработчиков, апрель 2026)

### analytics-demo ✅

- [x] Form.Analytics — live-панель с трекингом focus/blur/error/abandon
- [x] Мультистеп форма с воронкой (Form.Analytics.Funnel)
- [x] Адаптеры: Umami, Яндекс Метрика, GA4, PostHog

### undo-redo-demo ✅

- [x] useFormHistory — Ctrl+Z/Y для формы
- [x] Form.History.Controls — визуальные кнопки
- [x] Keyboard shortcuts

### server-errors-demo ✅

- [x] mapServerErrors — маппинг Prisma P2002/P2003, Zod flatten, ZenStack @@allow
- [x] Демо с разными форматами серверных ответов

### readonly-demo ✅

- [x] `<Form readOnly>` — вся форма в режиме чтения
- [x] `<Form.ReadOnlyView>` — отдельный компонент

### skeleton-demo ✅

- [x] `<Form.Skeleton schema={S}>` — skeleton из Zod-схемы
- [x] `<Form loading={true}>` — loading state

### comparison-demo ✅

- [x] `<Form.Comparison>` — diff-view (было → стало)

---

**Последнее обновление:** 2026-08-09
