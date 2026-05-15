# Changelog v0.1.0 — v0.19.x (Архив)

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

> Актуальные изменения см. в [CHANGELOG.md](./CHANGELOG.md)
>
> Архивировано: 2026-01-25

---

## [0.19.0] - 2026-01-11

### Fixed

- **FTS5 регистронезависимый поиск:**
  - "фи" теперь находит "Фи Брейн" (Unicode lowercase)
  - Fallback на LOWER() для SQLite без FTS5
  - Исправлен fallback для QuickSearch и фильтров библиотеки

- **Кнопка поиска в хедере:**
  - Клик теперь эмулирует Ctrl+K через KeyboardEvent
  - Работает в любой раскладке (code: 'KeyK' вместо key: 'k')

- **Чип поиска в ActiveFilters:**
  - При вводе в поиск появляется чип "Поиск: ..."
  - Кнопка сброса для очистки поискового запроса

### Added

- **Только доступные жанры/студии/озвучка:**
  - `getAvailableGenres()`, `getAvailableStudios()`, `getAvailableFandubbers()`
  - Хуки `useAvailableGenres()`, `useAvailableStudios()`, `useAvailableFandubbers()`
  - Фильтры показывают только сущности, которые есть в библиотеке

- **Лейбл "Сортировка:":**
  - Добавлен текстовый лейбл перед селектом сортировки
  - Улучшена ясность интерфейса

### Technical

- `searchAnimeIds()` — FTS5 поиск для фильтров библиотеки (возвращает только ID)
- Raw SQL с LOWER() для регистронезависимого fallback в SQLite
- Исправлены типы для SQLite Prisma (убран mode: 'insensitive')

## [0.18.1] - 2026-01-11

### Added

- **Faceted Counts — счётчики результатов в фильтрах:**
  - Количество аниме рядом с каждым значением фильтра: "Выходит (12)"
  - Server action `getFilterCounts()` с groupBy запросами
  - Хук `useFilterCounts()` с кэшированием 30s
  - Поддержка в статусе, годе, статусе просмотра, качестве

- **URL Sync — сохранение фильтров в URL:**
  - Хук `useFilterParams()` для синхронизации с searchParams
  - Поддержка всех фильтров: `?status=ONGOING&year=2024&q=naruto`
  - Debounce для поиска (не спамит URL)
  - Возможность делиться ссылкой с фильтрами

- **FiltersSkeleton — skeleton loading для фильтров**

### Changed

- **Touch-friendly 44px targets:**
  - Все Select.Trigger имеют `minH="44px"`
  - Кнопки мобильных фильтров увеличены
  - Улучшена доступность на touch-устройствах

- **Индикаторы активности (•):**
  - Точка на активных dropdown'ах
  - Визуальное выделение (colorPalette="purple", variant="subtle")
  - Мгновенная индикация выбранных фильтров

### Technical

- `app/_actions/filter-counts.action.ts` — server action для faceted counts
- `components/library/AnimeFilters/hooks/useFilterParams.ts` — URL sync хук
- `components/library/AnimeFilters/FiltersSkeleton.tsx` — skeleton компонент
- Обновлены типы в `types.ts` с поддержкой counts

## [0.18.0] - 2026-01-11

### Changed

- **UI/UX Редизайн фильтров библиотеки:**

- **ActiveFilters — видимые активные фильтры:**
  - Чипсы (Tag) с категорией и значением
  - Кнопка × для удаления отдельного фильтра
  - Кнопка "Сбросить все" для очистки всех фильтров
  - Счётчик активных фильтров

- **QualityFilterGroup — объединённые фильтры качества:**
  - Разрешение (4K/1080p/720p) и битность (10-bit/8-bit) в одном Popover
  - Индикатор активности на кнопке (•)
  - Кнопка сброса внутри Popover

- **MobileFilterDrawer — bottom sheet для mobile:**
  - Все фильтры в удобном drawer
  - Счётчик активных фильтров в заголовке
  - Кнопка "Показать (N)" с количеством результатов
  - Touch-friendly интерфейс

- **Улучшения UX:**
  - Debounce поиска 250ms (предотвращает лаги)
  - Чёткие лейблы вместо "Любой", "Любое...", "Любая..."
  - Responsive design (desktop/mobile)

### Technical

- `components/library/AnimeFilters/` — папка с компонентами
- Интеграция debounce в `app/library/page.tsx`

## [0.17.0] - 2026-01-11

### Changed

- **UI/UX Редизайн страницы аниме (Netflix/Crunchyroll стиль):**

- **Hero Section:**
  - Размытый постер как background с gradient overlay
  - Постер с progress bar просмотра (% эпизодов)
  - Primary CTA "Продолжить Эп.X — XX:XX" с точным временем
  - Compact action menu (dropdown) вместо 5 вертикальных кнопок
  - Responsive дизайн (mobile/desktop)

- **Табы для контента:**
  - Эпизоды — default вкладка (сразу после hero!)
  - О сериале — описание + метаданные
  - Связанные — FranchiseTimeline + RelatedAnimeList
  - Видео — опенинги, эндинги, трейлеры
  - `lazyMount` для оптимизации

## [0.16.0] - 2026-01-11

### Added

- **Система Watch Next — рекомендации "Что смотреть дальше":**
- **UpNextOverlay (Фаза 1):** Оверлей за 30 секунд до конца эпизода
- **CompletionOverlay (Фаза 2):** Экран завершения аниме
- **WatchNextCard (Фаза 2):** Карточка в Sidebar
- **FranchiseTimeline (Фаза 3):** Визуальная timeline порядка просмотра

## [0.15.0] - 2026-01-11

### Added

- **Кастомный Frameless Title Bar (VSCode стиль)**

### Fixed

- **Иконка в таскбаре Windows:** Теперь отображается правильно

## [0.14.0] - 2026-01-11

### Added

- **Sprint 4: Export Improvements (v0.14)**
- Папка экспорта по умолчанию
- Умные паттерны именования (год в начале)
- Структура папок при экспорте

## [0.12.0] - 2026-01-11

### Added

- **Sprint 3: Polish & Accessibility (v0.12)**
- Visual Improvements (progress bar, glow, pulse)
- Performance Graphs (FPS sparkline)
- FFmpeg Log Viewer
- History View
- Accessibility (keyboard navigation, ARIA)

## [0.11.0] - 2026-01-11

### Changed

- **Архитектурное разделение данных backup системы:**
  - Релизные данные (в папке аниме) — можно распространять
  - Пользовательские данные (в `_user/`) — приватные

## [0.10.12] - 2026-01-11

- Блокировка сна монитора при воспроизведении видео

## [0.10.11] - 2026-01-11

- Блокировка спящего режима при транскодировании

## [0.10.10] - 2026-01-11

- Исправлена утечка памяти в renderer (4GB → <800MB)

## [0.10.9] - 2026-01-11

- Предупреждение о дубликате при импорте

## [0.10.8] - 2026-01-11

- VMAF карточка показывает полную историю итераций

## [0.10.7] - 2026-01-11

