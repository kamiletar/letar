# Changelog (Архив: v0.28.0 — v0.34.0)

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

> Актуальные изменения см. в [CHANGELOG.md](./CHANGELOG.md)
>
> Архивировано: 2026-03-25

---

## [0.34.0] - 2026-03-14

### Added

- **Персистентность очереди кодирования в SQLite:** очередь импорта сохраняется между перезапусками
- **Каталог в навигации:** добавлен пункт «Каталог» в сайдбар
- **Раздачи по directoryCid:** регистрация раздач на трекере с отправкой статистики
- **P2P Statistics Dashboard:** графики bandwidth и трафика с Kubo API
- **Второй пин-сервер pinner2:** поддержка нескольких пиннеров

### Changed

- **Тюнинг Kubo:** оптимизация для высокой пропускной способности
- **StorageMax 500GB** для desktop Kubo

## [0.33.0] - 2026-03-10

### Added

- **IPFS-директории:** один CID на аниме вместо десятков отдельных pins
- **Двухпроходная сборка директории:** `directoryBlocks`/`directorySize` в manifest.json для прогресса пиннинга
- **IPNS публикация как IPFS-директория**
- **IPFS size stats** для всех медиафайлов
- **Пересборка манифеста** после изменения глав и названий эпизодов

### Fixed

- Поиск с кириллицей ломался при стемминге
- FK violation при привязке аниме к франшизе

## [0.32.0] - 2026-03-08

### Changed

- **Декомпозиция god objects:** рефакторинг экосистемы Animatrona — preload декомпозиция, shared utils, удаление мёртвого кода из IPFS-сервисов

## [0.31.0] - 2026-03-07

### Added

- **Cloud Library — облачная библиотека:** синхронизация библиотеки с трекером, пакетная публикация аниме
- **Объединённая вкладка "Раздачи":** desktop сиды + pin-серверы

## [0.30.5] - 2026-03-05

### Changed

- **Группировка по франшизам:** переход на connected components вместо franchise ID. Строит граф "сильных" связей (SEQUEL, PREQUEL, SIDE_STORY и т.д.) между загруженными аниме и группирует по BFS-компонентам. Это разбивает огромные Shikimori-франшизы (Re:Zero + Isekai Quartet) на логичные подгруппы по прямым связям.

## [0.30.4] - 2026-03-05

### Changed

- **Настройки P2P:** разделены на подвкладки IPFS и Трекер (вместо длинного скролла)
- **Федерация:** вкладка скрыта — серверная часть (`animatrona-tracker`) ещё не реализует ActivityPub endpoints. Клиентский код сохранён для будущего

## [0.29.0] - 2026-02-23

### Removed (breaking)

- **Принцип минимума БД:** удалены display-only поля из SQLite. Они теперь живут только в AnimeManifest (IPFS).
  - `Anime.description` → `AnimeManifest.description`
  - `Anime.source` (enum AnimeSource) → удалён (отсутствует в Shikimori GraphQL API)
  - `Anime.ageRating` (enum AgeRating) → `AnimeManifest.ageRating`
  - `Anime.duration` → `AnimeManifest.duration`
  - `Anime.licensor` → `AnimeManifest.licensor`
  - `Anime.nextEpisodeAt` → `AnimeManifest.nextEpisodeAt`
  - `Episode.videoCodec` → `EpisodeManifest.encoding.codec`
  - `Episode.videoBitrate` → `EpisodeManifest.encoding.bitrate`
  - `Episode.encodingSettingsJson` → `EpisodeManifest.encoding.*`
  - `Episode.sourceSize` → `EpisodeManifest.encoding.sourceSize`
  - `Episode.transcodedSize` → `EpisodeManifest.encoding.transcodedSize`
  - `Episode.sourceMetadataJson` → `EpisodeManifest.sourceMetadata`
  - Удалены enum'ы `AnimeSource` и `AgeRating` из схемы

### Added

- **AnimeManifest расширен:** добавлены поля `nextEpisodeAt`, `id`/`slug` в жанрах/темах
- **Генератор манифестов:** читает `description`, `ageRating`, `duration`, `licensor`, `nextEpisodeAt` из Shikimori API вместо БД

### Changed

- **EncodingInfoDialog** — компонент остался в коде но больше не отображается (encoding info теперь в IPFS manifest)
- **library-publisher:** `size` в PublishedEpisode всегда `0` (transcodedSize удалён из Episode)
- **ActivityPub actor:** `totalSize` статистики всегда `0`

## [0.28.20] - 2026-02-22

### Changed

