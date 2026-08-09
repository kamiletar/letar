# Animatrona — поля с двумя источниками истины (БД-колонка + IPFS-манифест)

## Симптом

У части полей `Episode` есть два места хранения одного и того же CID: колонка в SQLite и
поле внутри опубликованного в IPFS `EpisodeManifest`/его под-документов (thumbnails.json,
chapters.json). Билдер IPFS-директории (`anime-directory-builder.ts`) при сборке
`directoryCid` читает оба источника с приоритетом БД. Импорт при **retranscode** (повторном
импорте эпизода) не приводит их в согласованное состояние — из-за этого в новый
`directoryCid` может уехать устаревший CID из БД, а свежий CID из манифеста будет молча
проигнорирован.

Найдено при аудите directoryCid перед массовым перезаливом библиотеки, 2026-08-08 —
см. `apps/animatrona/PLAN_COMPLETED.md` (запись той же даты).

## Какие поля дублируются и порядок чтения

`anime-directory-builder.ts` собирает финальный CID для трёх полей эпизода в таком порядке
приоритета (первый непустой источник побеждает):

| Поле                   | Порядок чтения (builder)                                                                                                                                                                                                        | Где в коде                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `spriteCid` / `vttCid` | 1) `Episode.spriteCid`/`vttCid` (БД) → 2) `parsedManifest.thumbnails` (inline legacy) → 3) `ThumbnailsDocument` JSON по `parsedManifest.thumbnailsCid`                                                                          | [anime-directory-builder.ts:759-776](/apps/animatrona/main/services/ipfs/anime-directory-builder.ts#L759-L776) |
| `chaptersCid`          | 1) `Episode.chaptersCid` (БД) → 2) `parsedManifest.chaptersCid`                                                                                                                                                                 | [anime-directory-builder.ts:409](/apps/animatrona/main/services/ipfs/anime-directory-builder.ts#L409)          |
| `metadataCid`          | только `parsedManifest.metadataCid`, с recovery через `regenerateMetadataJson()` из колонок БД (`durationMs`/`videoWidth`/`videoHeight`/`videoBitDepth`) — не dual-source, БД тут вход для регенерации, а не альтернативный CID | [anime-directory-builder.ts:719-731](/apps/animatrona/main/services/ipfs/anime-directory-builder.ts#L719-L731) |

БД-приоритет обоснован комментарием в схеме — колонки существуют специально, чтобы
**переживать recovery**: если билдер регенерирует sprite/главы из `video.webm` (когда и БД,
и манифест мертвы), новый CID пишется в БД, и при следующей сборке directoryCid не нужно
регенерировать повторно — см. [schema.zmodel:857-870](/apps/animatrona/schema.zmodel#L857-L870).

## Порядок записи — где расходится с порядком чтения

**Recovery-путь (внутри самого билдера)** пишет в БД корректно — сразу после регенерации:

- sprite/vtt: [anime-directory-builder.ts:806-810](/apps/animatrona/main/services/ipfs/anime-directory-builder.ts#L806-L810) (`prisma.episode.update({ spriteCid, vttCid })`)
- chapters: [anime-directory-builder.ts:496-499](/apps/animatrona/main/services/ipfs/anime-directory-builder.ts#L496-L499) (`prisma.episode.update({ chaptersCid })`)

**Импорт (`import-service.ts`) — источник рассинхрона.** При обычном импорте
(`!isRetranscode`) колонки `spriteCid`/`vttCid`/`chaptersCid` вообще никогда не заполняются —
sprite пишется только в манифест через `updateManifestThumbnails()`
([import-service.ts:1296-1302](/apps/animatrona/main/services/import/import-service.ts#L1296-L1302)),
а `chaptersCid` в БД не пишется нигде в импорте вообще. Обе колонки остаются `null` до первого
recovery-прохода билдера.

При **retranscode** существующего эпизода `updateEpisode()` явно сбрасывает связанный с CID
набор колонок перед постпроцессингом:

```ts
// import-service.ts:326-339
await db.updateEpisode(episodeId, {
  ...
  // Сбрасываем CID — будут заново установлены в postProcess
  transcodedCid: null,
  manifestCid: null,
  ipfsSize: null,
  thumbnailCids: null,
  screenshotCids: null,
  metadataCid: null,
})
```

`spriteCid`, `vttCid`, `chaptersCid` **в этот список не входят**. Если у эпизода когда-то
раньше сработал recovery-путь билдера (колонки заполнены старым CID), retranscode:

1. Генерирует новый sprite/vtt и пишет их **только** в свежий манифест.
2. Не трогает старые `Episode.spriteCid`/`vttCid` в БД — они остаются с прежним значением.
3. При следующей сборке `directoryCid` билдер (см. таблицу выше) сначала смотрит на БД,
   находит там непустой старый CID и использует его — свежий sprite из манифеста никогда не
   попадает в directoryCid, хотя формально существует и валиден.

Для `chaptersCid` тот же механизм: билдер читает `ep.chaptersCid` в приоритете
([anime-directory-builder.ts:409](/apps/animatrona/main/services/ipfs/anime-directory-builder.ts#L409)),
retranscode эту колонку не сбрасывает и не обновляет.

## Правило при добавлении нового CID-поля с dual-source паттерном

При проектировании нового поля, которое одновременно хранится и в колонке `Episode`/`Anime`,
и внутри IPFS-манифеста (или его под-документа) — выбери один из двух вариантов **осознанно**,
а не по умолчанию:

1. **Сбрасывай оба места разом при любой инвалидации источника.** Если retranscode/reupload
   генерирует новый манифест — тот же код обязан обнулить (или сразу перезаписать актуальным
   значением) соответствующую колонку БД в том же вызове `updateEpisode()`/`prisma.episode.update()`,
   которым сбрасываются остальные CID-поля (`transcodedCid`, `manifestCid` и т.д.). Не полагаться
   на то, что «билдер как-нибудь разберётся» при следующей сборке directoryCid.
2. **Либо явно документируй, какое из двух — source of truth**, и убедись, что **только
   один** код-путь пишет в него. Если БД — source of truth (как задумано для `spriteCid`/
   `vttCid`/`chaptersCid` по комментарию в схеме), тогда путь, который генерирует новый манифест
   (импорт/retranscode), обязан писать тот же CID и в БД — а не только в манифест, как сейчас.

Общий принцип: билдер и импорт — это producer и consumer одного контракта (какое поле,
в каком порядке читается). Проверка/аудит этого контракта должна смотреть **обе стороны**, а
не только сторону потребления — см. [verification-pitfalls.md](/.claude/docs/verification-pitfalls.md)
про тот же урок применительно к этому конкретному аудиту.

## Открытый вопрос (не исправлено в рамках аудита 2026-08-08)

Фикс не сделан — это только фиксация паттерна. Варианты фикса (из PLAN.md/PLAN_COMPLETED.md
аудита): либо добавить `spriteCid: null, vttCid: null, chaptersCid: null` в reset-блок
`updateEpisode()` при retranscode, либо после `updateManifestThumbnails()`/generateManifestFromDemux
сразу писать те же CID в колонки БД. Второй вариант ближе к замыслу схемы («колонки переживают
recovery») и не требует, чтобы билдер заново регенерировал их при следующей сборке.
