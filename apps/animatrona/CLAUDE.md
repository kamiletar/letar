# Animatrona — Инструкции для Claude

## База данных (SQLite + ZenStack)

### Архитектура

```
schema.zmodel → zenstack generate → schema.prisma → prisma migrate → SQL файлы
                                                                         ↓
                                           applyPrismaMigrations() ← sql.js (WASM)
```

- **ZenStack** — описание моделей в `schema.zmodel`
- **Prisma** — генерация клиента и миграций (только dev)
- **sql.js** — применение миграций в Electron (WASM, кроссплатформенный)

### Команды

| Команда                                      | Когда использовать                      |
| -------------------------------------------- | --------------------------------------- |
| `nx zenstack:generate animatrona`            | После изменения schema.zmodel           |
| `nx db:push animatrona`                      | Dev: быстрое обновление БД без миграции |
| `nx db:migrate animatrona -- --name feature` | **Production: создать миграцию**        |
| `nx db:reset animatrona`                     | Сбросить БД и применить все миграции    |

### Workflow изменения схемы

**Development (быстрые итерации):**

```bash
# 1. Редактировать schema.zmodel
# 2. Сгенерировать и применить
nx zenstack:generate animatrona && nx db:push animatrona
```

**Production (перед релизом):**

```bash
# 1. Редактировать schema.zmodel
# 2. Создать миграцию
nx db:migrate animatrona -- --name add_new_feature
# 3. Коммитить: schema.zmodel + prisma/migrations/*
```

### Структура файлов

```
apps/animatrona/
├── schema.zmodel              # Источник истины
├── prisma/
│   ├── data/app.db           # Dev база данных
│   └── migrations/           # SQL миграции
│       └── 20260130054221_init/
│           └── migration.sql
└── main/
    └── main.ts               # applyPrismaMigrations()
```

### Особенности Electron

**Почему нельзя Prisma CLI в production:**

- Требует native модули (разные для Win/Mac/Linux)
- Добавляет ~50MB к размеру
- Может не иметь прав на запуск

**Как работает в production:**

1. При первом запуске: создаётся пустая БД и применяются все миграции
2. При каждом запуске: `applyPrismaMigrations()` проверяет новые миграции
3. Миграции из `resources/migrations/*.sql` применяются через sql.js
4. Перед каждой миграцией создаётся backup: `app.db.backup.migration_name`

### Таблица \_prisma_migrations

```sql
-- Отслеживает применённые миграции
SELECT migration_name, finished_at, applied_steps_count
FROM _prisma_migrations;
```

### Обратная совместимость

Старые БД (user_version >= 5) автоматически помечаются как `0_baseline` при первом запуске новой версии. Это позволяет плавно перейти на Prisma Migrate без потери данных.

---

## Принцип минимума БД

### Концепция

Animatrona — IPFS-first приложение. Когда пользователь А раздаёт аниме по CID, пользователь Б
должен получить **всё** для полноценного импорта — только из IPFS, без Shikimori и других
внешних источников.

**AnimeManifest JSON в IPFS = источник истины** (самодостаточный, полные метаданные аниме).
**SQLite = локальный индекс** (только то, без чего невозможны JOIN/WHERE/ORDER и локальная работа).

### Таблица разделения

```
БД (SQLite) — локальный индекс          IPFS AnimeManifest JSON — источник истины
─────────────────────────────          ──────────────────────────────────────────
id, shikimoriId                         description
name                                    synonyms, nameEn, originalName
year (для фильтра)                      ageRating, source
status (для фильтра)                    rating, duration, licensor
episodeCount (для фильтра)              nextEpisodeAt
watchStatus (пользователь)             genres[]      ← дубль (для раздачи по CID)
userRating (пользователь)              themes[]      ← дубль (для раздачи по CID)
genres (JOIN, только FK)               studios[], staff[], characters[]
posterCid                               externalLinks, fandubbers, fansubbers
directoryCid                            episodes[] (name, durationMs, metadata)
                                        relations[] с полными данными целевых аниме
```

### Правило для нового поля