- Метаданные кодирования сохраняются в БД

## [0.10.6] - 2026-01-10

- Исправлена потеря VMAF карточки при навигации
- Исправлен OOM при VMAF кодировании

## [0.10.4] - 2026-01-10

- Исправлена ошибка 500 при навигации на /transcode

## [0.10.3] - 2026-01-10

- Исправлена передача CQ из VMAF в транскодер

## [0.10.2] - 2026-01-10

- Исправлена потеря внешних аудиодорожек при импорте

## [0.10.1] - 2026-01-10

- Страница настроек разделена на 4 вкладки

## [0.10.0] - 2026-01-10

### Changed

- **Архитектурный рефакторинг: энкод ВСЕГДА через очередь**

### Added

- Детальный прогресс в очереди импорта
- Сохранение настроек аудио/субтитров между эпизодами
- Отображение незагруженных аниме в группировке по франшизам

---

## [0.9.9] - 2026-01-10

### Fixed

- **Исправлено восстановление выбранной звуковой дорожки:**
  - Устранён race condition в `use-watch-progress.ts`
  - Ранее при "Продолжить смотреть" дорожка сбрасывалась на первую
  - Теперь ждём завершения загрузки `watchProgressData` перед восстановлением
  - Добавлена проверка `progressQueryLoading` в useEffect

### Added

- **Таб "Смотрел" на странице истории (/history):**
  - Третий таб рядом с "Библиотека" и "Папки"
  - Показывает все аниме с прогрессом просмотра (не эпизоды, а аниме целиком)
  - Агрегированные данные: просмотрено/всего эпизодов, прогресс в %
  - Отображение статуса просмотра (Смотрю, Просмотрено, Отложено, Брошено)
  - Пагинация с кнопкой "Загрузить ещё"
  - Новый Server Action `findWatchedAnime()` с агрегацией данных

## [0.9.8] - 2026-01-10

### Added

- **Ручное назначение номеров эпизодов при импорте:**
  - В шаге «Файлы» (FileScanStep) номер эпизода теперь редактируемый через select
  - Защита от дублирования: занятые номера отмечены и недоступны для выбора
  - Кнопка «Автонумерация» присваивает номера 1, 2, 3... по алфавитному порядку имён
  - Подсказка с количеством эпизодов из Shikimori
  - Файлы без распознанного номера теперь можно выбрать и назначить номер вручную
  - Изменено предупреждение: вместо «будут пропущены» → инструкция по ручному назначению

## [0.9.7] - 2026-01-10

### Fixed

- **Исправлен матчинг номеров эпизодов для fansub форматов:**
  - Формат `[Group] Title Season (Year) - XX [Quality]` теперь корректно парсится
  - Ранее `Dan Da Dan 2 (2025) - 01` матчил `2` (сезон) вместо `01` (эпизод)
  - Добавлен приоритетный паттерн `/\s-\s(\d{1,4})\s*\[/` для формата `- XX [`
  - Negative lookahead для года: `\((?!\d{4}\))` предотвращает матчинг `2 (2025)` как эпизода
  - Повышен приоритет паттерна `^XX_` для файлов типа `01_Phi_Brain_TV_2.mkv`
  - Повышен приоритет паттерна `ep.XX` для файлов типа `ep.01[BDRemux].mkv`
  - Файлы: `parse-filename.ts`, `episode-matcher.ts`

### Added

- **Тесты для парсинга имён файлов:**
  - 34 теста покрывают все реальные форматы из Downloads
  - Regression tests на основе реальных файлов (SK8, Phi Brain, Kimetsu, Danganronpa, Undead Unluck, Dan Da Dan)
  - Файл: `lib/__tests__/parse-filename.spec.ts`

## [0.9.6] - 2026-01-10

### Performance

- **LRU кэш для ffmpeg.probe результатов:**
  - Новый модуль `lib/cache/probe-cache.ts` с TTL 30 минут, макс. 100 записей
  - Избавляет от повторных IPC вызовов при навигации между эпизодами
  - Экспорты: `getCachedProbe`, `invalidateProbeCache`, `clearProbeCache`, `getProbeCacheStats`

- **React.memo для списковых компонентов:**
  - `RecentFoldersCard` — добавлен memo и мемоизированный `FolderItem` субкомпонент
  - `EpisodeSidebar` и `AnimeCard` — уже использовали memo

### Changed

- Виртуализация `EpisodeSidebar` отложена (низкий приоритет — типичный аниме-сериал имеет 12-26 эпизодов)

## [0.9.5] - 2026-01-10

### Security

- **XSS-защита субтитров через DOMPurify:**
  - Regex-санитизация заменена на DOMPurify whitelist (`<i>`, `<b>`, `<u>`, `<em>`, `<strong>`, `<br>`)
  - Никаких атрибутов — защита от `onclick`, `onerror` и других event handlers
  - Файл: `renderer/src/components/player/NativeSubtitleOverlay.tsx`

- **Динамический whitelist для media:// протокола:**
  - Создан модуль `main/protocols/allowed-paths.ts` для управления разрешёнными путями
  - По умолчанию разрешены: библиотека, temp, userData
  - При выборе папки/файла через native диалог путь добавляется в whitelist
  - Запросы к media:// вне whitelist получают 403 Access Denied
  - Защита от XSS-атак с произвольным чтением файлов через iframe/fetch

### Changed

- Интеграция whitelist в `dialog.handlers.ts` — вызов `allowPath()`/`allowFilePath()` при выборе
- Интеграция whitelist в `media.protocol.ts` — проверка `isPathAllowed()` перед чтением
- ESLint: добавлен `dompurify` в allowed external packages

## [0.9.3] - 2026-01-09

### Fixed

- **Критическое исправление: видео-задачи больше не "исчезают":**
  - Исправлен двойной декримент `pendingTasks` в `video-pool.ts` (строка 455)
  - Задачи, отменённые во время `getVideoInfo()`, теперь добавляются в `completedTasks`
  - Ранее задачи могли "теряться" — не отображались в completed, но и не работали

- **Исправлен путь к WASM для sql.js в dev режиме:**
  - В dev режиме теперь используется путь к `node_modules/sql.js/dist/sql-wasm.wasm`
  - Ранее sql.js искал файл в текущей директории и падал с ошибкой ENOENT

### Added

- **Детальное логирование жизненного цикла задач:**
  - `[VideoPool] Task added/COMPLETED/ERROR/CANCELLED/SPAWN ERROR` с состоянием очередей
  - `[VideoPool] CLEAR called!` при очистке пула
  - `[ParallelTranscode] RESET/CANCEL ALL` со стек-трейсом для отладки

## [0.9.2] - 2026-01-09

### Fixed

- **Исправлен счётчик завершённых задач транскодирования:**
  - Задачи с ошибками теперь корректно учитываются в счётчике `completed`
  - Исправлено в `video-pool.ts` и `audio-pool.ts`
  - Ранее при ошибке FFmpeg (spawn error, exit code ≠ 0) задача "терялась" и не учитывалась

