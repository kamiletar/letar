# @letar/animatrona-utils

Общие утилиты для Animatrona web-стека (tracker + web).

## Установка

```typescript
import {
  ANIME_STATUS_CONFIG,
  buildExternalLinks,
  createMediaUrlHelpers,
  formatBitrate,
  formatBytes,
  formatDuration,
  isValidCid,
  PUBLISH_STATUS_CONFIG,
} from '@letar/animatrona-utils'
```

## API

### Валидация

- `isValidCid()` — проверка CID

### Форматирование

- `formatBytes()`, `formatDuration()`, `formatBitrate()`, `formatSpeed()`, `formatFileSize()`, `formatFps()`, `formatChannels()`

### URL-хелперы

- `createMediaUrlHelpers()` — фабрика URL для медиа-файлов

### Внешние ссылки

- `buildExternalLinks()` — генерация ссылок на внешние ресурсы

### Константы

- `ANIME_STATUS_CONFIG`, `PUBLISH_STATUS_CONFIG`

---

