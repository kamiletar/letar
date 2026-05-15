# Changelog (Архив до 2026-01-26)

> Продолжение основного CHANGELOG.md
> Версии: 0.20.0 — 0.27.2 + [Unreleased]

## [Unreleased]

### Changed

- **Phase 7: IPFS-Only Architecture:**
  - Удалены path поля из схемы (`transcodedPath`, `manifestPath`, etc.)
  - Удалён enum `IpfsMigrationStatus` — миграция завершена
  - Удалён UI миграции (`IpfsMigrationCard`)
  - `media-url.ts` упрощён до работы только с CID
  - Транскодирование теперь сразу загружает в IPFS (IPFS-First)

### Fixed

- **ESLint errors в mock модулях:**
  - `node-datachannel.ts` — добавлены комментарии в пустые mock функции
  - `friend-code-manager.ts` — eslint-disable для singleton constructor

### Refactored

- **Декомпозиция монолитных файлов (Phase 3):**
  - `ExportSeriesDialog.tsx` (1293 → 64 строки)
    - Хук `use-export-dialog-state.ts` (578 строк) — вся логика
    - Секции: `ExportConfigStep`, `ExportProgressStep`, `ExportResultStep`
  - `import-processor.ts` — process() метод (~480 → ~100 строк)
    - Приватные методы: `loadEncodingProfile()`, `prepareAnimeFolder()`, `createAnimeRecord()` и др.
  - `P2PSharingCard.tsx` (1018 → 120 строк)
    - Секции: `IpfsStatusSection`, `PublishingSection`, `SubscriptionsSection`, `SchedulerSection`, `RemotePinningSection`
    - Утилиты: `format-utils.ts`
  - `library/page.tsx` (811 → 274 строки)
    - Хук `use-library-page.ts` — state, фильтры, handlers
    - Компоненты: `FranchiseView`, `groupAnimeByFranchise()`
    - Типы: `types.ts`
  - `use-p2p-sharing.ts` (710 → 150 строк)
    - Доменные хуки: `use-ipfs`, `use-publisher`, `use-subscriptions`, `use-scheduler`, `use-remote-pin`
    - Типы: `p2p-sharing/types.ts`
  - **Итого:** ~4900 строк → ~1200 строк в основных файлах

- **Централизованный Logger — миграция console.log/warn/error:**
  - Мигрировано ~476 console вызовов на структурированный logger
  - 60+ файлов: services, IPC handlers, utils, protocols
  - `createModuleLogger('Name')` для контекстных префиксов
  - Уровни: debug, info, warn, error с фильтрацией
  - Структурированные метаданные вместо конкатенации строк

- **IPC Handler Factory — DRY оптимизация:**
  - Новый модуль `ipc-handler-factory.ts` для устранения boilerplate
  - `createHandler()` — автоматическая обработка ошибок и логирование
  - `createHandlers()` — batch создание handlers с общим префиксом
  - `broadcastToWindows()`, `forwardEvent()` — утилиты для событий
  - `createThrottledBroadcaster()` — throttled broadcast для progress событий
  - `createQueueHandlers()` — фабрика для стандартных queue handlers
  - Миграция всех 37 handler файлов на новый API
  - Удалено ~4600 строк дублирующегося кода

- **CacheManager утилита:**
  - Универсальный класс кеша с TTL и защитой от параллельных вычислений
  - `SingleValueCache` для простых случаев
  - Используется в `app.handlers.ts` для кеша размера библиотеки

- **Централизованные file-filters:**
  - `main/constants/file-filters.ts` — VIDEO, AUDIO, SUBTITLE, MKV_EXPORT, FONT, IMAGE
  - Используется в `dialog.handlers.ts`

### Added

