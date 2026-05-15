# Результаты тестирования (@letar/forms v0.84.1, 2026-04-05)

## Общая статистика

| Метрика | Значение |
| --- | --- |
| Тестовых файлов | **113** |
| Тестов (it-блоков) | **1 077** |
| Прошли | 1 077 (100%) |
| Упали | 0 |
| Время выполнения | ~76 с |
| Фреймворк | Vitest 4.0, @testing-library/react |
| Окружение | jsdom (happy-dom для некоторых) |

## Coverage

| Категория | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| **Все файлы** | 54.3% | 47.4% | 55.1% | 55.3% |

> **Почему не 80%+:** coverage считается от _всех_ файлов в src/, включая сложные UI-компоненты (FormSteps, RichText editor, FormBuilder), которые корректно тестируются только через browser-level E2E (Playwright). Покрытие ядра — 95%+.

### Высокое покрытие (>90%)

| Модуль | Stmts | Описание |
| --- | --- | --- |
| lib/utils | 96.5% | deep-equal, json-stringify |
| lib/validators/ru | 81.8% | ИНН, ОГРН, СНИЛС, БИК, КПП и др. |
| form-fields/utility | 91.5% | Hidden, Calculated |
| create-form core | ~95% | createForm(), createFormHook(), withForm() |
| i18n error-map | 96.4% | Локализация ошибок Zod |

### Среднее покрытие (50-90%)

| Модуль | Stmts | Описание |
| --- | --- | --- |
| form-root | 71.6% | Декларативный Form компонент |
| offline | 71.5% | offline-service, sync-queue |
| server-errors | 73.4% | mapServerErrors, parsers |
| security | 63.2% | honeypot, rate-limiter, file-security |

### Низкое покрытие (<50%, требует Playwright)

| Модуль | Stmts | Причина |
| --- | --- | --- |
| form-steps | 15.1% | Многошаговая навигация — Playwright |
| RichText editor | ~34% | TipTap/ProseMirror — browser-only |
| FormBuilder | — | Drag & drop — Playwright |
| ConversationalMode | — | Анимации, фокус — browser-only |

## Тесты по категориям

| Категория | Файлов | Примеры тестируемого |
| --- | --- | --- |
| **Core (declarative)** | 24 | Form, FromSchema, AutoFields, Watch, DirtyGuard, When, InfoBlock, Divider, Templates, Comparison, ReadOnly, Skeleton, DependsOn |
| **Selection fields** | 14 | Select, Combobox, RadioGroup, RadioCard, Checkbox, CheckboxCard, Switch, SegmentedGroup, Listbox, Autocomplete, NativeSelect, Tags |
| **Text fields** | 7 | String, Textarea, Password, PasswordStrength, Editable, MaskedInput, RichText |
| **Russian validators** | 7 | ИНН (10/12 цифр), ОГРН (13/15), БИК, СНИЛС, КПП, паспорт, банковский счёт |
| **Specialized fields** | 7+2 | Phone, FileUpload, Address, ColorPicker, PinInput, OTPInput, Signature + CreditCard tests |
| **Number fields** | 6 | Number, NumberInput, Slider, Rating, Currency, Percentage |
| **DateTime fields** | 6 | Date, Time, DateRange, DateTimePicker, Duration, Schedule |
| **Base fields** | 6 | Field rendering, label, error display, required, disabled, helper text |
| **Offline** | 3 | offline-service, sync-queue, offline-status |
| **Security** | 3 | honeypot, rate-limiter, file-security (magic bytes, EXIF) |
| **Table fields** | 2 | TableEditor, DataGrid |
| **Boolean fields** | 2 | Checkbox, Switch (единичные) |
| **Utility** | 2 | Hidden, Calculated (useComputedValue) |
| **Form root** | 2 | Form simple, Form with API |
| **Form steps** | 2 | Steps navigation, step context |
| **Form group** | 1 | Nested groups, list operations |
| **Utils** | 2 | deep-equal, json-stringify |
| **Server errors** | 1 | mapServerErrors + parsers (Zod, Prisma, ZenStack) |
| **i18n** | 1 | Zod error map localization |
| **History** | 1 | Undo/Redo, sessionStorage |
| **Document fields** | 1 | Российские документы (createDocumentField) |
| **Analytics** | 1 | Form tracking, adapters |
| **CAPTCHA** | 1 | Turnstile/reCAPTCHA интеграция |
| **Conversational** | 1 | Typeform-style mode |
| **FormBuilder** | 1 | JSON form builder |

## Характерные тестовые сценарии

### Валидация
- Zod schema integration (safeParse, .strip())
- Ошибки рендерятся в правильных полях
- Async-валидация (debounce, loading spinner)
- Кросс-поле валидация (DependsOn)

### Рендеринг
- Все 50+ полей рендерятся без ошибок
- Label, helperText, required indicator
- Dark mode совместимость
- Responsive layout

### Интерактивность
- Ввод значений и их реактивность
- Select/Combobox: открытие, поиск, выбор
- Drag & drop (TableEditor)
- Keyboard navigation

### Offline
- SyncQueue: добавление, retry, порядок
- offline-service: статус сети, хранение в IndexedDB
- conflict resolution

### Безопасность
- Honeypot: скрытое поле, отклонение при заполнении
- Rate limiter: блокировка после N сабмитов
- File security: проверка magic bytes, отклонение опасных MIME

---

_Замерено: 2026-04-05, Vitest 4.0, Node 24, Windows 11_