- **Исправлено завершение элементов импорта при ошибках:**
  - Теперь элемент импорта корректно завершается даже если видео/аудио завершились с ошибкой
  - Ранее при ошибке видео элемент "зависал" навсегда в статусе processing

- **Исправлено обновление счётчиков при завершении задач:**
  - Добавлен `emitAggregatedProgress()` в `handleVideoCompleted` и `handleAudioCompleted`
  - Ранее счётчик обновлялся только при прогрессе, но не при завершении задачи

### Changed

- **Компактный степпер визарда импорта:**
  - Уменьшены размеры элементов для вместимости 7 шагов
  - Круг: 32px → 24px, шрифт: sm → xs, линии: 40px → 24px

## [0.9.1] - 2026-01-09

### Fixed

- **Критическое исправление миграций БД:**
  - Миграции теперь применяются в dev и prod режимах
  - Исправлена ошибка "Server Components render" при импорте аниме
  - Добавлено логирование миграций для диагностики

### Migration

Если при импорте аниме возникает ошибка "Server Components render", обновитесь до v0.9.1 — миграции применятся автоматически при запуске.

Альтернатива — ручная миграция через любой SQLite клиент (DB Browser for SQLite):

1. Открыть файл: `%APPDATA%\animatrona\app.db`
2. Выполнить SQL:
   ```sql
   ALTER TABLE Anime ADD COLUMN watchStatus TEXT DEFAULT 'NOT_STARTED';
   ALTER TABLE Anime ADD COLUMN watchedAt DATETIME;
   ALTER TABLE Anime ADD COLUMN userRating INTEGER;
   PRAGMA user_version = 3;
   ```

## [0.9.0] - 2026-01-09

### Added

- **История просмотра и "Продолжить смотреть":**
  - Карточка "Продолжить смотреть" в Sidebar — показывает последний эпизод с прогресс-баром
  - Страница `/history` с полной историей просмотра
  - Два таба: "Библиотека" (из БД) и "Папки" (из localStorage)
  - Пагинация истории библиотеки
  - Удаление папок из истории

- **История папок в folder mode:**
  - Хук `useFolderHistory` для localStorage persistence
  - Хранение 10 последних папок (90 дней retention)
  - Карточка "Недавние папки" в плеере когда нет активного видео
  - Клик по папке — мгновенное открытие

- **Статус просмотра (WatchStatus):**
  - 6 статусов: Не начато, Смотрю, Просмотрено, Отложено, Брошено, Запланировано
  - Автоустановка `WATCHING` при начале просмотра первого эпизода
  - Автоустановка `COMPLETED` при завершении последнего эпизода
  - `WatchStatusSelector` — компонент с 6 кнопками и слайдером оценки
  - `WatchStatusBadge` — компактный бейдж статуса на карточках
  - Фильтр по статусу просмотра в библиотеке

- **Пункт "История" в навигации Sidebar**

### Changed

- AnimeCard теперь показывает бейдж статуса просмотра
- AnimeFilters расширен фильтром "Просмотр"

### Technical

- `apps/animatrona/renderer/src/components/layout/ContinueWatchingCard.tsx` — новый компонент
- `apps/animatrona/renderer/src/app/player/_hooks/useFolderHistory.ts` — хук истории папок
- `apps/animatrona/renderer/src/app/player/_components/RecentFoldersCard.tsx` — карточка недавних папок
- `apps/animatrona/renderer/src/app/history/page.tsx` — страница истории
- `apps/animatrona/renderer/src/components/library/WatchStatusSelector.tsx` — селектор и бейдж статуса
- `apps/animatrona/renderer/src/app/_actions/watch-progress.action.ts` — новые server actions

## [0.8.9] - 2026-01-09

### Added

- **Импорт из папочного режима плеера:**
  - Кнопка «Импорт» в сайдбаре эпизодов (EpisodeSidebar)
  - Упрощённый визард — пропуск шага выбора папки (сразу Shikimori поиск)
  - Передача списка файлов напрямую из папочного режима
  - Диалог очистки прогресса из localStorage после импорта (TransferProgressDialog)

### Technical

- `apps/animatrona/renderer/src/components/import/TransferProgressDialog.tsx` — новый компонент
- `apps/animatrona/renderer/src/components/import/ImportWizardDialog.tsx` — пропс `initialData` для skipFolderSelect
- `apps/animatrona/renderer/src/app/player/page.tsx` — интеграция ImportWizardDialog

## [0.8.8] - 2026-01-09

### Added

- **Встроенные MKV дорожки в папочном режиме:**
  - Извлечение информации о встроенных аудио и субтитрах через FFprobe
  - Типы `EmbeddedAudioTrack`, `EmbeddedSubtitleTrack`, `EmbeddedTracksInfo`
  - Объединённый список дорожек (встроенные + внешние) в TrackSelector
  - Идентификаторы дорожек: `embedded:{index}` / `external:{index}`
  - PGS субтитры (bitmap) фильтруются — не поддерживаются

- **Внешние аудиодорожки с синхронизацией:**
  - Хук `useExternalAudio` для воспроизведения внешнего аудио синхронно с видео
  - Mute основного видео при выборе внешней аудиодорожки
  - Синхронизация play/pause/seek/rate/volume событий
  - Порог коррекции синхронизации: 100мс
  - Метод `getVideoElement()` в VideoPlayer для доступа к video DOM элементу

- **TrackSelector в папочном режиме:**
  - UI для выбора внешних субтитров в папочном режиме плеера
  - Кнопка 💬 в правом верхнем углу плеера (появляется если есть субтитры)
  - Меню с выбором субтитров и кнопкой «Выключить»
  - Автосброс на первый субтитр при смене эпизода

### Technical

- `apps/animatrona/renderer/src/app/player/_hooks/useExternalAudio.ts` — новый хук синхронизации
- `apps/animatrona/renderer/src/app/player/types.ts` — типы для embedded tracks
- `apps/animatrona/renderer/src/app/player/_hooks/useFolderPlayer.ts` — параллельный вызов FFprobe
- `apps/animatrona/renderer/src/components/player/VideoPlayer.tsx` — метод `getVideoElement()`

## [0.8.6] - 2026-01-09

### Added

- **Папочный режим плеера (Folder Mode):**
  - Кнопка «Выбрать папку» на странице плеера для открытия папок с сериалами
  - Автоматическое сканирование и сортировка эпизодов по номеру
  - Сайдбар с списком эпизодов (280px, collapsible)
  - Отдельная секция для бонусов (OP/ED creditless, PV, trailers)
  - Прогресс-бары для каждого эпизода
  - Бейджи OVA/SP/Movie для специальных эпизодов
  - Автоматическое подхватывание внешних аудиодорожек и субтитров
  - Сохранение позиции просмотра в localStorage (30 дней)
  - Автопереход на следующий эпизод по окончании видео
  - Навигация между эпизодами (Shift + ←/→)

### Technical

