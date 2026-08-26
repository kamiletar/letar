---
paths: 'apps/animatrona/**/*'
---

# Animatrona — Desktop приложение для аниме

## Описание

Electron приложение для импорта, транскодирования и просмотра аниме-контента. Использует FFmpeg для обработки видео.

## Архитектура

```
apps/animatrona/
├── main/                 # Electron main process
│   ├── main.ts           # Точка входа
│   ├── preload.ts        # Context bridge
│   └── ipc/              # IPC handlers
│       ├── ffmpeg.handlers.ts
│       ├── dialog.handlers.ts
│       └── app.handlers.ts
├── renderer/             # Next.js (static export)
│   ├── app/
│   │   ├── transcode/    # Wizard транскодирования
│   │   ├── player/       # Видеоплеер
│   │   └── library/      # Библиотека (будущее)
│   └── types/
│       └── electron.d.ts # Типы для IPC
└── src/generated/        # Prisma (SQLite)
```

## Технологии

| Компонент | Технология                      |
| --------- | ------------------------------- |
| Runtime   | Electron 33+                    |
| Renderer  | Next.js 16 (static export)      |
| UI        | Chakra UI v3                    |
| Database  | SQLite + Prisma                 |
| Video     | FFmpeg (av1_nvenc)              |
| Player    | Shaka Player + SubtitlesOctopus |

## IPC каналы

```typescript
// Основные каналы
'app:getVersion' // Версия приложения
'dialog:selectFile' // Выбор файла
'dialog:selectFolder' // Выбор папки
'ffmpeg:probe' // Анализ медиафайла
'ffmpeg:transcode' // Транскодирование
'ffmpeg:merge' // Сборка MKV
```

## Особенности

- **GPU ускорение** — av1_nvenc для NVIDIA
- **ASS субтитры** — через SubtitlesOctopus
- **Шрифты** — автоматическое извлечение из MKV

## База данных

SQLite + ZenStack (Prisma). Миграции через sql.js (WASM) — без native модулей.

```bash
nx zenstack:generate animatrona  # После изменения schema.zmodel
nx db:push animatrona            # Dev: быстрое обновление БД
nx db:migrate animatrona -- --name feature  # Production: создать миграцию
nx db:template animatrona        # Обновить template.db
```

## Документация

- См. `apps/animatrona/README.md`
- См. `apps/animatrona/CLAUDE.md` — **инструкции по БД и миграциям**
- См. `apps/animatrona/PLAN.md` для roadmap
- См. `.claude/docs/electron-sqlite.md` — архитектура миграций
- См. [animatrona-db-manifest-dual-source.md](/.claude/docs/animatrona-db-manifest-dual-source.md) — поля `Episode.spriteCid`/`vttCid`/`chaptersCid`, дублированные в БД и в IPFS-манифесте: билдер directoryCid читает с приоритетом БД, а retranscode не обновляет колонки, из-за чего в directoryCid может уехать устаревший CID
- См. [animatrona-dual-build-alias-drift.md](/.claude/docs/animatrona-dual-build-alias-drift.md) — `apps/animatrona/main/` собирается webpack (`animatrona:build`) и esbuild (`animatrona-main:build`) независимо, каждый со своим списком `@letar/*`-алиасов (`webpack.config.js` `resolve.alias` vs `tsconfig.json` `paths`) — новый `@letar/*`-импорт в `main/` требует правки обоих файлов
- → Skill: `pwa-offline` для offline паттернов (будущее)
