# @letar/animatrona-shared

Общий код для animatrona-mobile и animatrona-tv. API-клиент, хранилище подключения, прогресс просмотра, утилиты форматирования.

## Установка

```typescript
import {
  createApiClient,
  createConnectionStore,
  formatBitrate,
  formatBytes,
  formatDuration,
  normalizeServerUrl,
  useWatchProgress,
} from '@letar/animatrona-shared'
```

## API

### Фабрики

- `createApiClient()` — API-клиент для взаимодействия с сервером
- `createConnectionStore()` — Zustand стор для состояния подключения

### Хуки

- `useWatchProgress()` — отслеживание прогресса просмотра

### Утилиты

- `formatBitrate()`, `formatBytes()`, `formatDuration()`, `formatDurationHuman()`
- `normalizeServerUrl()`, `isNetworkError()`

### Типы

- `AnimeDetails`, `Episode`, `Chapter`, `WatchProgress`, `ServerStatus`

## Команды

```bash
nx build animatrona-shared
nx test animatrona-shared
nx lint animatrona-shared
```

---

**Версия:** 0.2.1