- **Phase 9: OrbitDB — Распределённая P2P база данных:**
  - **Watch Progress Sync (9.1):**
    - `WatchProgressDB` — KeyValue база для синхронизации прогресса просмотра
    - Автосинхронизация между устройствами через P2P
    - Last-write-wins conflict resolution по `updatedAt`
    - IPC handlers и хук `useWatchProgress`

  - **Profile + Friend Code (9.5.A):**
    - `UserProfileDB` — локальный профиль с PeerId, displayName, avatarSeed
    - `FriendCodeManager` — генерация читаемых кодов друзей (XXXX-XXXX)
    - SHA256 хеш PeerId → 8-символьный код
    - Страница профиля в Settings

  - **Friend List (9.5.B):**
    - `FriendRequestsDB` — Documents база для запросов в друзья
    - Send/Accept/Reject flow для запросов
    - Список друзей с блокировкой
    - UI компоненты: `FriendsList`, `FriendCard`, `AddFriendDialog`
    - Хуки: `useFriends`, `useFriendRequests`

  - **Presence System (9.5.C):**
    - `PresenceService` — онлайн-статусы через GossipSub
    - Topic: `/animatrona/presence/<peer-id>`
    - Статусы: online, watching (что смотрит), away, offline
    - Хук `useFriendPresence` для UI

  - **Watch Party (9.5.D):**
    - `WatchPartyDB` — комнаты для совместного просмотра
    - Sync playback через GossipSub
    - Участники с ролями (host, viewer)
    - `SyncIndicator` — показ отставания/опережения
    - `ParticipantsPanel` — список участников
    - Страница `/party/[roomId]`

  - **Chat + Reactions (9.5.E):**
    - Chat в Watch Party (Events database)
    - Реакции: ❤️ 😂 😮 😢 🔥 👏
    - `ChatPanel` с автоскроллом и unread counter
    - Хуки: `useWatchParty`, `usePartyChat`

  - **Invites + Deep Links (9.5.F):**
    - `DeepLinkService` — обработка animatrona:// URL
    - Кастомный протокол для Windows/Linux + macOS
    - Deep links: `animatrona://party/join/<roomId>`, `animatrona://friend/add/<code>`
    - System notifications для приглашений
    - Single instance handling (второй запуск передаёт URL первому)
    - Хук `useDeepLink`

### Technical

- OrbitDB @orbitdb/core интеграция с существующим Helia
- GossipSub pubsub для real-time синхронизации
- IPC handlers для всех OrbitDB операций
- Preload API с типами в electron.d.ts
- React hooks для renderer process

### Fixed

- **IPFS Storage Size:** Размер хранилища теперь корректно рассчитывается рекурсивно
- **Library Publisher:** Исправлена проверка мигрированных эпизодов (учитывается `ipfsMigrationStatus` + CID)
- **Migration Service:** Эпизоды помечаются как MIGRATED только при наличии `transcodedCid`
- **Traffic Stats:** Удалён нерабочий код трекинга трафика libp2p (требует @libp2p/simple-metrics)

## [0.27.2] - 2026-01-25

### Fixed

- **Метрики трафика в P2P Sharing UI:** исправлена конфигурация `@libp2p/simple-metrics` — перемещён из `services` в top-level `metrics` option согласно документации libp2p. Теперь входящий/исходящий трафик корректно отображается.
- **WatchPartyDB shutdown:** исправлены вызовы несуществующих методов `isInitialized()`/`shutdown()` на `isReady()`/`close()`.

### Added

- **Интеграция HeliaService → StatsTracker:** метрики трафика libp2p теперь передаются в StatsTracker для персистентного хранения статистики (репутация, достижения, бонусы).

## [0.26.0] - 2026-01-23

### Added

- **IPFS Primary Storage Migration (Phase 1-5):**
  - Новая архитектура хранения — транскодированные файлы загружаются в IPFS
  - CID поля в схеме: `transcodedCid`, `manifestCid`, `thumbnailCids`, `screenshotCids` для Episode
  - CID поля для дорожек: `AudioTrack.transcodedCid`, `SubtitleTrack.fileCid`, `SubtitleFont.fileCid`
  - Enum `IpfsMigrationStatus` для отслеживания статуса миграции эпизодов