- **Дефолтный битрейт аудио: 256 → 192 kbps** — `MAX_TARGET_BITRATE`, `DEFAULT_BITRATE`, `defaultAudioOptions.bitrate`, `defaultAudioVBROptions.targetBitrate` снижены до 192 kbps. Граничное значение `skip/transcode` в `getAudioRecommendation` изменено с 256 kbps на 192 kbps.
- **Дефолтный VMAF: 94 → 95** — `DEFAULT_TARGET_VMAF` в `use-encoding-settings.ts` изменён с 94 на 95 для лучшего качества по умолчанию.

## [0.28.19] - 2026-02-22

### Fixed

- **Прогресс-бар зависал во время постпроцессинга:** при переходе из фазы транскодинга в постпроцессинг `item.progress` застревал на 100% до завершения всех эпизодов. Теперь диапазон 0–90% отведён транскодингу, а 90–100% — постпроцессингу. Прогресс плавно растёт с каждым завершённым эпизодом через новый `useEffect`, следящий за `importFlow.currentFile / importFlow.totalFiles`.

## [0.28.18] - 2026-02-22

### Added

- **metadata.json в IPFS:** файл `metadata.json` (результат ffprobe) теперь загружается в IPFS сразу после demux, локальная копия удаляется. CID сохраняется в поле `metadataCid`, компактный JSON контейнера и тегов — в `sourceMetadataJson`.
- **Метаданные исходника в EncodingInfoDialog:** новая секция "Метаданные исходника" отображает формат контейнера, теги (title, encoder) и копируемый CID metadata.json.
- **Гранулярный прогресс скриншотов:** в `generateScreenshots()` добавлен callback `onProgress(current, total)`, который вызывается после каждого кадра. UI отображает "Серия N — превью M/5..." в реальном времени.

### Fixed

- **Размер видеодорожки не сохранялся при отсутствии bitrate:** `DemuxedVideo.size` (реальный размер демуксированного файла) теперь используется как приоритетный источник. Fallback через `bitrate × duration` срабатывает только если `size` отсутствует.
- **Медленная генерация скриншотов/спрайта из AV1:** `generateScreenshots()` и `generateThumbnailSprite()` переключены с `videoOutputPath` (транскодированный WebM, seek в AV1 катастрофически медленный) на `sourcePath` (оригинальный MKV, H.264/H.265, seek мгновенный).

## [0.28.17] - 2026-02-22

### Fixed

- **Кнопка "Пропустить эндинг" появлялась с задержкой ~5 секунд:** алгоритм аудиофингерпринтинга (Chromaprint) требует несколько секунд стабильных совпадений прежде чем зафиксировать начало сегмента, из-за чего сохранённый `startMs` был ~5 сек позже реального начала эндинга. Исправлено: добавлена константа `DETECTION_LEAD_SEC = 5` в `intro-detector.ts`, результирующие тайм-коды уменьшаются на 5 сек (с зажимом `Math.max(0, ...)`).
- **Внешние субтитры и аудио сканировались даже при импорте одиночного файла:** при выборе отдельного файла (не папки) в мастере импорта флаг `isFileMode` теперь передаётся через всю цепочку (`ImportQueueEntry` → `ImportOptions` → `import-processor`) и пропускает `scanExternalSubtitles`.
- **Автоопределение OP/ED не запускалось для аниме с обычными MKV-главами:** `createChapters()` ранее возвращала `true` для любых глав (включая "Chapter 1", "Chapter 2"), добавляя все эпизоды в список "с главами" и блокируя фингерпринтинг. Теперь возвращает `true` только если найдены главы типа OP/ED/RECAP/PREVIEW (признак `skippable`).

## [0.28.16] - 2026-02-22

### Added

- **Автоматическое удаление локальных папок после IPFS-загрузки:** после завершения постобработки каждого эпизода удаляется `outputDir` (папка с видео, аудио, субтитрами, шрифтами — всё уже в IPFS). После обработки всех эпизодов удаляется корневая папка аниме (включая `anime.meta.json`, `poster.webp` и пустые папки сезонов).
- **Просмотр библиотеки подписки:** страница подписки (`/subscriptions/[id]`) теперь показывает содержимое библиотеки подписчика с аниме и эпизодами. Отображается CID манифеста для каждого эпизода.

### Fixed

- **Хардкод порта 8765 для IPFS gateway:** порт gateway теперь берётся из `gatewayStatus()` вместо константы 8765. Исправляет доступ к видео если IPFS gateway запустился на другом порту.

## [0.28.15] - 2026-02-16

### Fixed

