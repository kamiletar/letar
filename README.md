# Letar Monorepo

Монорепозиторий Nx с веб-приложениями и shared библиотеками.

## Приложения

| App                                                  | Описание                 | Порт | DB Port | Стек                      |
| ---------------------------------------------------- | ------------------------ | ---- | ------- | ------------------------- |
| [premium-rosstil](apps/premium-rosstil/)             | Fashion интернет-магазин | 3000 | 5432    | Next.js, Prisma, ZenStack |
| [imot](apps/imot/)                                   | Платформа психотерапии   | 3001 | 5433    | Next.js, Prisma, ZenStack |
| [dashboard](apps/dashboard/)                         | Мониторинг сервера       | 3002 | 5436    | Next.js, Prisma, ZenStack |
| [driving-school](apps/driving-school/)               | Автошкола                | 3003 | —       | Next.js, Prisma, ZenStack |
| [mandala](apps/mandala/)                             | Галерея мандал и магазин | 3004 | 5434    | Next.js, Prisma, ZenStack |
| [kami](apps/kami/)                                   | Управление контентом     | 3005 | 5437    | Next.js, Prisma, ZenStack |
| [form-develop-app](apps/form-develop-app/)           | Песочница @letar/forms   | 3006 | —       | Next.js                   |
| [pravda](apps/pravda/)                               | Законодательство РФ      | 3007 | —       | Next.js (static)          |
| [label-printer-desktop](apps/label-printer-desktop/) | Desktop печать этикеток  | —    | —       | Electron, SQLite          |
| [animatrona](apps/animatrona/)                       | Конвертер видео          | —    | —       | Electron, FFmpeg          |
| [animatrona-landing](apps/animatrona-landing/)       | Лендинг для Animatrona   | —    | —       | Next.js (static)          |

> **Порты PostgreSQL:** 5432 (premium-rosstil), 5433 (imot), 5434 (mandala), 5435 (umami), 5436 (dashboard), 5437 (kami)

## Библиотеки

| Lib                                                       | Описание                      |
| --------------------------------------------------------- | ----------------------------- |
| [@letar/forms](libs/forms/)                               | UI форм (TanStack Form)       |
| [@letar/chakra-provider](libs/chakra-provider/)           | Провайдер Chakra UI           |
| [@letar/ui](libs/ui/)                                     | Shared UI компоненты          |
| [@letar/admin-ui](libs/admin-ui/)                         | UI для админ-панелей          |
| [@letar/hooks](libs/hooks/)                               | Shared React хуки             |
| [@letar/format-utils](libs/format-utils/)                 | Форматирование дат, телефонов |
| [@letar/api-server](libs/api-server/)                     | Утилиты для API серверов      |
| [@letar/auth](libs/auth/)                                 | Утилиты аутентификации        |
| [@letar/query-provider](libs/query-provider/)             | Провайдер TanStack Query      |
| [@letar/validation-utils](libs/validation-utils/)         | Zod схемы валидации           |
| [@letar/yandex-metrika](libs/yandex-metrika/)             | Интеграция Яндекс Метрики     |
| [@letar/zenstack-form-plugin](libs/zenstack-form-plugin/) | Плагин ZenStack для форм      |
| [@letar/image-upload](libs/image-upload/)                 | Загрузка изображений          |
| [@letar/label-printer-core](libs/label-printer-core/)     | Ядро печати этикеток          |
| [@letar/pin-auth](libs/pin-auth/)                         | PIN-аутентификация            |

## Быстрый старт

```bash
# Клонирование и настройка
git clone <repo>
cd Letar
bun install
git config core.hooksPath .githooks

# Разработка
nx dev premium-rosstil     # Запуск dev сервера
nx build premium-rosstil   # Сборка

# База данных
nx zenstack:generate premium-rosstil  # Генерация схемы
nx db:push premium-rosstil            # Применить схему

# Проверки
nx format premium-rosstil      # Форматирование
nx lint premium-rosstil        # Линтинг
nx typecheck:tsgo premium-rosstil  # Проверка типов (быстро!)
nx test premium-rosstil        # Тесты
```

## Технологический стек

- **Node:** 24
- **Монорепо:** Nx 22.3.3
- **Фреймворк:** Next.js 16.1 (App Router)
- **React:** 19
- **UI:** Chakra UI v3.30
- **База данных:** PostgreSQL + Prisma 6.19 + ZenStack 3.2.0
- **Формы:** @letar/forms (TanStack Form) + Zod v4.3
- **Тестирование:** Vitest 4.0 (unit), Playwright (E2E)
- **Линтинг:** oxlint (быстрый) + ESLint
- **Форматирование:** dprint (~30x быстрее Prettier)
- **Пакетный менеджер:** Bun

## Документация

- **[CLAUDE.md](./CLAUDE.md)** — Инструкции для Claude Code
- **[.claude/docs/](/.claude/docs/)** — Подробная документация по темам
- **[.claude/rules/](/.claude/rules/)** — Path-specific правила
- **[.claude/commands/](/.claude/commands/)** — Slash-команды проектов

## Структура

```
letar/
├── apps/                    # Приложения
│   ├── premium-rosstil/     # Fashion магазин
│   ├── imot/                # Платформа психотерапии
│   ├── driving-school/      # Автошкола
│   └── ...
├── libs/                    # Shared библиотеки
│   ├── form-components/     # UI форм
│   ├── ui/                  # Shared UI
│   └── ...
├── .claude/                 # Claude Code конфигурация
│   ├── docs/                # Документация
│   ├── rules/               # Path-specific правила
│   └── commands/            # Slash-команды
└── CLAUDE.md                # Главный файл для Claude Code
```

---

**Последнее обновление:** 2026-01-10