- **UI миграции библиотеки:**
  - Новая карточка `IpfsMigrationCard` в Настройки → P2P
  - Оценка объёма миграции (количество эпизодов, размер, уже мигрировано)
  - Прогресс миграции в реальном времени
  - Управление: Старт/Пауза/Возобновление/Отмена
  - Опции: удаление локальных файлов после миграции, верификация перед удалением

- **Migration Service:**
  - `MigrationService` — singleton для управления миграцией
  - `VerificationService` — проверка доступности CID через IPFS Gateway
  - `CleanupService` — удаление локальных файлов после успешной миграции
  - Поддержка batch миграции с прогрессом

### Changed

- **Player Integration:**
  - Плеер автоматически использует IPFS Gateway для воспроизведения (CID приоритет > локальный путь)
  - `getVideoUrl()`, `getAudioUrl()`, `getSubtitleUrl()`, `getFontUrl()` — утилиты с поддержкой IPFS
  - Shaka Player корректно воспроизводит HTTP URLs от Gateway (поддержка Range requests)

- **Export Integration:**
  - `ExportManager` поддерживает гибридные источники (IPFS + локальные)
  - Video/Audio — напрямую через IPFS Gateway (FFmpeg -i поддерживает HTTP URLs)
  - Fonts/Poster — скачиваются во временные файлы (FFmpeg -attach требует локальные)
  - `TempFileManager` — управление временными файлами при экспорте

### Technical

- IPC handlers: `ipfs-migration:estimate`, `ipfs-migration:start`, `ipfs-migration:pause`, `ipfs-migration:resume`, `ipfs-migration:cancel`, `ipfs-migration:progress`, `ipfs-migration:status`
- Хук `useIpfsMigration()` для UI состояния миграции
- IPFS Gateway на порту 8765 с поддержкой Range requests

### Migration Notes

⚠️ **Это промежуточный релиз.** После миграции библиотеки в IPFS и подтверждения работоспособности, в следующем релизе (v0.27.0) будут удалены локальные path поля, и приложение перейдёт на IPFS-only архитектуру.

## [0.21.16] - 2026-01-23

### Fixed

- **Сборка Windows (Out of Memory ошибки):**
  - Исправлены Out of Memory ошибки при сборке electron-builder
  - Удалено копирование `standalone/node_modules` из electron-builder.yml (причина OOM)
  - Исправлен путь к `ntsuspend` для структуры пакетов Bun
  - Удалены ссылки на несуществующий `kysely-generic-sqlite`

### Infrastructure

- **Nx monorepo dependency management:**
  - Удалены все зависимости из `apps/animatrona/package.json`
  - Все зависимости перенесены в корневой `package.json` (Nx monorepo best practice)
  - Установлены build tools в корень: `webpack`, `webpack-cli`, `ts-loader`
  - Установлены runtime зависимости в корень: `uuid`, `electron-updater`

## [0.21.15] - 2026-01-22

### Fixed

- **Контраст текста в уведомлении об окончании экспорта:**
  - Улучшена читаемость текста в тостах экспорта
  - Корректная цветовая схема для светлой и тёмной тем
- **Открытие папки после экспорта:**
  - Исправлена работа опции "Открыть папку после экспорта"
  - Папка с экспортированными файлами теперь автоматически открывается при установленной галочке

### Infrastructure

- **Автоматизация релизов:**
  - Добавлен скрипт `bump-version.ts` для управления версиями
  - GitHub Actions workflow для сборки всех платформ (Windows, macOS, Linux)
  - Автоматическая публикация в kamiletar/animatrona (Open Source)
  - Instant revalidation кэша лендинга после релиза

## [0.21.14] - 2026-01-22

### Fixed

- **Drag & Drop импорт папок в библиотеку:**
  - Исправлена проблема с недоступностью `file.path` в Electron renderer
  - Теперь используется `window.electronAPI.fs.getPathForFile()` через preload API
  - Корректно работает с `contextIsolation: true`

## [0.21.13] - 2026-01-17