- **Прогресс энкода обновляется слишком редко:** убран renderer-side throttle в ImportQueueProcessor, который обновлял UI только при изменении общего % на ≥1 (с 3 эпизодами это ~3-4% на эпизод). Теперь каждое обновление прогресса передаётся в UI без фильтрации. Batch-обновления useImportQueue (100мс) достаточны для защиты от флуда.
- **Общий прогресс-бар не учитывал текущий элемент:** прогресс-бар в ImportQueueView считал только полностью завершённые items. Теперь включает прогресс текущего элемента для плавного обновления.
- **fpcalc не включался в production сборку:** Chromaprint (fpcalc.exe) отсутствовал в electron-builder.yml extraResources. Добавлен для Windows и Linux. Определение OP/ED теперь работает в установленном приложении.
- **Кнопка "Выбрать файл" в импорте не работала:** `dialog.selectFile` возвращает `string | null` (preload unwrap), но код ожидал `{ success, data }` — `result.data` всегда `undefined`. Исправлен парсинг результата.

## [0.28.14] - 2026-02-16

### Fixed

- **SQLite блокировка при одновременном просмотре и импорте:** включён WAL mode (Write-Ahead Logging) для конкурентного доступа к БД. Добавлены PRAGMA `busy_timeout = 15s` и `synchronous = NORMAL`. Операции записи прогресса просмотра (watchProgress.upsert) обёрнуты в retry с экспоненциальным backoff (до 5 попыток). Исправлено в обоих процессах: main (mobile server, P2P sync) и renderer (server actions).

## [0.28.13] - 2026-02-14

### Added

- **Тип субтитров (полные/надписи/песни):** при импорте можно выбрать тип субтитра — полный перевод, надписи (signs) или песни (songs/karaoke). Тип автоматически определяется по имени папки (`надписи/`, `signs/`) или суффиксу файла (`.надписи.ass`). Добавлен UI-селект в TrackGroupEditor с batch-редактированием через "Ко всем".
- **Извлечение команды из имени папки субтитров:** при импорте из папки вида `RUS Subs [Yakusub Studio]` имя команды "Yakusub Studio" автоматически извлекается из квадратных скобок и устанавливается как dubGroup для всех субтитров в этой папке.
- **Совместимость с Prisma 7:** создан `prisma.config.ts`, обновлены все Prisma таргеты в `project.json` (убран устаревший `--schema`, добавлен `cwd`), исправлен `db.ts` (замена `datasources` на env `DATABASE_URL`).

## [0.28.12] - 2026-02-02

### Fixed

- **Файловый плеер: ползунок громкости показывал 0 при работающем аудио:** при использовании внешней аудиодорожки через TrackSelector, слайдер громкости некорректно показывал 0 (потому что `video.muted = true` для синхронизации). Добавлен проп `externalAudioManaged` для VideoPlayer.
- **Файловый плеер: дропдаун выбора дорожек не видно в полноэкранном режиме:** Portal рендерился в `document.body` вне fullscreen контейнера. Создан `PlayerContext` для передачи containerRef, TrackSelector теперь использует контекст плеера для Portal.
- **Навигация не работала во время воспроизведения видео:** клики на ссылки в Sidebar и "На главную" регистрировались, но роутер не переходил. Причина: Next.js soft navigation (Link/router.push) конфликтует с Electron при активном видео. Решение: создан хелпер `navigateTo()` использующий hard navigation (`window.location.href`) для надёжной работы.
- **Зависание кодирования на 100%:** FFmpeg процесс мог завершиться без события `close`, оставляя задачу в бесконечном ожидании. Добавлен watchdog в VideoPool:
  - Проверка каждые 30 секунд всех запущенных задач
  - Автоматическое обнаружение завершённых процессов без события close
  - Автоматический fail задач без прогресса более 5 минут

## [0.28.11] - 2026-02-02

### Fixed

- **GPU кодирование не включалось после отключения в настройках:** исправлена логика CPU fallback в VideoPool. Теперь при включении GPU обратно в настройках, CPU fallback сбрасывается корректно (если причина была `settings`, а не NVENC crash). Добавлено отслеживание причины CPU fallback (`cpuFallbackReason`: crash, settings, vmaf).

## [0.28.10] - 2026-01-31

### Fixed

- **Ошибка "TypeError: terminated" при закрытии приложения:** добавлены глобальные обработчики `uncaughtException` и `unhandledRejection` для graceful обработки сетевых ошибок от undici (внутренний HTTP клиент Node.js).
- **Улучшена обработка ошибок в HTTP клиентах:**
  - `webfinger.ts` — исправлено `clearTimeout` вынесено в `finally` блок
  - `tracker-client.ts` — добавлена обработка `terminated` ошибки
  - `shikimori/client.ts` — добавлена обработка `terminated` ошибки

## [0.28.9] - 2026-01-30

### Changed

- **Полная миграция поиска с FTS5 на Fuse.js:** клиентский поиск аниме теперь работает через Fuse.js вместо SQLite FTS5. Преимущества:
  - Fuzzy matching — поиск с опечатками
  - Мгновенный отклик (~1ms vs ~10ms)
  - Работает offline (данные в TanStack Query кэше)
  - Упрощает миграции БД (FTS5 несовместим с Prisma)
