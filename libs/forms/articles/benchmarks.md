# Бенчмарки (@letar/forms v0.84.1, 2026-04-05)

## Размер пакета

| Метрика | Значение |
| --- | --- |
| npm unpacked size | 1.98 MB (59 файлов) |
| Исходный код (src/) | 2.4 MB |
| Исходные файлы (без тестов) | 233 файла, 29 366 строк |
| Тестовые файлы | 113 файлов |
| npm published version | 1.2.0 |
| Monorepo version | 0.84.1 |

> **Примечание:** библиотека используется через TypeScript paths в монорепо (без build step).
> npm пакет собирается отдельно для публикации через `tsup`.

## Кодовая база

| Метрика | Значение |
| --- | --- |
| Field компонентов | 50+ (29 экспортируемых функций в form-fields/) |
| Form-level компонентов | 20+ |
| Субпатхи экспорта | 6 (`/`, `/offline`, `/i18n`, `/validators/ru`, `/server-errors`, `/analytics`) |
| Категорий полей | 8 (текст, числа, даты, выбор, множественный выбор, специальные, опросные, утилитарные) |

## Сравнение LOC: vanilla React vs @letar/forms

### Логин-форма (2 поля: email + пароль)

| Подход | Строк кода | Комментарий |
| --- | --- | --- |
| Vanilla React (useState) | ~48 | useState × 4, validate(), handleSubmit, JSX |
| React Hook Form | ~22 | register, handleSubmit, formState |
| Formik | ~28 | <Formik>, <Field>, validationSchema |
| @letar/forms | ~8 | Form + 2 × Field.\* + Button.Submit |

> Vanilla пример включает: состояние (email, password, errors, isSubmitting), валидацию, обработку сабмита, отображение ошибок, disabled-состояние кнопки.

### Форма регистрации (8 полей: имя, email, телефон, пароль × 2, дата рождения, пол, согласие)

| Подход | Строк кода | Комментарий |
| --- | --- | --- |
| Vanilla React | ~130 | useState × 9, сложная валидация, маска телефона |
| @letar/forms | ~18 | Form + 8 × Field.\* (валидация из Zod schema) |

## Генерация ZenStack

| Метрика | Значение |
| --- | --- |
| driving-school: моделей | 89 |
| driving-school: @form.\* директив | 93 |
| Время генерации | **12.0 с** |

> Генерация включает: Prisma schema, Zod schemas, form schemas с @form.\* метаданными, TypeScript типы.

## Тестирование

| Метрика | Значение |
| --- | --- |
| Тестовых файлов | 113 |
| Тестов (it-блоков) | 1 077 |
| Время выполнения | ~76 с |
| Coverage (statements) | 54.3% |
| Coverage (branches) | 47.4% |
| Coverage (functions) | 55.1% |
| Coverage (lines) | 55.3% |

> **Примечание:** coverage считается от всех файлов в src/, включая сложные компоненты вроде FormSteps, RichText и FormBuilder, которые требуют browser-уровня тестирования (Playwright). Покрытие ядра (create-form, validators, utils) — 95%+.

## Peer Dependencies

| Зависимость | Версия |
| --- | --- |
| @chakra-ui/react | ≥3.0.0 |
| @tanstack/react-form | ≥1.0.0 |
| react | ≥18.0.0 |
| zod | ≥3.24.0 |
| framer-motion | ≥10.0.0 |

---

_Замерено: 2026-04-05, Windows 11, Node 24, Bun 1.x, Vitest 4.0_
