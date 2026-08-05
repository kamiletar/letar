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

---

**Последнее обновление:** 2026-08-05
