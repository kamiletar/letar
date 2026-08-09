# Label Printer Desktop

Electron desktop приложение для печати этикеток "Честный знак" на термопринтерах TSC.

> **Текущая версия:** 0.5.6
> **Технологический стек:** Electron 39, Next.js 16, Chakra UI v3, ZenStack + Prisma (SQLite)

## Документация

| Файл                                   | Описание                             |
| -------------------------------------- | ------------------------------------ |
| [README.md](README.md)                 | Обзор проекта, установка, команды    |
| [PLAN.md](PLAN.md)                     | Текущие задачи, TODO, roadmap        |
| [PLAN_COMPLETED.md](PLAN_COMPLETED.md) | Завершённые фичи по версиям          |
| [PLAN_TESTING.md](PLAN_TESTING.md)     | План и статистика тестирования       |
| [CHANGELOG.md](CHANGELOG.md)           | История изменений (Keep a Changelog) |
| [FAQ.md](FAQ.md)                       | Часто задаваемые вопросы             |

---

## Технологии

- **Electron 39** + **Next.js 16** - Desktop framework
- **Chakra UI v3** - UI компоненты
- **ZenStack + Prisma** - SQLite база данных
- **@letar/label-printer-core** - shared библиотека сервисов печати
- **electron-updater** - автообновления

## Функции

### Печать

- ✅ Автоматическое чтение с USB сканера
- ✅ Ручной ввод кодов маркировки
- ✅ Валидация кодов GS1 (GTIN-13, GTIN-14, серийный номер)
- ✅ Тестовая печать
- ✅ Пакетная печать из CSV/TXT

### База данных

- ✅ История печати с поиском и пагинацией
- ✅ Статистика печати с MetricCard визуализацией
- ✅ База товаров (GTIN) с CRUD операциями
- ✅ Экспорт истории в Excel
- ✅ Экспорт статистики в PDF

### Настройки

- ✅ Конфигурация принтера (режим, скорость, плотность)
- ✅ Выбор шаблона этикетки
- ✅ Позиция DataMatrix и GTIN
- ✅ Настройки поведения (дубликаты, автопереподключение)
- ✅ Вкладки для удобной навигации

### Другое

- ✅ Тёмная тема
- ✅ Автообновление через GitHub Releases
- ✅ Симуляция сканера для разработки

## Разработка

```bash
# Генерация ZenStack схем
nx zenstack:generate label-printer-desktop

# Создание/обновление базы данных
nx db:push label-printer-desktop

# Запуск в dev режиме
nx dev label-printer-desktop
```

## Сборка

```bash
# Windows
nx build:win label-printer-desktop

# Linux
nx build:linux label-printer-desktop

# macOS
nx build:mac label-printer-desktop
```

## Структура

```
apps/label-printer-desktop/
├── main/                    # Electron main process
│   ├── background.ts        # Entry point
│   ├── preload.ts           # IPC bridge
│   ├── ipc/                 # IPC handlers
│   ├── services/            # Сервисы (settings, updater, logger)
│   └── utils/               # Утилиты (port-finder, paths)
├── renderer/                # Next.js (UI)
│   ├── app/                 # Страницы
│   │   ├── home/            # Главная (сканирование)
│   │   ├── manual/          # Ручной ввод
│   │   ├── batch/           # Пакетная печать
│   │   ├── history/         # История печати
│   │   ├── stats/           # Статистика
│   │   ├── products/        # База товаров
│   │   └── settings/        # Настройки
│   ├── lib/                 # Утилиты
│   └── types/               # TypeScript типы
├── shared/                  # Общие типы
├── prisma/                  # База данных
├── templates/               # Шаблоны этикеток
├── resources/               # Иконки приложения
└── schema.zmodel            # ZenStack схема
```

## Shared библиотека

Приложение использует `@letar/label-printer-core` для:

- **GS1Parser** - парсинг кодов маркировки "Честный знак"
- **ImageGeneratorService** - генерация изображений этикеток
- **PrinterService** - работа с принтером (Mock, Real, Windows)
- **TSPLService** - команды для принтеров TSC
- **TemplateRendererService** - рендеринг TSX шаблонов (Satori + resvg)

---

**Последнее обновление:** 2026-01-01