### Added

- **Смена статуса просмотра в карточках библиотеки:**
  - Добавлено подменю статуса в quick-actions меню карточек аниме
  - Позволяет менять статус (Смотрю/Отложено/Просмотрено...) прямо из сетки
  - Бейдж статуса на карточке обновляется сразу после изменения

### Refactored

- **WatchStatusSubmenu** — выделен общий компонент подменю статуса
  - Используется в `ActionMenu` (страница деталей) и `AnimeCard` (библиотека)
  - Удалена дупликация `WATCH_STATUS_CONFIG` из ActionMenu

### Technical

- `WatchStatusSubmenu.tsx` — новый переиспользуемый компонент
- `AnimeCard.tsx` — добавлен prop `onWatchStatusChange`
- `AnimeGrid.tsx` — проброс callback в карточки
- `page.tsx` — обработчик `handleWatchStatusChange` с инвалидацией кэша

## [0.21.11] - 2026-01-16

### Fixed

- **Ctrl+I не открывал визард импорта:**
  - `onImport` колбэк не был передан в `useGlobalShortcuts`
  - Теперь Ctrl+I корректно открывает визард импорта видео

## [0.21.10] - 2026-01-16

### Fixed

- **Группировка по франшизам при активных фильтрах:**
  - При включении фильтра (напр. по статусу просмотра) аниме из той же франшизы, но не прошедшие фильтр, больше не показываются как "Не импортировано"
  - Добавлен отдельный запрос для получения всех shikimoriId загруженных аниме (без фильтров)
  - `groupAnimeByFranchise()` теперь корректно определяет missing аниме

### Technical

- `page.tsx` — новый запрос `useFindManyAnime({ select: { shikimoriId: true } })`
- `allLoadedShikimoriIds` — useMemo Set всех загруженных shikimoriId
- `groupAnimeByFranchise(animes, allLoadedShikimoriIds)` — новая сигнатура

## [0.21.9] - 2026-01-16

### Added

- **Сохранение фильтров библиотеки при навигации:**
  - Фильтры автоматически сохраняются в sessionStorage
  - При возврате на страницу библиотеки фильтры восстанавливаются
  - Сброс фильтров очищает и sessionStorage

### Technical

- `useFilterParams.ts` — добавлены useEffect для сохранения/восстановления
- `FILTERS_STORAGE_KEY` = `animatrona:library:filters`
- Восстановление только если URL пустой (приоритет URL над sessionStorage)

## [0.21.8] - 2026-01-16

### Added

- **Управление статусом просмотра:**
  - Подменю в ActionMenu для смены статуса (Смотрю, Просмотрено, Отложено, Брошено, Запланировано)
  - Badge текущего статуса на странице детализации аниме (AnimeHero)
  - Цветовая индикация: синий (Смотрю), зелёный (Просмотрено), жёлтый (Отложено), красный (Брошено), фиолетовый (Запланировано)

### Technical

- `ActionMenu.tsx` — вложенное подменю с `Menu.TriggerItem` и иконками статусов
- `AnimeHero.tsx` — Badge с `watchStatusLabels` (label, color, icon)
- `page.tsx` — `handleWatchStatusChange` callback с `useUpdateAnime` мутацией

## [0.21.7] - 2026-01-16

### Fixed

- **Фильтр озвучек показывает только локальные озвучки:**
  - Заменён источник данных с `Fandubber` (Shikimori API) на `AudioTrack.dubGroup` (локальные файлы)
  - Новая server action `getLocalDubGroups()` возвращает уникальные dub groups из аудиодорожек
  - Фильтрация ищет через `episodes.audioTracks.dubGroup` вместо связи с Fandubber

### Technical

- `useAvailableFandubbers()` → `useLocalDubGroups()` — переименован хук
- Query key изменён на `localDubGroups` для правильного кэширования
- Prisma distinct query для получения уникальных значений `dubGroup`

## [0.21.6] - 2026-01-16

### Fixed

