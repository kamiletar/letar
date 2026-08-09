# Form Develop App

Песочница для разработки и тестирования `@letar/forms`.

## Документация

| Файл                                   | Описание                             |
| -------------------------------------- | ------------------------------------ |
| [README.md](README.md)                 | Обзор проекта, установка, команды    |
| [PLAN.md](PLAN.md)                     | Текущие задачи, TODO, roadmap        |
| [PLAN_COMPLETED.md](PLAN_COMPLETED.md) | Завершённые фичи по версиям          |
| [PLAN_TESTING.md](PLAN_TESTING.md)     | План и статистика тестирования       |
| [CHANGELOG.md](CHANGELOG.md)           | История изменений (Keep a Changelog) |

## Назначение

Это приложение используется для:

1. **Прототипирования** — эксперименты с API форм до реализации в библиотеке
2. **Тестирования** — проверка компонентов в реальном Next.js окружении
3. **Документирования** — примеры использования для документации

## Запуск

```bash
nx dev form-develop-app  # порт 3006
```

## Демо-страницы

| Страница                 | Описание                                            |
| ------------------------ | --------------------------------------------------- |
| `/`                      | Главная с навигацией                                |
| `/fields-demo`           | Все типы полей (String, Number, Date, Select, etc.) |
| `/recipes`               | CRUD рецептов (list, create, edit, delete)          |
| `/steps-demo`            | Мультистеп формы с анимацией                        |
| `/persistence-demo`      | localStorage сохранение черновиков                  |
| `/when-demo`             | Условный рендеринг полей (Form.When)                |
| `/rich-text-demo`        | WYSIWYG редактор (Tiptap)                           |
| `/file-upload-demo`      | Загрузка файлов (button, dropzone, input)           |
| `/pin-input-demo`        | PinInput / OTP ввод                                 |
| `/slider-demo`           | Slider с marks и orientation                        |
| `/rating-demo`           | Rating звёздами                                     |
| `/date-range-demo`       | DateRange с пресетами                               |
| `/tags-demo`             | Tags ввод                                           |
| `/autocomplete-demo`     | Autocomplete с подсказками                          |
| `/numeric-demo`          | NumberInput, Currency, Percentage                   |
| `/masked-demo`           | Phone, MaskedInput с масками                        |
| `/advanced-demo`         | Address, Duration, DateTimePicker                   |
| `/auth-demo`             | PasswordStrength, OTPInput                          |
| `/offline-demo`          | Оффлайн формы с очередью синхронизации              |
| `/controlled-state-demo` | Form как controlled state container                 |
| `/constraints-demo`      | Автоматические Zod constraints                      |
| `/auto-fields-demo`      | FromSchema, AutoFields, Field.Auto                  |
| `/relation-demo`         | RelationFieldProvider + ZenStack                    |
| `/i18n-demo`             | Мультиязычные ошибки валидации                      |
| `/select-demo`           | Select, Combobox, Listbox                           |

## Структура

```
apps/form-develop-app/
├── src/
│   └── app/
│       ├── layout.tsx              # Root layout
│       ├── page.tsx                # Главная с навигацией
│       ├── error.tsx               # Error boundary
│       ├── not-found.tsx           # 404 страница
│       ├── _components/            # Shared компоненты
│       ├── _data/                  # Данные для демо
│       ├── _schemas/               # Zod схемы
│       ├── api/                    # API routes
│       ├── fields-demo/            # Демо всех типов полей
│       ├── recipes/                # CRUD рецептов
│       ├── steps-demo/             # Мультистеп формы
│       ├── persistence-demo/       # localStorage persistence
│       ├── when-demo/              # Условный рендеринг
│       ├── rich-text-demo/         # RichText редактор
│       ├── file-upload-demo/       # Загрузка файлов
│       ├── pin-input-demo/         # PinInput
│       ├── slider-demo/            # Slider
│       ├── rating-demo/            # Rating
│       ├── date-range-demo/        # DateRange
│       ├── tags-demo/              # Tags
│       ├── autocomplete-demo/      # Autocomplete
│       ├── numeric-demo/           # NumberInput, Currency, %
│       ├── masked-demo/            # Phone, MaskedInput
│       ├── advanced-demo/          # Address, Duration, DateTime
│       ├── auth-demo/              # PasswordStrength, OTP
│       ├── offline-demo/           # Оффлайн формы
│       ├── controlled-state-demo/  # Controlled state
│       ├── constraints-demo/       # Zod constraints
│       ├── auto-fields-demo/       # AutoFields, FromSchema
│       ├── relation-demo/          # RelationFieldProvider
│       ├── i18n-demo/              # i18n ошибки
│       └── select-demo/            # Select варианты
├── README.md
├── PLAN.md
├── PLAN_COMPLETED.md
├── PLAN_TESTING.md
├── CHANGELOG.md
└── package.json
```

## Связанные документы

- [/libs/forms/README.md](../../libs/forms/README.md) — документация библиотеки
- [/libs/forms/PLAN.md](../../libs/forms/PLAN.md) — план развития библиотеки
- [/.claude/docs/forms.md](../../.claude/docs/forms.md) — документация по формам

---

**Последнее обновление:** 2026-03-31