- Новые файлы:
  - `apps/animatrona/renderer/src/app/player/types.ts` — типы для folder mode
  - `apps/animatrona/renderer/src/app/player/_hooks/useFolderPlayer.ts` — логика сканирования
  - `apps/animatrona/renderer/src/app/player/_hooks/useWatchProgress.ts` — localStorage persistence
  - `apps/animatrona/renderer/src/app/player/_components/EpisodeSidebar.tsx` — UI сайдбара

## [0.8.5] - 2026-01-09

### Added

- **Автоопределение фильмов при импорте:**
  - Если в папке только 1 видеофайл без номера эпизода — он автоматически распознаётся как фильм
  - Фильм получает `episodeNumber: 1` и `episodeType: 'movie'`
  - Больше не нужно выбирать файл вручную

### Fixed

- **Chakra UI v3:** `isTruncated` → `truncate` в EpisodeSidebar
- **TypeScript:** удалён неиспользуемый импорт `PlayerMode` в useFolderPlayer.ts

## [0.8.2] - 2026-01-09

### Changed

- **Полный рефакторинг темизации на семантические токены:**
  - Все hardcoded цвета заменены на `_light/_dark` семантические токены
  - Добавлены новые токены: `overlay`, `state`, `player`, `status`, `callout`
  - Layout: AppShell, Sidebar, Header
  - Library: EmptyLibraryState, AnimeCard, EpisodeCard
  - Import Wizard: StepIndicator, ProcessingStep, TranscodeStats, TranscodeSettings
  - Dialogs: CommandPalette, WelcomeDialog, VmafAutoDialog
  - Player: PlayerControls (+ новые player.\* токены для маркеров)
  - AddTracks Wizard: все 6 компонентов (Dialog, TrackSelection, DonorFolder, FileMatching, Sync, Processing)
  - Корректная поддержка светлой и тёмной темы

## [0.8.1] - 2026-01-09

### Fixed

- **Парсинг номеров эпизодов:** добавлен паттерн `Name_01` / `Name-01` для файлов формата `[SubGroup] Anime_Name_01.mkv` (например, `[Raizel] Phi_Brain_01.mkv`)

## [0.8.0] - 2026-01-08

### Added

- **Command Palette (Ctrl+K):**
  - Глобальная командная палитра в стиле VS Code/Spotlight
  - Fuzzy поиск по командам и аниме
  - Навигация: Библиотека, Плеер, Тест профилей, Настройки
  - Действия: Импорт видео, Обновить метаданные, Экспорт
  - Интеграция с режимом группировки библиотеки

- **Quick Actions на карточках аниме:**
  - Hover меню с быстрыми действиями (LuMoreVertical)
  - Продолжить просмотр (переход к последнему эпизоду)
  - Экспорт в MKV (открывает диалог экспорта)
  - Обновить метаданные с Shikimori
  - Удалить аниме (с подтверждением)

- **Сортировка библиотеки:**
  - NativeSelect в фильтрах
  - По названию (А-Я / Я-А)
  - По дате обновления
  - По прогрессу просмотра
  - По году выпуска
  - По рейтингу

- **Playback Speed Control:**
  - Кнопка выбора скорости в PlayerControls (0.5x - 2x)
  - Горячие клавиши: [ и ] для ±0.25x
  - Отображение текущей скорости

- **Drag & Drop импорт:**
  - Drop zone на странице библиотеки
  - Визуальный feedback при перетаскивании
  - Автоматическое открытие ImportWizard

- **Video Info Overlay (I):**
  - Overlay по нажатию I (как в mpv)
  - Информация: кодек, разрешение, битрейт, FPS
  - Аудио: кодек, каналы, битрейт
  - Субтитры: формат, язык
  - Файл: размер

- **Welcome Dialog (onboarding):**
  - Диалог приветствия при первом запуске
  - 3 шага: приветствие → горячие клавиши → импорт
  - Быстрый старт с импортом первого аниме
  - Сохранение флага показа в localStorage

- **Picture-in-Picture (PiP):**
  - Кнопка PiP в PlayerControls
  - Поддержка Document PiP API
  - Продолжение просмотра в мини-окне

- **Page Transitions:**
  - Плавные переходы между страницами
  - Framer Motion с AnimatePresence
  - Fade + slide анимация (150ms)

## [0.7.0] - 2026-01-08

### Added

- **Глобальные горячие клавиши:**
  - `Ctrl+/` — модальное окно со списком всех хоткеев
  - `Ctrl+K` — Command Palette (placeholder для Phase 2)
  - `Ctrl+I` — быстрый импорт видео
  - `1-4` — навигация по секциям (Библиотека, Плеер, Тест профилей, Настройки)
  - `Escape` — закрытие модальных окон
  - Хук `useGlobalShortcuts` для централизованного управления

- **Shortcuts Cheatsheet:**
  - Модальное окно со всеми горячими клавишами
  - 4 категории: Навигация, Действия, Плеер, Редактор глав
  - Автоматическое отключение в полях ввода

- **Empty Library State:**
  - Состояние пустой библиотеки с call-to-action
  - Кнопка "Импортировать видео" + подсказка про drag & drop
  - Кнопка для показа горячих клавиш

### Changed

- **Выбор темы оформления:**
  - Добавлена карточка настройки темы в Settings
  - Три варианта: Светлая / Тёмная / Системная
  - По умолчанию — системная тема (синхронизация с ОС)
  - Использование next-themes с defaultTheme="system"

## [0.6.37] - 2026-01-08

### Changed

- **DRY рефакторинг — TanStack Query хуки через фабрики:**
  - Создан `hooks-factory.ts` с фабричными функциями:
    - `createFindManyHook`, `createFindUniqueHook` — query хуки
    - `createCreateHook`, `createUpdateHook`, `createDeleteHook` — mutation хуки
    - `createCRUDHooks` — композитная фабрика для полного CRUD
  - Рефакторинг `hooks.ts`: 815 → 552 строки (32% сокращение)
  - Anime, Episode, Franchise, EncodingProfile используют `createCRUDHooks`
  - AudioTrack, SubtitleTrack используют predicate invalidation через фабрики
  - WatchProgress, Settings, Chapter — сохранены специальные реализации
  - Полная обратная совместимость API

## [0.6.36] - 2026-01-08

### Changed

- **DRY рефакторинг — извлечение дублирующегося кода в утилиты:**
  - `main/src/utils/broadcast.ts` — `broadcastToWindows()` извлечён из 3 IPC handlers
  - `renderer/src/lib/html-utils.ts` — `stripHtmlTags()` извлечён из 2 файлов
  - `renderer/src/lib/format-utils.ts` — `formatFileSize()`, `formatDuration()`, `formatBitrate()`
  - `renderer/src/lib/parse-filename.ts` — `parseEpisodeNumber()`, `parseEpisodeInfo()` консолидированы из 3 компонентов
  - Удалено ~150 строк дублирующегося кода
  - Улучшена поддерживаемость и консистентность парсинга имён файлов

## [0.6.35] - 2026-01-08

### Added

- **Метки 4K/10bit для аниме:**
  - Сохранение битности видео (8/10/12-bit) при импорте из `pix_fmt` FFprobe
  - Фильтры по разрешению (4K/1080p/720p) и битности (10-bit/8-bit) в библиотеке
  - Модель Episode теперь хранит `videoBitDepth`