- **db:template теперь использует `db push`:** после удаления FTS5 можно использовать стандартную команду вместо workaround через `migrate reset`.
- **Чистая init миграция:** все старые миграции удалены, создана единая init миграция без FTS5.

### Added

- **SearchProvider:** новый провайдер для клиентского поиска через Fuse.js с интеграцией TanStack Query.
- **useSearch / useSearchIds:** хуки для поиска с debounce и русским стеммингом.
- **getSearchableAnime():** Server Action для загрузки данных поиска с pre-computed стеммированными названиями.

### Removed

- **FTS5 Full-Text Search:** удалены виртуальные таблицы `anime_fts` и связанные триггеры.
- **Старые миграции:** 18 миграций объединены в одну init.

### Deprecated

- `quickSearchAnime()`, `searchAnimeIds()` — FTS5 функции оставлены для обратной совместимости, но рекомендуется использовать новые хуки.

## [0.28.8] - 2026-01-30

### Fixed

- **Ошибка "column folderPath does not exist":** добавлена миграция для поля `Episode.folderPath`, которое отсутствовало в БД. Исправлен импорт аниме.

## [0.28.5] - 2026-01-26

### Fixed

- **Пути не отображались в настройках библиотеки:** исправлен preload.ts — все IPC методы, обёрнутые через `createHandler`, возвращали `{success, data}`, но preload не разворачивал этот формат. Теперь секции `app`, `window`, `dialog` и `updater` корректно unwrap'ят результаты.
- **"Загрузка..." вместо путей:** `app.getPath()`, `dialog.selectFolder()` и другие методы теперь возвращают данные напрямую, а не объекты `{success, data}`.
- **Версия приложения не отображалась:** `updater.getVersion()` и `updater.getStatus()` также исправлены.

## [0.28.4] - 2026-01-26

### Added

- **Сохранение настроек дорожек в IPFS манифест:** язык и группа озвучки (dubGroup), выбранные при импорте, теперь записываются в EpisodeManifest и доступны при раздаче через IPFS.
- **Тип TrackOverride:** новый тип для передачи переопределений дорожек из UI в генератор манифеста.
- **Поле dubGroup:** добавлено в ManifestAudioTrack и ManifestSubtitleTrack.

## [0.28.3] - 2026-01-26

### Fixed

- **Franchise tab crash:** исправлена ошибка "Cannot read properties of null (reading 'nodes')" при отображении таба франшизы для аниме без данных графа.

## [0.28.2] - 2026-01-26

### Changed

- **PreviewStep UI:** разделён на две вкладки "Дорожки" (по умолчанию) и "Кодирование" для лучшей организации интерфейса.

## [0.28.1] - 2026-01-26

### Fixed

- **Языковые селекты не предзаполнялись:** FFprobe возвращает ISO 639-2 коды (`rus`, `jpn`, `eng`), а селект использовал ISO 639-1 (`ru`, `ja`, `en`). Добавлен маппинг ISO 639-2 → ISO 639-1 для корректной работы селектов.
- **Badge языка показывал "JPN" вместо "🇯🇵 JA":** добавлена функция `formatLanguageShort()` для короткого формата с флагом.

### Added

- **Расширенный список языков:** добавлены немецкий, французский, испанский, итальянский, китайский, корейский, португальский, польский.
- **Функции нормализации языков:** `normalizeLanguageCode()`, `formatLanguageShort()` в `dub-groups.ts`.

## [0.28.0] - 2026-01-26

### Added

- **AnimeManifest из Shikimori API:** генератор манифестов теперь загружает расширенные данные из Shikimori API (студии, персонал, персонажи, внешние ссылки, скриншоты, видео).
- **World-Art и Кинопоиск ID:** добавлены в `AnimeManifestExternalIds`.
- **Logger `{ full: true }`:** опция для вывода полных стектрейсов без обрезки (100 символов).
- **Стадии импорта:** добавлены `syncing_relations` и `generating_manifests` для отслеживания прогресса.
- **Правило animatrona-db.md:** документация по работе с SQLite базой данных.

### Changed

- **Build memory limit:** увеличен лимит памяти Node.js для сборки до 8GB (`NODE_OPTIONS=--max-old-space-size=8192`).
- **Updater logging:** логгер `electron-updater` теперь перенаправлен через централизованный logger.

### Fixed

- **Next.js stderr logging:** использует `{ full: true }` для полного вывода ошибок.

---

Продолжение в [CHANGELOG_2026_01_26.md](./CHANGELOG_2026_01_26.md) (версии 0.20.0 — 0.27.2)

**Архив:** Версии 0.1.0 — 0.19.x см. в [CHANGELOG-v0.md](./CHANGELOG-v0.md)
