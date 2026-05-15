# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [0.1.0] - 2026-04-04

### Added

- **analytics-demo** — useFormAnalytics + AnalyticsPanel
- **server-errors-demo** — mapServerErrors интерактивный тестер
- **undo-redo-demo** — useFormHistory с Ctrl+Z/Y
- **calculated-demo** — демо-страница вычисляемых полей
- **utility-demo** — демо-страница утилитарных компонентов
- 40 demo-страниц для всех компонентов @letar/forms
- **autofill-demo** — демо-страница Smart Autofill с инспектором autocomplete атрибутов в DOM
- **field-change-demo** — демо-страница для `onFieldChange` prop и `Form.Watch` компонента
  - Пример 1: автогенерация slug через транслитерацию (onFieldChange)
  - Пример 2: country → currency + greeting (Form.Watch)
  - Лог изменений для визуальной отладки

## [0.1.0] - 2026-01-03

### Added

- **Фаза 15:** Unit тесты FormFromSchema (15), FormWithApi (12), deprecated cleanup, error.tsx/not-found.tsx
- **Фаза 14:** i18n для ошибок валидации — FormI18nProvider, createFormErrorMap(), /i18n-demo
- **Фаза 13:** ZenStack интеграция — withUIMeta(), @letar/zenstack-form-plugin, RelationFieldProvider, /relation-demo
- **Фаза 12:** Генерация из Zod — Form.FromSchema, Form.AutoFields, Form.Field.Auto, /auto-fields-demo
- **Фаза 11:** Автоматические constraints из Zod — getZodConstraints(), /constraints-demo
- **Фаза 10:** Controlled state — Form без onSubmit, form.Subscribe, /controlled-state-demo
- **Фаза 9:** Рефакторинг библиотеки — createField API, useDebounce, 20+ компонентов через factory
- **Фаза 8:** Form.Steps анимации, validateOn, disabled/readOnly props
- **Фаза 7:** Оффлайн формы — useOfflineForm, Form.OfflineIndicator, Form.SyncStatus, /offline-demo
- **Фаза 6:** NumberInput, Currency, Percentage, Phone, MaskedInput, Address, Duration, DateTimePicker, PasswordStrength, OTPInput
- **Фаза 5:** DateRange, Tags, Autocomplete
- **Фаза 4:** FileUpload (3 варианта), RichText (Tiptap), Form.When, Form.Steps
- **Фаза 3:** localStorage Persistence, Form.Button.Reset, Form.DirtyGuard
- **Фаза 2.5:** Combobox, Listbox, CheckboxCard, RadioCard, SegmentedGroup, ColorPicker, Editable, Schedule, PinInput, Slider, Rating
- **Фаза 2:** Декларативный compound component API, CRUD рецепты, Zod валидация
- **Фаза 1:** Песочница для разработки @letar/forms
- 25 демо-страниц для всех типов полей и фич
- 21 E2E тестовый файл (example, form-submit, fields-demo, persistence, steps, when, rich-text, file-upload, и др.)