- **Ссылка на Shikimori:**
  - Добавлена кнопка-бейдж "Открыть на Shikimori" в секцию метаданных

- **Новые типы внешних ссылок:**
  - WorldArt, Kinopoisk, Anime News Network теперь сохраняются вместо падения в "OTHER"

### Fixed

- **Парсинг описаний Shikimori:**
  - Добавлена поддержка формата `[character=ID]имя[/character]` (ранее работал только `[character=ID имя]`)
  - Аналогично для `[anime=]`, `[manga=]`, `[person=]`

- **UX кнопки "Найти связи":**
  - Теперь корректно различает "связи ещё не загружены" и "связанных аниме не найдено"
  - Добавлено поле `relationsCheckedAt` для отслеживания проверки связей

## [0.6.33] - 2026-01-05

### Fixed

- **Внешние аудиодорожки и субтитры не находились при импорте:**
  - **Причина:** алгоритм матчинга требовал точного совпадения имени файла, но аудио/субтитры имеют суффиксы `.ru_Anilibria`, `.jp_netflix` и т.д.
  - Добавлен fallback-алгоритм: если точного матча нет, парсится суффикс `.lang_group` и сравнивается без него
  - Из суффикса автоматически извлекаются язык (`ru`, `en`, `ja`) и имя группы перевода
  - Пример: `video - 01.ru_Anilibria.mka` → матчится к `video - 01.mkv`, язык = `ru`, группа = `Anilibria`
  - Исправлено в обоих сканерах: `external-audio-scanner.ts` и `external-subtitle-scanner.ts`

## [0.6.32] - 2026-01-05

### Added

- **Автопереход на следующий эпизод:** по окончании воспроизведения серии автоматически запускается следующая

### Fixed

- **Прогресс кодирования видео застревал на ~7.5%:**
  - Regex для парсинга времени FFmpeg был слишком строгим — требовал обязательно сотые доли секунды
  - Теперь поддерживает форматы: `HH:MM:SS`, `HH:MM:SS.c`, `HH:MM:SS.cc`, `HH:MM:SS.ccc`
  - Исправлен разделитель строк: поддержка `\r`, `\n` и `\r\n` (Windows/Unix/Mac)
  - Добавлено логирование прогресса каждые 5% для отладки
  - Исправлено в обоих пулах: `video-pool.ts` и `audio-pool.ts`

## [0.6.31] - 2026-01-05

### Fixed

- **Профиль кодирования: применение всех настроек при импорте:**
  - **Корневая проблема:** при импорте передавались только 4 поля (`codec`, `useGpu`, `cq`, `preset`), остальные 13 параметров профиля игнорировались
  - Расширен тип `VideoTranscodeOptions` всеми полями из `EncodingProfile`
  - `use-import-flow.ts` теперь передаёт полный профиль: `rateControl`, `maxBitrate`, `tune`, `multipass`, `spatialAq`, `temporalAq`, `aqStrength`, `lookahead`, `lookaheadLevel`, `gopSize`, `bRefMode`, `force10Bit`, `temporalFilter`
  - `video-pool.ts` использует параметры из профиля вместо захардкоженных значений
  - Добавлено логирование применяемых настроек и итоговой FFmpeg команды
  - Теперь профили "Качество", "Blackwell UHQ", "Архив" применяются корректно с multipass и tune=UHQ

### Changed

- **Кнопки навигации "Предыдущий/Следующий" перенесены в панель управления плеером:**
  - Теперь отображаются рядом с таймером (после времени воспроизведения)
  - Компактные иконки-стрелки с tooltip (название эпизода)
  - Убран отдельный плавающий блок над прогресс-баром

## [0.6.30] - 2026-01-05

### Fixed

- **Исправлено позиционирование маркеров глав в плеере:**
  - Маркеры теперь отображаются на прогресс-баре, а не по центру экрана
  - Перенесён рендеринг маркеров внутрь `PlayerControls` (рядом со Slider)
  - Добавлены пропсы `chapters` и `onChapterSeek` в `VideoPlayer`
  - `ChapterMarkers` теперь рендерит только кнопку "Пропустить опенинг/эндинг"
  - Маркеры жёлтого цвета с tooltip при наведении
  - Клик по маркеру — переход к началу главы

## [0.6.29] - 2026-01-05

### Fixed

- **Профиль кодирования:** исправлена валидация опционального поля "Максимальный битрейт":
  - Убрана ошибка "required" при пустом значении (схема: `.nullish()` без `.default()`)
  - Убрана красная рамка для пустого поля (`@letar/forms` 0.54.1)

## [0.6.28] - 2026-01-05

### Added

- **Импорт полнометражного фильма одним файлом:**
  - Добавлена кнопка "Выбрать файл" в FolderSelectStep рядом с "Выбрать папку"
  - Фиолетовая кнопка "Выбрать папку" (Сериал) / Синяя кнопка "Выбрать файл" (Фильм)
  - Новая функция `parseFileNameForMovie` для парсинга названия из имени файла
  - FileScanStep показывает один файл с типом "Фильм" (episodeType: 'movie')
  - Бейдж "Фильм" (синий) в таблице файлов
  - Кнопки "Сериал/Спешлы" скрыты в режиме файла
  - Используется существующий IPC `dialog:selectFile`

## [0.6.27] - 2026-01-05

### Added

- **Экспорт MKV: выбор эпизодов для экспорта:**
  - Добавлена секция "Эпизоды" в диалог экспорта
  - Чекбоксы для каждого готового эпизода
  - Кнопки "Все" / "Ни одного" для быстрого выбора
  - Счётчик выбранных эпизодов
  - Валидация: требуется выбрать хотя бы один эпизод

## [0.6.26] - 2026-01-05

### Fixed

- **Исправлено определение языка внешних субтитров:**
  - Убран паттерн `'it'` из `languageMap` в `subtitle-parser.ts`
  - Раньше любой файл с "it" в имени (Subtitle, Title) определялся как итальянский
  - Теперь итальянский определяется только по `'ita'`, `'italian'`, `'итальянский'`

- **Исправлено отображение кодека аудио после транскода:**
  - `use-import-flow.ts` — добавлен `codec: 'aac'` в `onAudioTrackCompleted`
  - Раньше в БД оставался оригинальный кодек (FLAC), плеер показывал неверную информацию
  - Теперь после транскода codec обновляется на 'aac'

## [0.6.25] - 2026-01-05

### Fixed

- **Add Tracks Wizard: исправлен матчинг файлов формата `- 01 [`:**
  - Добавлен паттерн `/- (\d{2,3})(?=\s*\[)/` в `episode-matcher.ts`
  - Теперь файлы типа `[sergey_krs] Anime - 01 [BDRip...].mkv` корректно сопоставляются с эпизодами
  - Паттерн добавлен в конец массива — существующие паттерны сохраняют приоритет

## [0.6.24] - 2026-01-05

### Fixed