- **Восстановление постеров при Library Restore:**
  - Добавлен IPC handler `fs:getImageMetadata` для получения размеров и blur placeholder
  - `RestoreLibraryCard` теперь восстанавливает постеры с привязкой `posterId`
  - Приоритет: локальный постер → скачивание из Shikimori
  - Создаётся запись `File` с полными метаданными (width, height, blurDataURL)

### Technical

- `fs.getImageMetadata()` использует `nativeImage` для анализа изображений
- Blur placeholder генерируется как 10x10px JPEG в base64
- `upsertFile()` server action для создания/обновления записи File

## [0.21.5] - 2026-01-16

### Fixed

- **Import Queue: исправлен запуск транскодирования для статуса 'preparing':**
  - `processNext()` теперь вызывает `emitStateChanged()` после `updateItemStatus()`
  - Renderer получает актуальный `currentId` и видит `currentItem.status === 'preparing'`
  - `ImportQueueProcessor.tsx` корректно запускает обработку импорта

### Technical

- Проблема: `onItemStatus` обновлял только статус item, но не `currentId`
- Решение: `emitStateChanged()` отправляет полное состояние включая `currentId`
- Renderer деривирует `currentItem` из `items.find(i => i.id === currentId)`

## [0.21.4] - 2026-01-16

### Removed

- **Удалён мёртвый код в main/ директории:**
  - `main/preload/index.ts` — старый preload, заменён на `main/preload.ts`
  - `main/src/index.ts` — старый entry point, webpack использует `main/background.ts`
  - `main/src/services/` — дубликаты `main/services/` (4 файла)

### Technical

- Webpack entry points: `main/background.ts` и `main/preload.ts` (не `main/src/` и `main/preload/`)
- Живой код в `main/src/`: `ffmpeg/`, `utils/` — используются IPC handlers

## [0.21.3] - 2026-01-16

### Added

- **Определение языка аудио из имени файла/папки:**
  - Паттерны для ru, en, ja, uk, zh, ko
  - Анализирует имя файла и 2 родительские папки
  - Распознаёт: `[RUS]`, `(eng)`, `.jap.`, `_ukr_`, `Rus Sound/`, `Rus Dub/`

- **Навигация назад в AddTracksWizard:**
  - Кнопка "Назад" работает на шагах Сопоставление → Калибровка → Выбор дорожек
  - `goBack()` в `useAddTracksFlow` для управления навигацией

- **CommandPalette: инструкция для обновления метаданных:**
  - Команда `action:refresh-metadata` показывает toaster с инструкцией
  - "Откройте страницу аниме → меню ⋮ → Обновить метаданные"

### Technical

- `media-analyzer.ts` — `LANGUAGE_PATTERNS` и `detectLanguageFromPath()`
- `use-add-tracks-flow.ts` — `goBack()` для навигации между шагами wizard
- `AddTracksWizardDialog.tsx` — интеграция `goBack()` в `handleBack()`
- `CommandPalette.tsx` — реализация `action:refresh-metadata` через toaster

## [0.21.2] - 2026-01-16

### Added

- **Постеры в UpNextOverlay и CompletionOverlay:**
  - UpNextOverlay показывает thumbnail следующего эпизода
  - CompletionOverlay показывает постер аниме
  - Добавлено `thumbnailPaths` в `EpisodeNavInfo` для навигации

### Technical

- `use-episode-navigation.ts` — добавлен `thumbnailPaths` в select
- `use-up-next.ts` — `getFirstThumbnail()` извлекает первый thumbnail из JSON
- `page.tsx` — добавлен `poster` в anime select для CompletionOverlay
- `types.ts` — расширен тип `EpisodeNavInfo` и `EpisodeWithTracks.anime`

## [0.21.1] - 2026-01-16

### Added

- **UpNextOverlay показывает сиквел при последнем эпизоде:**
  - За 30 секунд до конца последнего эпизода показывается карточка сиквела
  - Фиолетовая тема для отличия от обычных эпизодов (синие)
  - Кнопка "Смотреть сиквел" → переход к первому эпизоду сиквела
  - Автопереход работает как для эпизодов