1. **Нужно в WHERE/ORDER BY/JOIN?** → только БД (+ продублировать в IPFS JSON)
2. **Только отображение, не влияет на запросы?** → только IPFS JSON
3. **Пользовательские данные** (watchStatus, userRating, прогресс)? → только БД, **никогда в IPFS**
4. **CID-ссылка на IPFS контент?** → только БД

### Жанры и темы — особый случай

Хранятся в **обоих** местах:

- В БД (`GenreOnAnime`, `ThemeOnAnime`) — для быстрой фильтрации WHERE/JOIN
- В IPFS JSON (`genres[]`, `themes[]`) — для полного восстановления по CID на других устройствах

### Что точно остаётся в БД

| Группа           | Поля                                                             |
| ---------------- | ---------------------------------------------------------------- |
| Идентификаторы   | Все IDs, FK, `shikimoriId`                                       |
| CID-ссылки       | Все `*Cid` поля                                                  |
| Фильтры          | `year`, `status`, `episodeCount`, `rating` (ORDER BY)            |
| Качество видео   | `Episode.videoHeight`, `videoBitDepth` (WHERE фильтры)           |
| Пользовательские | `WatchProgress.*`, `watchStatus`, `userRating`                   |
| Плеер            | `AudioTrack`, `SubtitleTrack`, `SubtitleFont` (JOIN по dubGroup) |
| Конфигурация     | `Settings`, `EncodingProfile`                                    |
| Очередь          | `ImportQueueItem`                                                |
| P2P              | `Subscription`, `FederationSettings`                             |

---

## IPFS-first архитектура хранения

### Принцип

**Все медиафайлы хранятся в IPFS.** Локальные файлы на диске — только временные, удаляются сразу после загрузки в IPFS.

- `File.cid` — CID файла в IPFS (постеры, обложки)
- `Episode.transcodedCid` — CID видео в IPFS
- `AudioTrack.transcodedCid` — CID аудиодорожки в IPFS
- `SubtitleTrack.fileCid` — CID субтитров в IPFS
- `SubtitleFont.fileCid` — CID шрифта в IPFS

### Следствия

- **`episode.folderPath` может быть `null`** — локальная папка эпизода удалена после импорта. Нельзя полагаться на `folderPath` как на рабочую директорию.
- **Temp файлы удаляются сразу** после `uploadToIpfs()`. Не оставлять файлы на диске без причины.
- **IPFS gateway URL** получать через `getKuboService().getGatewayUrl() ?? 'http://localhost:8765'`. **Никогда** не хардкодить порт.

### Паттерн добавления файла

```typescript
// ✅ Правильно: загрузить в IPFS, удалить temp
const cid = await uploadToIpfs(tempFilePath)
await api.fs.delete(tempFilePath, false).catch(() => {})
await db.createRecord({ cid })

// ❌ Неправильно: оставлять файл на диске
const cid = await uploadToIpfs(tempFilePath)
await db.createRecord({ filePath: tempFilePath, cid })
```

### Добавление дорожек (use-track-processing.ts)

При добавлении аудио/субтитров через "Добавить дорожки":

1. Файл транскодируется/копируется во **временную папку** (`animeFolderPath` если `folderPath=null`)
2. Загружается в IPFS → получаем CID
3. **Temp файл удаляется** сразу после загрузки
4. CID сохраняется в БД (`transcodedCid` / `fileCid`)

---

## Полезные пути

| Переменная | Dev                              | Production                         |
| ---------- | -------------------------------- | ---------------------------------- |
| БД         | `prisma/data/app.db`             | `%APPDATA%/Animatrona/data/app.db` |
| Миграции   | `prisma/migrations/`             | `resources/migrations/`            |
| Библиотека | По умолчанию `Videos/Animatrona` | Настраивается                      |

## Документация

- [react-effect-stable-ref-pitfall](/.claude/docs/react-effect-stable-ref-pitfall.md) — эффект с deps на ref/DOM-элемент не перезапускается повторно: либо навешивается до монтирования реального узла при условном skeleton-рендере (`useVirtualizedGrid`), либо зависит от персистентного объекта, стабильного всё время жизни приложения (`globalVideoElement` в `VideoPlayer`) — callback-ref вместо `useRef`+`useLayoutEffect([])`, событие как источник повторного срабатывания вместо самого объекта.