- **Внешние аудиодорожки теперь обрабатываются при импорте:**
  - `use-import-flow.ts` — добавлена обработка внешних аудио из `fileAnalysis.audioRecommendations`
  - Создание `AudioTrack` в БД для внешних аудио с `streamIndex: -1`
  - Передача `isExternal`, `title`, `language` в `BatchImportItem.audioTracks`
  - `parallel-transcode.ts` — типы `AudioPoolTask` и `BatchAudioTrackInput` расширены полями `isExternal`, `title`, `language`
  - Внешние аудио (`.mka`, `.m4a` из папок типа `Rus Sound/`) теперь транскодируются и сохраняются в библиотеку

## [0.6.23] - 2026-01-05

### Added

- **Сканирование внешних аудиофайлов в ImportWizard:**
  - Новый `external-audio-scanner.ts` — сканер папок `Rus Sound/`, `Audio/` и др.
  - Поддержка расширений: `.mka`, `.m4a`, `.flac`, `.opus`, `.mp3`, `.aac`, `.wav`, `.ogg`, `.ac3`, `.dts`
  - IPC handler `fs:scanExternalAudio` для вызова из renderer
  - Паттерны папок: `rus sound`, `rus audio`, `озвучка`, `audio`, `dub`, `voices`
  - Матчинг аудио к видео по exact basename (без расширения)
  - FFprobe для получения информации о кодеке, каналах и битрейте
  - UI: внешние аудио отображаются с бейджем "Внешний" и путём к файлу

### Fixed

- ImportWizard теперь находит внешние аудиофайлы (`.mka` и др.) из подпапок

## [0.6.22] - 2026-01-05

### Fixed

- **AnimeCard: \_active через Chakra Link + asChild:**
  - Паттерн: `<Link asChild><NextLink><Card.Root _active={...}>`
  - Chakra Link передаёт props через asChild в NextLink
  - Card.Root получает \_active стили напрямую
  - Карточки в библиотеке теперь реагируют на нажатие

## [0.6.21] - 2026-01-05

### Fixed

- **AnimeCard: попытка через LinkBox/LinkOverlay (не сработало)**

## [0.6.20] - 2026-01-05

### Changed

- **Визуальная обратная связь `_active` для всех интерактивных элементов:**
  - `Sidebar.tsx` — пункты меню: `scale(0.98)` + `bg: gray.700`
  - `AnimeCard.tsx` — карточки аниме: `translateY(-2px) scale(0.98)` + `shadow: lg`
  - `EpisodeCard.tsx` — карточки эпизодов: `scale(0.98)` + `shadow: md`
  - `ShikimoriAnimeCard.tsx` — результаты поиска: `scale(0.98)` + смена фона
  - `FranchiseCard.tsx` — заголовок и строки аниме: `scale(0.98/0.99)`
  - `RelatedAnimeRow.tsx` — связанные аниме: `scale(0.98)` (только для загруженных)
  - `Header.tsx` — результаты поиска: `scale(0.98)` + `bg: gray.600`
  - `VideoSection.tsx` — карточки видео: `scale(0.98)` + `borderColor: purple.600`
- **Унифицированный `transition: all 0.1s-0.15s ease-out`** для плавной анимации

## [0.6.19] - 2026-01-05

### Added

- **Кастомная тема Chakra UI:**
  - Создана полноценная система темы `src/theme/` по образцу driving-school
  - Фирменные цветовые палитры: `brand` (purple), `accent` (cyan), `success`, `warning`, `error`, `info`
  - Семантические токены для dark-only режима: `bg`, `fg`, `border`, `primary`
  - Button recipe с визуальной обратной связью (`_active: scale(0.95)`)
  - Link recipe с transitions и \_active стилями
  - Checkbox slot recipe с `cursor: pointer` на всех элементах
  - Switch, Progress, Menu, Card slot recipes

### Changed

- **Provider использует кастомную систему вместо defaultSystem:**
  - Все кнопки теперь имеют тактильный отклик при нажатии
  - Чекбоксы показывают cursor: pointer на всех элементах
  - Progress-бары используют фирменный цвет по умолчанию

## [0.6.18] - 2026-01-04

### Changed

- **Мгновенная визуальная обратная связь для чекбоксов:**
  - Добавлены `transition` и `_active` стили на карточки дорожек
  - При клике карточка сжимается (`scale(0.98)`) и меняет фон
  - Визуальный отклик мгновенный — не ждёт обновления стейта

## [0.6.17] - 2026-01-04

### Changed

- **Оптимизация производительности TrackSelectionStep:**
  - `AudioTrackCard` и `SubtitleTrackCard` обёрнуты в `React.memo`
  - Добавлены `AudioTrackRow` и `SubtitleTrackRow` wrapper'ы с `useCallback`
  - `selectedTrackIds` вычисляется через `useMemo` как `Set` для O(1) поиска
  - Устранены inline функции в `.map()` — 100% мемоизация
  - Результат: мгновенное переключение чекбоксов при 500+ дорожках

## [0.6.16] - 2026-01-04

### Fixed

- **Чекбоксы в AddTracks не реагировали на клики:**
  - В Chakra UI v3 `Checkbox.Control` — визуальный span без обработки кликов
  - Добавлен `onClick` на `Checkbox.Control` с `e.stopPropagation()` + `cursor="pointer"`
  - Теперь курсор `pointer` и клики работают на самом чекбоксе

## [0.6.15] - 2026-01-04

### Fixed

- **Дорожки не появлялись в плеере без перезагрузки:**
  - Инвалидация кэша использовала неправильные query keys
  - Плеер использует `['episode', id, ...]`, а инвалидация искала `['findUniqueEpisode']`
  - Исправлено: используется `predicate` для поиска по первому элементу query key
  - Теперь после добавления дорожек плеер сразу видит изменения

## [0.6.14] - 2026-01-04

### Fixed

- **Встроенные субтитры не извлекались (demux failed):**
  - Track ID содержит `:` (например `file.mkv:subtitle:0`) — недопустимо в Windows путях
  - `tempDir` формировался как `episodeDir/_temp_subs_${id}` → невалидный путь
  - Исправлено: используется `streamIndex` и `timestamp` вместо полного ID
  - Добавлен вывод поля `error` в debug лог для диагностики

## [0.6.13] - 2026-01-04

### Fixed

- **Дорожки не импортировались (0/0) после рефакторинга:**
  - Убрана ненужная группировка по `matchId` и поиск через `state.matches`/`episodes`
  - Теперь используются `episodeId` и `episodeDir` напрямую из `SelectedTrack`
  - Код упрощён с 44 строк до 27

## [0.6.12] - 2026-01-04

### Fixed

- **Рассинхрон субтитров при добавлении донорских дорожек:**
  - Инвертирован знак `syncOffset` при вызове `subtitle.shift()`
  - Причина: аудио и субтитры имели противоположную семантику смещения
  - Аудио: `+offset` → `-ss` → звук раньше
  - Субтитры: `+offset` → раньше нужен `-offset` для сдвига назад
  - Теперь субтитры синхронизируются корректно вместе с аудио

## [0.6.11] - 2026-01-04