### Fixed

- **FranchiseTab корректно обрабатывает отсутствие франшизы:**
  - Теперь показывает "Это аниме не является частью франшизы" вместо ошибки
  - Различает ошибку API и отсутствие связей на Shikimori

### Technical

- `use-up-next.ts` — загрузка сиквела через `getSequelSuggestion()` при `isLastEpisode`
- `UpNextOverlay.tsx` — `contentStyles` для визуального различия episode/sequel
- `semanticTokens/colors.ts` — токены `upNext.episode.*` и `upNext.sequel.*`
- `FranchiseTab.tsx` — состояние `noFranchise` для `success: true, data: null`

## [0.21.0] - 2026-01-16

### Added

- **Номер сезона франшизы при экспорте:**
  - `{ss}` в паттерне именования теперь использует порядок во франшизе
  - "Attack on Titan 2" → `S02E01` (не `S01E01`)
  - Порядок вычисляется топологической сортировкой по sequel/prequel связям
  - Preview в диалоге показывает корректный номер сезона

### Technical

- `computeChronologicalOrder()` — утилита для вычисления порядка просмотра
- `getFranchiseSeasonNumber()` — получение номера сезона по shikimoriId
- `ExportSeriesDialog` — загрузка графа и использование `franchiseSeasonNumber`
- Рефакторинг `useFranchiseGraph` для использования общей функции

## [0.20.1] - 2026-01-11

### Fixed

- **Группировка франшиз:**
  - Исправлен баг где каждое аниме создавало свою "франшизу" вместо общей
  - Теперь используется корректный `franchise` ID из Shikimori API
  - Сезоны одного аниме ("Кулинарные скитания 1" и "2") правильно группируются

### Changed

- **Консолидация кнопки "Обновить метаданные":**
  - Теперь одна кнопка обновляет: метаданные, связи и привязку к франшизе
  - Убраны лишние кнопки обновления

- **Панель поиска в очереди:**
  - Перемещена из шапки над активным элементом в секцию "Ожидают"
  - Скрывается если в очереди менее 4 элементов

### Technical

- `ShikimoriAnimeWithRelated` — добавлено поле `franchise`
- GraphQL запрос `GET_ANIME_WITH_RELATED_QUERY` — добавлено поле `franchise`
- `franchise.handlers.ts` — возвращает franchise ID в sourceAnime
- `import-processor.ts` — использует `sourceAnime.franchise` вместо `shikimoriId`

## [0.20.0] - 2026-01-11

### Added

- **Расширенные метаданные Shikimori:**
  - Возрастной рейтинг (G, PG, PG-13, R-17, R+, RX) с бейджем в AnimeHero
  - Первоисточник (Манга, Ранобэ, Оригинал, VN, Игра) с бейджем
  - Длительность эпизода (~24 мин) в метаданных
  - Лицензиат (licensor) для РФ
  - Английское название (nameEn)

- **Разделение жанров и тем:**
  - Shikimori genres теперь разделяются по полю `kind` ('genre' или 'theme')
  - Темы сохраняются в отдельную модель Theme
  - Жанры и темы отображаются вместе в AnimeHero

- **Субтитры (fansubbers):**
  - Отображение в AnimeMetadataSection аналогично озвучкам
  - Синие бейджи для визуального отличия от озвучек

### Changed

- Модель Genre теперь имеет `shikimoriId` для синхронизации
- ShikimoriGenre тип расширен полем `kind`
- import-processor сохраняет расширенные метаданные при импорте

### Technical

- `saveGenresAndThemes()` — разделение и сохранение жанров/тем
- `generateSlug()` — транслитерация кириллицы для slug жанров
- `mapShikimoriAgeRating()`, `mapShikimoriSource()` — маппинг enum'ов

---

**Архив:** Версии 0.1.0 — 0.19.x см. в [CHANGELOG-v0.md](./CHANGELOG-v0.md)
