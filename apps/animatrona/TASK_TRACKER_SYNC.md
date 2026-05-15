# Задание: Синхронизация с новой архитектурой трекера

## Контекст

Трекер (`animatrona-tracker`) переходит на новую архитектуру публикации:

**БЫЛО:** Desktop отправляет `manifestCid` + все метаданные (title, description, year, studio, genres, episodes[]) → трекер сохраняет как есть.

**СТАЛО:** Desktop отправляет **только `directoryCid`** → трекер сам загружает `manifest.json` → `AnimeInfo` → `EpisodesDocument` через IPFS gateway и извлекает все метаданные, включая `shikimoriId` из `externalIds`.

Это нужно для:

1. **Дедупликации по shikimoriId** — трекер автоматически обнаруживает дубликаты
2. **Single source of truth** — метаданные всегда актуальны из IPFS, нет рассинхрона
3. **Упрощения Desktop** — меньше данных формировать и отправлять

## Что нужно сделать

### 1. Упростить `publishToTracker()`

**Файл:** `apps/animatrona/main/services/tracker-client.ts`

```typescript
// БЫЛО (6 параметров, сложный payload из ~20 полей):
export async function publishToTracker(
  config: TrackerConfig,
  manifest: AnimeManifest,
  manifestCid: string,
  animeInfo: AnimeInfo | null,
  episodes: AnimeManifestEpisode[],
  directoryCid?: string
): Promise<TrackerPublishResult>

// СТАЛО (2 параметра, payload из 1 поля):
export async function publishToTracker(config: TrackerConfig, directoryCid: string): Promise<TrackerPublishResult>
```

### 2. Payload — одно поле

```typescript
const payload = { directoryCid }
```

Удалить из payload: `manifestCid`, `title`, `titleOriginal`, `description`, `coverUrl`, `year`, `studio`, `genres`, `episodes`. Трекер извлекает всё это сам из IPFS.

### 3. Обновить все вызовы `publishToTracker()`

Найти все места вызова (вероятно `tracker.handlers.ts` или IPC обработчики) и передавать только `config` и `directoryCid`.

Больше не нужно предварительно загружать `AnimeInfo` и `EpisodesDocument` только ради публикации на трекер (если они не используются для других задач).

### 4. `directoryCid` обязателен

`directoryCid` теперь **не optional**. Если его нет — публикация на трекер невозможна. Показать пользователю ошибку типа "Сначала постройте IPFS-директорию".

### 5. Обновить `TrackerPublishResult`

Трекер теперь возвращает дополнительные поля:

```typescript
export interface TrackerPublishResult {
  success: boolean
  animeId?: string
  status?: string
  episodeCount?: number
  error?: string
  // НОВЫЕ ПОЛЯ:
  isReplacement?: boolean // true если обнаружен дубликат по shikimoriId
  replacesAnimeId?: string // ID существующего аниме, которое замещается
}
```

Если `isReplacement: true` — показать пользователю уведомление "Аниме отправлено как кандидат на замену существующей раздачи".

## Что НЕ менять

- `registerDistribution()` — не связана с метаданными
- `updateDistribution()` — не связана с метаданными
- `testTrackerConnection()` — работает как раньше
- `anime-directory-builder.ts` — генерация директории уже реализована

## Проверка

1. Вызвать публикацию на трекер → POST body = `{ "directoryCid": "bafy..." }`
2. Трекер должен вернуть `{ success: true, anime: { id, title, status, episodeCount } }`
3. Если shikimoriId совпал с существующим → `{ isReplacement: true, replacesAnimeId: "..." }`