### Fixed

- **Глобальный пул задач для параллельной обработки:**
  - Все аудио и субтитры из ВСЕХ серий теперь обрабатываются в едином пуле
  - Embedded и external дорожки обрабатываются вместе (было раздельно)
  - Устранена последовательная обработка доноров (было: донор за донором)
  - Слайдер потоков теперь виден всё время обработки (был баг с условием `fileProgress.length === 0`)

### Changed

- **Архитектура startProcessing():**
  - Фаза 1: Сбор всех задач из всех доноров в `allAudioTasks[]` и `allSubtitleTasks[]`
  - Фаза 2: `runWithConcurrency(allAudioTasks, processAudioTask, concurrency)`
  - Фаза 3: `runWithConcurrency(allSubtitleTasks, processSubtitleTask, concurrency)`
  - Прогресс показывает ВСЕ задачи сразу, а не по одной серии

## [0.6.10] - 2026-01-04

### Added

- **Настройка потоков транскодирования:**
  - UI слайдер в `AddTracksProcessingStep` для выбора количества потоков (1-16)
  - Динамический `initialConcurrency` на основе `navigator.hardwareConcurrency`
  - Метод `setConcurrency` для изменения потоков на лету

- **Прямое кодирование из MKV:**
  - `AudioTranscodeOptions.streamIndex` — кодирование конкретного аудиопотока без demux
  - FFmpeg `-map 0:a:N` для выбора потока напрямую из контейнера
  - Удалён этап demux для встроенных дорожек → быстрее и меньше I/O

### Changed

- **Параллельная обработка:**
  - Глобальная функция `runWithConcurrency()` с поддержкой отмены
  - Встроенные аудио (embedded) теперь обрабатываются параллельно наравне с внешними
  - Атомарные счётчики через `setState` вместо локальных переменных

## [0.6.9] - 2026-01-04

### Added

- **Синхронизация в AddTracksWizard:**
  - Новый шаг `AddTracksSyncStep` — калибровка синхронизации при добавлении дорожек к существующему аниме
  - Переиспользование `DualVideoPlayer` и `OffsetInput` для визуального сравнения
  - Применение `syncOffset` при транскодировании аудио (FFmpeg `-ss`/`adelay`)
  - Применение `subtitle:shift` при копировании субтитров (ASS/SRT)
  - 5-шаговый визард: Папка-донор → Сопоставление → Синхронизация → Выбор дорожек → Обработка

### Changed

- `AudioTranscodeOptions` теперь поддерживает опциональный `syncOffset` для применения смещения

## [0.6.8] - 2026-01-04

### Added

- **Синхронизация донорских дорожек:**
  - Новый шаг визарда `DonorSelectStep` — выбор папки с альтернативным релизом
  - Автоматический матчинг файлов по номерам эпизодов между оригиналом и донором
  - Сканирование внешних аудио (.mka, .aac, .ac3, .dts) и субтитров (.ass, .srt)

- **Калибровка синхронизации:**
  - Новый шаг `SyncCalibrationStep` с визуальным сравнением видео
  - `DualVideoPlayer` — overlay плеер с накладыванием донора на оригинал (opacity 0.5)
  - `OffsetInput` — компонент ввода смещения в миллисекундах с кнопками ±10/100/1000мс
  - Горячие клавиши: ←/→ (±10мс), Shift+←/→ (±100мс), Ctrl+←/→ (±1000мс)

- **Применение смещения при импорте:**
  - FFmpeg `adelay` фильтр для отрицательного смещения (донор отстаёт)
  - FFmpeg `-ss` для положительного смещения (донор опережает)
  - `subtitle-shifter.ts` — сдвиг таймкодов ASS/SRT субтитров
  - IPC handler `subtitle:shift` для Electron

### Changed

- **Динамические шаги визарда:**
  - 6 шагов без донора, 7 шагов с калибровкой синхронизации
  - Шаг калибровки показывается только если есть совпадающие эпизоды
  - `getLogicalStep()` для name-based рендеринга вместо index-based

## [0.6.7] - 2026-01-04

### Fixed

- **Исправлен баг с параллельными потоками — настройки maxConcurrent теперь работают:**
  - Проблема: при выборе 3 видео и 4 аудио потоков запускалось только 2
  - Причина: в `runTask()` задача считалась и в `running`, и в `pending` одновременно
  - Условие `running + pending < maxConcurrent` (2+2=4 >= 3) блокировало новые задачи
  - Фикс: `pendingTasks--` теперь вызывается сразу после `runningTasks.set()`, а не после `getVideoDuration()`
  - Исправлено в обоих пулах: `VideoPool` и `AudioPool`

## [0.6.4] - 2026-01-03

### Fixed

- **Исправлен race condition — все видео запускались одновременно:**
  - Добавлен счётчик `pendingTasks` в VideoPool и AudioPool
  - `processQueue()` теперь учитывает задачи в фазе инициализации
  - Лимит 2 параллельных видео-потока для Dual NVENC работает корректно

- **Исправлена отмена транскодирования:**
  - Добавлен флаг `aborted` в RunningTask для отслеживания отмены
  - `runTask()` проверяет `aborted` после async операций (getVideoDuration)
  - Если задача отменена во время getVideoDuration — FFmpeg НЕ запускается
  - Отмена теперь корректно убивает все FFmpeg процессы

- **Исправлен undefined errorMessage:**
  - `cancelTask()` устанавливает `task.error` перед эмитом события
  - В обработчике `ff.on('close')` добавлен fallback для error message
  - В логах больше не появляется "undefined" при ошибках

### Changed

- **Оптимизация: пропуск demux для видео:**
  - Добавлена опция `skipVideo` в `DemuxOptions`
  - При импорте видеопоток НЕ извлекается в отдельный файл
  - Транскодирование работает напрямую с исходным MKV
  - Экономия времени и места на диске (~10-20% ускорение импорта)

## [0.6.2] - 2026-01-03

### Fixed

- **КРИТИЧНЫЙ ФИКС БЕЗОПАСНОСТИ — защита от удаления файлов вне библиотеки:**
  - Добавлена функция `isPathInsideLibrary()` в `fs.handlers.ts` (Electron main process)
  - Используется `path.resolve()` для нормализации путей и защиты от path traversal атак (`../`)
  - IPC handler `fs:delete` теперь ОТКЛОНЯЕТ любые пути вне папки библиотеки
  - Дополнительная проверка на renderer стороне в `use-delete-anime.ts`
  - Defense in Depth: проверка на обоих уровнях (Electron + React)

### Changed

- **Постеры теперь хранятся в папке аниме:**
  - Путь изменён с `AppData/animatrona/posters/` на `libraryPath/AnimeName/poster.jpg`
  - Добавлен `library.ensureAnimeDirectory()` handler для создания папки аниме
  - `downloadPoster()` принимает опциональный `savePath` для указания папки сохранения
  - Постер удаляется автоматически вместе с папкой аниме
  - Упрощён whitelist: теперь только один путь (библиотека) вместо двух

## [0.6.1] - 2026-01-03

