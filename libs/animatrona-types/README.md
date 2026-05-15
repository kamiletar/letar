# @letar/animatrona-types

Общие типы IPFS-документов для экосистемы Animatrona.

## Установка

```typescript
import type {
  AnimeInfo,
  AnimeManifest,
  EpisodeManifest,
  FranchiseGraphDocument,
  PublishedLibrary,
} from '@letar/animatrona-types'
```

## Типы

- `PublishedLibrary` — опубликованная библиотека аниме
- `AnimeManifest` — манифест аниме (эпизоды, субтитры, аудио)
- `AnimeInfo` — метаданные аниме
- `EpisodeManifest` — манифест эпизода
- `AnimeManifestEpisode`, `ManifestChapter`, `ManifestSubtitleTrack`
- `FranchiseGraphDocument` — документ графа франшизы

### Константы версий

- `ANIME_MANIFEST_VERSION`, `ANIME_INFO_VERSION`, `MANIFEST_VERSION`

---

**Версия:** 0.1.0
