# Animatrona

<div align="center">

[![Version](https://img.shields.io/github/v/release/kamiletar/animatrona?label=version)](https://github.com/kamiletar/animatrona/releases)
[![Downloads](https://img.shields.io/github/downloads/kamiletar/animatrona/total)](https://github.com/kamiletar/animatrona/releases)
[![License](https://img.shields.io/github/license/kamiletar/animatrona)](./LICENSE)
[![Website](https://img.shields.io/badge/website-animatrona.letar.best-blue)](https://animatrona.letar.best)

</div>

Кроссплатформенное desktop-приложение для транскодирования, управления и просмотра аниме-контента с поддержкой AV1-кодирования и ASS-субтитров.

**🌐 [animatrona.letar.best](https://animatrona.letar.best) — Скачать последнюю версию**

> **Технологический стек:** Electron, Next.js 16, Chakra UI v3, FFmpeg + SVT-AV1, SQLite + Prisma, Shaka Player
>
> **Документация для разработчиков:** см. [CLAUDE.md](./CLAUDE.md)

---

## Документация

| Файл                                   | Описание                             |
| -------------------------------------- | ------------------------------------ |
| [README.md](README.md)                 | Обзор проекта, установка, команды    |
| [CLAUDE.md](CLAUDE.md)                 | Инструкции для Claude (БД, миграции) |
| [PLAN.md](PLAN.md)                     | Текущие задачи, TODO, roadmap        |
| [PLAN_COMPLETED.md](PLAN_COMPLETED.md) | Завершённые фичи по версиям          |
| [PLAN_TESTING.md](PLAN_TESTING.md)     | План и статистика тестирования       |
| [CHANGELOG.md](CHANGELOG.md)           | История изменений (Keep a Changelog) |

---

## Структура проекта

```
apps/animatrona/
├── main/                    # Electron Main Process
│   ├── src/
│   │   ├── index.ts         # Entry point
│   │   ├── ffmpeg/          # FFmpeg wrapper
│   │   ├── services/        # Сервисы (анализ, субтитры, шрифты)
│   │   └── ipc/             # IPC handlers
│   └── preload/
│       └── index.ts         # Preload script
│
├── renderer/                # Next.js Static Export
│   ├── src/
│   │   ├── app/             # App Router
│   │   ├── components/      # UI компоненты
│   │   ├── hooks/           # React hooks
│   │   └── stores/          # Zustand stores
│   └── next.config.js
│
├── README.md                # Этот файл
└── PLAN.md                  # План развития
```

## Команды

```bash
# Разработка
nx dev animatrona-renderer   # Запустить Next.js dev сервер (порт 3007)
nx dev animatrona-main       # Запустить Electron (требует собранный renderer)

# Сборка
nx build animatrona-renderer # Собрать static export
nx build animatrona-main     # Собрать Electron main process

# Проверки
nx lint animatrona-main
nx lint animatrona-renderer
nx typecheck:tsgo animatrona-main
nx typecheck:tsgo animatrona-renderer
```

## Разработка

### Режим разработки

1. Запустить renderer dev сервер:

   ```bash
   nx dev animatrona-renderer
   ```

2. В другом терминале запустить Electron:
   ```bash
   nx dev animatrona-main
   ```

### Сборка для продакшена

```bash
nx build animatrona-renderer
nx build animatrona-main
```

## Архитектура

### IPC (Inter-Process Communication)

Main process предоставляет API через preload script:

```typescript
// В renderer (React компоненты)
const version = await window.electronAPI.getVersion()
const folder = await window.electronAPI.selectFolder()
```

### FFmpeg интеграция

Main process содержит модули для работы с FFmpeg:

- `ffmpeg/probe.ts` — получение информации о файлах
- `ffmpeg/transcode.ts` — транскодирование видео в AV1
- `ffmpeg/merge.ts` — сборка MKV с аудио и субтитрами

### База данных (SQLite + Prisma Migrate)

Приложение использует SQLite через ZenStack ORM (Prisma-совместимый). Схема описана в `schema.zmodel`.

**Архитектура миграций (гибридный подход):**

```
Development:
  schema.zmodel → zenstack generate → schema.prisma → prisma migrate dev → SQL файлы

Production (Electron):
  SQL файлы из prisma/migrations/ → sql.js применяет → SQLite БД
```

**Особенности:**

- **Первый запуск:** БД копируется из `resources/template.db` в `%APPDATA%/Animatrona/data/app.db`
- **Автомиграции:** SQL файлы из `prisma/migrations/` применяются автоматически при старте
- **sql.js (WASM):** Используется для миграций — без проблем компиляции native модулей
- **Prisma-совместимость:** Таблица `_prisma_migrations` для отслеживания применённых миграций

**Воркфлоу обновления схемы:**

```bash
# 1. Изменить schema.zmodel

# 2. Создать миграцию (одна команда!)
nx db:migrate animatrona -- --name add_new_feature
# Автоматически: zenstack:generate → prisma migrate dev → copy template.db

# 3. Собрать приложение (миграции включены автоматически)
nx build:win animatrona
```

**При автообновлении у пользователя:**

1. Electron Updater загружает новую версию
2. Приложение запускается
3. `applyPrismaMigrations()` читает SQL из `resources/migrations/`
4. Новые миграции применяются, записываются в `_prisma_migrations`
5. ZenStack ORM работает с обновлённой схемой

### Пути данных

| Данные     | Windows                                    | macOS                                                          |
| ---------- | ------------------------------------------ | -------------------------------------------------------------- |
| БД         | `%APPDATA%/@letar/animatrona/data/app.db`   | `~/Library/Application Support/@letar/animatrona/data/app.db`   |
| Логи       | `%APPDATA%/@letar/animatrona/logs/main.log` | `~/Library/Application Support/@letar/animatrona/logs/main.log` |
| Библиотека | `~/Videos/Animatrona/` (настраивается)     | `~/Movies/Animatrona/` (настраивается)                         |

**Логи:** уровень info+ записывается в файл без ANSI-цветов. Ротация: 3 файла по 5MB (`main.log` → `main.1.log` → `main.2.log`).

## Версионирование и релизы

Для публикации новой версии используется автоматизированный процесс:

```bash
# 1. Обновить CHANGELOG.md вручную (добавить описание изменений)

# 2. Обновить версию (создаёт commit + tag)
bun scripts/bump-version.ts animatrona patch  # 0.21.14 → 0.21.15
# или: minor (0.21.14 → 0.22.0), major (0.21.14 → 1.0.0)

# 3. Отправить в репозиторий
git push origin main
git push origin animatrona-vX.Y.Z

# 4. GitHub Actions автоматически:
#    - Публикует исходники в github.com/kamiletar/animatrona
#    - Собирает Windows, macOS, Linux
#    - Создаёт GitHub Release с бинарниками
#    - Обновляет лендинг (animatrona.letar.best)
```

**Что обновляет скрипт `bump-version.ts`:**

- `package.json` → `version`
- `renderer/package.json` → `version`
- `resources/splash.html` → версия в UI

**Что НЕ автоматизировано:**

- Обновление `CHANGELOG.md` — делается вручную перед bump
- Локальная сборка Windows/Linux (через GitHub Actions)

## Roadmap

См. [PLAN.md](./PLAN.md) для полного плана развития.

### Реализовано (v0.1 — v0.9)

- [x] Electron + Next.js 16 (static export)
- [x] FFmpeg интеграция (probe, transcode, merge)
- [x] Shaka Player + SubtitlesOctopus (ASS субтитры)
- [x] SQLite + ZenStack ORM + Prisma Migrate
- [x] Библиотека аниме с метаданными (Shikimori API)
- [x] История просмотра и статусы
- [x] Профили кодирования
- [x] Автообновления (electron-updater)

### В разработке (v0.9.4)

- [ ] Рефакторинг: декомпозиция крупных компонентов
- [ ] Оптимизация UI

### Будущее (v1.0+)

- [ ] IPFS/Helia интеграция
- [ ] P2P обмен контентом
- [ ] Web-платформа

---

**Последнее обновление:** 2026-01-10