### Changed

- **Параллельный импорт эпизодов:**
  - Demux файлов теперь выполняется параллельно (до 2 FFmpeg процессов одновременно)
  - Создание записей в БД (Episode, AudioTrack, SubtitleTrack, Chapter) — полностью параллельно через Promise.all
  - Добавлена функция `createConcurrencyLimiter()` для контроля параллельности тяжёлых операций
  - Ускорение импорта сериала в ~2x за счёт параллельной обработки

## [0.6.0] - 2026-01-03

### Added

- **Экспорт сериала в MKV:**
  - Кнопка "Экспорт в MKV" на странице аниме
  - ExportSeriesDialog — 3-шаговый wizard (настройки → прогресс → результат)
  - Выбор аудиодорожек для экспорта (чекбоксы, можно несколько)
  - Выбор субтитров для внедрения (опционально)
  - Выбор папки назначения через системный диалог
  - 4 паттерна именования файлов:
    - `[{Anime}] - S{ss}E{nn} - {Episode}` (по умолчанию)
    - `{Anime} - {nn}`
    - `S{ss}E{nn} - {Episode}`
    - `{Anime} - S{ss}E{nn}`
  - ExportManager — singleton для управления экспортом
  - Последовательный экспорт эпизодов с прогресс-барами
  - Встраивание глав, постера и шрифтов в MKV
  - Отмена экспорта в процессе
  - Отображение пропущенных эпизодов и ошибок
- IPC handlers: `export:start`, `export:cancel`, `export:getProgress`, `export:isActive`
- Типы в `shared/types/export.ts`: NamingPattern, SeriesExportProgress, ExportResult

## [0.5.3] - 2026-01-03

### Added

- Настройки системного трея в UI (/settings):
  - Сворачивать в трей — приложение продолжит работать в фоне
  - Закрытие окна в трей — при клике на × сворачивать вместо закрытия
  - Уведомление при сворачивании — balloon notification при первом сворачивании
- IPC handlers для синхронизации настроек трея между main и renderer
- Настройки трея сохраняются в БД и восстанавливаются при перезапуске
- Toggle в контекстном меню трея для настройки closeToTray
- **Трейлеры, опенинги и эндинги (YouTube)**:
  - Модель Video и enum VideoKind (OP, ED, PV, CM, CLIP, EPISODE_PREVIEW, OTHER)
  - Импорт видео из Shikimori API (videos поле в GraphQL)
  - VideoSection — UI секция на странице аниме с группировкой по типу
  - VideoPlayerDialog — YouTube embed плеер в модальном окне
  - Автоматическое определение хостинга (youtube, vk, rutube)
  - Кнопка "Сохранить в БД" сохраняет видео вместе с метаданными

### Changed

- Контекстное меню трея теперь синхронизировано с UI настроек
- Страница аниме теперь отображает видео между метаданными и эпизодами

## [0.5.2] - 2026-01-03

### Fixed

- maxBitrate в профилях кодирования теперь опциональный (было required)
- Lookahead максимум исправлен на 250 (было 32)
- Unique constraint при обновлении связей аниме (syncAnimeRelations)
- Отображение места на диске в сайдбаре (реальные данные через IPC getDiskInfo)

### Changed

- Встроенные профили кодирования теперь readonly с кнопками "Сбросить" и "Создать копию"
- В настройках показываются дефолтные пути если кастомные не выбраны
- Поиск в хедере теперь работает с подсказками (autocomplete)
- Описания аниме теперь парсят специальную разметку Shikimori:
  - `[character=ID name]` — имена персонажей
  - `[anime=ID name]` — ссылки на аниме
  - `[b]...[/b]` — жирный текст
  - `[i]...[/i]` — курсив
  - `[spoiler=title]...[/spoiler]` — раскрываемые спойлеры
- Кнопка "Скачать" в связанных аниме теперь открывает ImportWizard с предустановленным аниме

### Added

- Кнопка "Копировать профиль" для всех профилей кодирования
- Кнопка "По умолчанию" для выбора дефолтного профиля
- DescriptionRenderer — компонент для рендеринга размеченных описаний
- Server action searchAnimeForHeader для поиска аниме

### Removed

- Раздел "Очередь" из меню (не используется)
- Глобальный CQ слайдер из настроек (есть профили кодирования)
- Кнопка "Добавить аниме" вручную (непонятный UX)
- Кнопка "Импорт из папки" на странице деталей аниме
- AnimeFormDialog (ручное добавление аниме)

## [0.5.1] - 2025-12-30

### Added

- AnimeFormDialog — модальная форма добавления аниме с использованием @letar/forms
- Интеграция формы в страницу библиотеки (/library)
- Использование сгенерированных Zod схем из zenstack-form-plugin
- ScanFolderDialog — диалог импорта эпизодов из папки:
  - Сканирование папки на видеофайлы (рекурсивно)
  - Автоматический парсинг номеров эпизодов из имён файлов
  - Пакетный импорт выбранных эпизодов
  - Определение уже добавленных эпизодов
- Кнопка "Импорт из папки" на странице деталей аниме (/library/[id])

## [0.4.0] - 2025-12-27

### Added

- Видеоплеер на базе Shaka Player с поддержкой локальных файлов
- Кастомный протокол `media://` для воспроизведения локальных медиафайлов
- Страница плеера `/player` с выбором файла и воспроизведением
- VideoPlayer компонент с полным набором контролов:
  - Play/Pause, перемотка, регулировка громкости
  - Полноэкранный режим
  - Горячие клавиши (Space, K, F, M, стрелки)
- SubtitleOverlay для рендеринга ASS/SSA субтитров (libass-wasm)
- TrackSelector для выбора аудиодорожек и субтитров
- ChapterMarkers для отображения глав и кнопки "Пропустить опенинг/эндинг"
- Автоопределение типов глав (intro, outro, recap, preview)

### Changed

- Добавлена ссылка на плеер в сайдбар и главную страницу

## [0.3.0] - 2025-12-27

### Added

- Splash screen при запуске с анимированным логотипом и прогресс-баром
- Иконка приложения (SVG, PNG, ICO) с градиентным дизайном
- Системный трей с контекстным меню и минимизацией в трей
- Автообновления через electron-updater с GitHub Releases
- Скрипт генерации иконок (`scripts/generate-icons.js`)

### Changed

- Улучшен UX при запуске приложения (splash → main window)
- Добавлена поддержка закрытия в трей вместо выхода

## [0.2.0] - 2025-12-25

### Added

- Демультиплексирование видеофайлов (извлечение потоков без перекодирования)
- Транскодирование аудио в AAC с умным подбором битрейта
- Транскодирование видео в AV1/HEVC/H264 (GPU и CPU)
- UI страницы: подготовка, аудио-транскодирование, видео-транскодирование
- Zustand store для передачи данных между страницами
- Параллельная обработка аудиодорожек

## [0.1.0] - 2025-12-24

### Added

- Первый релиз Animatrona
- Базовая структура Electron + Next.js
- Chakra UI v3 интеграция
- IPC каналы для FFmpeg операций
