# Changelog

Все значимые изменения в Animatrona Mobile документируются здесь.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

## [0.7.4] - 2026-08-19

### Fixed

- Миграция типов под react-native 0.87 API (без апдейта версии — код готов, версия ждёт унификации `react` по монорепо): публичные `CodegenTypes`/`codegenNativeCommands` вместо глубоких путей `Libraries/*` в `libs/exoplayer-ass`/`libs/exoplayer-sync`, явная типизация `UIManager.getViewManagerConfig(...).Commands`, `NativeEventEmitter.addListener` под новую сигнатуру в `usePictureInPicture.ts`/`useRemoteControl.ts`
- `StatusBar`: убраны `backgroundColor`/`translucent` — пропали из API RN 0.87 (Android теперь всегда edge-to-edge)
- `SeekBar`: реф `Animated.View` сужен до локального интерфейса с `measureInWindow` вместо `View`-типа, расходящегося между версиями reanimated/react-native

## [0.7.3] - 2026-05-29

### Fixed

- tsconfig: совместимость с TypeScript 6.0 — исправлен `extends` для `@react-native/typescript-config` (убран суффикс `.json`, добавлен `ignoreDeprecations: "6.0"`)
- tsconfig: добавлены wildcard пути для subpath-импортов `@letar/exoplayer-ass/*` и `@letar/exoplayer-sync/*`
- tsconfig: добавлены пути для `@letar/animatrona-types` и `@letar/animatrona-utils` (транзитивные зависимости через animatrona-shared)
- `animatrona-shared`: экспортирован тип `AnimeRelationInfo` (отсутствовал в api/index.ts и index.ts)
- `tracker.ts`: маппинг chapters с обязательными полями `id`, `type`, `skippable` (OP/ED автоопределение по заголовку)
- `navigation/types.ts`: `type RootParamList` → `interface RootParamList extends` (конфликт с React Navigation v7)
- `ServerSwitcher`: типизирован `useNavigation<NativeStackNavigationProp<RootStackParamList>>`
- `PlayerScreen`: перемещён `navigateToEpisode` до `handleEnd`, null-guard для `audioUrl`
- `offlineInit`/`downloadManager`: передаётся `activeServerId` в функции кэша (API изменился на multi-server)
- `exoplayer-ass`/`exoplayer-sync`: убраны лишние `@ts-expect-error` (TS 6.0 + `moduleResolution: bundler` корректно резолвит `require()`)

## [0.7.2] - 2026-05-29

### Changed

- Миграция Tamagui v1 → v2: `@tamagui/config@2.0.0`, `@tamagui/shorthands@2.0.0`, `@tamagui/lucide-icons@2.0.0-rc.26`
- Конфиг обновлён с `/v3` на `/v5` (`@tamagui/config/v5`)
- Шорткаты переключены на Tailwind-aligned (`@tamagui/shorthands/v4`)
- Убран несуществующий в v5 спред `defaultTokens.color` (цветовые токены теперь только кастомные)
- Фикс модульной аугментации `TamaguiCustomConfig`: `type` → `interface extends`

## [0.7.1] - 2026-04-04

### Added

- Загрузка watchStatus из `/watch-progress/summary` для отображения прогресса просмотра
- react-native-worklets для поддержки Reanimated 4

### Fixed

- SeekBar seek-jump — исправлен скачок при перемотке

## [0.7.0] - 2026-04-02

### Added

- **Группировка по франшизам:** collapsible карточки — одна на франшизу, раскрывается в список сезонов
  - Группировка по `franchiseKey` (серверный) или эвристика по названию (fallback)
  - Toggle кнопка в шапке: список / франшизы
  - FranchiseCard с анимацией expand/collapse
- **Серверный поиск для Tracker:** ввод текста → запрос `GET /api/anime?search=` вместо загрузки всех аниме
  - Desktop: клиентская фильтрация (как раньше)
  - Tracker: серверный поиск по title, titleOriginal, description, studio
- **Franchise данные в shared типах:** `AnimeListItem.franchiseKey`, `franchiseName`, `shikimoriId`

## [0.6.0] - 2026-04-01

### Added

- **Мульти-сервер:** поддержка нескольких серверов одновременно (Desktop + Tracker)
- **Animatrona Tracker:** подключение к веб-каталогу аниме через API Key
  - Просмотр каталога, воспроизведение через IPFS
  - Синхронизация прогресса просмотра
- **Server Switcher:** быстрое переключение между серверами в шапке библиотеки
- **ConnectScreen:** выбор типа сервера (Desktop/Tracker), ввод API Key
- **API Adapter Pattern:** унифицированный интерфейс для Desktop и Tracker API
- **Per-server cache:** изолированный кэш данных для каждого сервера
- **Миграция:** автоматическая миграция из старого формата подключения

## [0.5.6] - 2026-03-11

### Fixed

- **PiP цикл** — выход из PiP больше не вызывает повторный вход
  - `exitPictureInPictureMode()` теперь использует `Intent.FLAG_ACTIVITY_REORDER_TO_FRONT` вместо `moveTaskToBack()` (который не выходил из PiP)
  - Cooldown 1.5 сек после выхода из PiP — `autoEnterOnBackground` не триггерит повторный вход во время перехода PiP → fullscreen
  - Таймстамп выхода записывается при получении `onPictureInPictureModeChanged(false)` от нативного модуля

## [0.5.5] - 2026-03-02

### Fixed

- **PiP play/pause** — кнопка теперь корректно управляет воспроизведением
  - `WeakReference<Activity>` для доступа к Activity в PiP-режиме (Android < 12)
  - `RECEIVER_EXPORTED` для BroadcastReceiver на Android 13+ (SystemUI broadcasts)
  - Прямое управление ExoPlayer через обход view hierarchy (bypass Fabric в PAUSED state)
  - Pre-hide UI перед входом в PiP + AppState safety net для восстановления UI
  - ProGuard rules для release-сборок (предотвращает обфускацию нативных модулей)
- **Кнопка переключения озвучка/субтитры** — корректное отображение и поведение
  - Цвет кнопки определяется по реальному аудиотреку, а не по store
  - Позиция видео сохраняется при переключении аудиодорожки (`SyncVideoView.setAudioSource`)
  - Поддержка ISO 639-1 (`ru`) и ISO 639-2 (`rus`) для выбора русских субтитров
- **Кэш постеров** — корректная работа при обновлении постеров на десктопе
  - Валидация HTTP статуса после загрузки (BlobUtil создавал файл даже при 404)
  - Проверка размера файла — битые кэши (<1KB) автоматически перескачиваются
  - Cache-busting через `path|timestamp` формат и `?v=` параметр в file:// URI

## [0.5.4] - 2026-02-28

### Fixed

- Исправлен оффлайн-режим (Phase 8.3)

## [0.5.3] - 2026-02-27

### Added

- Умные переходы между эпизодами (Phase 8.5)
- Режимы просмотра (Phase 8.6)

## [0.5.2] - 2026-02-26

### Fixed

- Исправлен PiP режим (Phase 8.2)
- UI polish (Phase 8.4)

## [0.5.1] - 2026-02-25

### Fixed

- Баг-фиксы плеера (Phase 8.1)

## [0.5.0] - 2026-02-06

### Changed

- **React Native 0.80.3 → 0.83.2** — обновление фреймворка с включением New Architecture
  - React 19.1.0 → 19.2.4
  - Gradle 8.11.1 → 8.13
  - `newArchEnabled=true` — включена New Architecture (Fabric + TurboModules)
  - Убран `android.enableJetifier` (deprecated)
  - Обновлён `@react-native-community/cli` до 20.1.1

- **TurboModules миграция** — 6 нативных модулей переведены на TurboModule архитектуру
  - `HapticsModule` — haptic feedback (void методы)
  - `DownloadServiceModule` — foreground service для загрузок
  - `BrightnessModule` — управление яркостью экрана (Promise методы)
  - `VolumeModule` — управление системной громкостью (Promise методы)
  - `KeyEventModule` — обработка аппаратных кнопок (EventEmitter)
  - `PipModule` — Picture-in-Picture (методы + EventEmitter)
  - Каждый модуль имеет TypeScript spec в `specs/`, Kotlin наследует от сгенерированного Spec класса
  - Удалены все `*Package.kt` файлы — codegen auto-registration

- **Fabric Components** — 2 ViewManager'а обновлены для Fabric совместимости
  - `SyncVideoView` — spec с props, events (DirectEventHandler), commands
  - `AssSubtitleView` — spec с props и commands
  - JS компоненты используют `codegenNativeComponent` и `codegenNativeCommands`
  - Убраны все `requireNativeComponent`, `UIManager.dispatchViewManagerCommand`, `findNodeHandle`

### Removed

- **react-native-reanimated** — заменён на стандартный `Animated` API
  - `GestureLayer.tsx`: `FadeIn`/`FadeOut`/`ZoomIn` → кастомные `FadeView`/`ZoomFadeView` на `Animated.timing()`
  - Удалён `'react-native-reanimated/plugin'` из babel.config.js
- Все legacy API вызовы: `NativeModules.*`, `requireNativeComponent()`, `UIManager.dispatchViewManagerCommand()`, `findNodeHandle()`
- 6 файлов `*Package.kt` (HapticsPackage, DownloadServicePackage, BrightnessPackage, VolumePackage, KeyEventPackage, PipPackage)

## [0.4.2] - 2026-02-05

### Added

- **Отображение прогресса просмотра в списке эпизодов** — AnimeScreen теперь показывает прогресс для всех эпизодов
  - Прогресс загружается из локального AsyncStorage (не зависит от API)
  - Прогресс-бар для эпизодов с прогрессом 1-89%
  - Зелёная точка для завершённых эпизодов (≥90%)
  - Логирование загруженного прогресса для отладки

## [0.4.1] - 2026-02-04

### Fixed

- **Краш при нажатии аппаратных кнопок громкости и Назад** — `MainActivity.dispatchKeyEvent()` пытался отправить события всех аппаратных кнопок в JS через `reactInstanceManager`, что вызывало краш
  - Кнопки громкости (VOLUME_UP/DOWN/MUTE) и Back передаются системе напрямую без отправки в JS
  - Back обрабатывается React Navigation через `BackHandler`, не через `dispatchKeyEvent`
  - Обёрнут доступ к `reactInstanceManager` в try-catch (`Throwable`) для защиты от любых ошибок
  - Аналогичная защита добавлена в `onPictureInPictureModeChanged`
- **PiP при паузе** — видео больше не сворачивается в PiP при выходе на домашний экран, если воспроизведение на паузе (`autoEnterOnBackground: isPlaying`)

## [0.4.0] - 2026-02-03

### Added

- **Android Foreground Service для загрузок** — загрузки продолжаются при сворачивании приложения
  - `DownloadService.kt` — foreground service с notification channel (IMPORTANCE_LOW, без звука)
  - `DownloadServiceModule.kt` — NativeModule для управления service из JS
  - `DownloadServicePackage.kt` — ReactPackage для регистрации модуля
  - Notification с прогресс-баром, тап открывает приложение
  - `foregroundServiceType="dataSync"` для API 29+
  - Автостарт при начале очереди, автостоп при пустой очереди
  - Throttle обновлений notification — только при изменении целого процента

### Fixed

- **Баг зависания загрузки на 100%** — progress callback рапортовал `received === total` раньше закрытия HTTP-соединения IPFS gateway
  - Watchdog каждые 10 сек: если прогресс = 100% более 30 сек → проверка файла на диске → принудительное завершение
  - Watchdog: если нет progress callback 120 сек → отмена загрузки с ошибкой
  - Если файл на диске полный (±1% от expected size) после cancel — считается успешной загрузкой

## [0.2.2] - 2026-02-03

### Fixed

- **Исправлен перехват тапов в плеере** — тапы теперь работают когда контролы скрыты
  - Причина: `isClickable = false` в SyncVideoView.kt предотвращал получение touch событий
  - Решение: `isClickable = true` на FrameLayout контейнере, при этом PlayerView остаётся disabled
  - Native компонент теперь отправляет `onSyncVideoTap` событие в React Native

## [0.2.1] - 2026-02-03

### Added

- Улучшен Resume Overlay: видео не загружается до выбора пользователя "Продолжить" или "Сначала"
- Кнопка "Продолжить просмотр" в AnimeScreen — автоматический переход на сохранённую позицию последнего эпизода

### Changed

- `useWatchProgress`: добавлена опция `skipResumePrompt` для пропуска диалога при внешнем `startTime`
- PlayerScreen: логика отложенного рендеринга видео через `userMadeResumeDecision`

## [0.2.0] - 2026-02-01

### Added

- VLC-style жесты плеера
  - Масштаб видео (contain/cover) — JS-based вычисление размеров
  - Улучшенный сикбар с динамической шириной через onLayout
  - Double tap ±10 сек через PanResponder
  - Свайп громкость справа (react-native-volume-manager)
  - Свайп яркость слева (react-native-screen-brightness)
  - Свайп перемотка по центру
  - Long press = 2x ускорение
  - Тап для показа контролов с задержкой для double tap

### Changed

- Блокировка экрана упрощена до кнопки разблокировки
- ASS субтитры: fontScale увеличен до 1.5
- Улучшена синхронизация видео и аудиодорожек

### Fixed

- Исправлена навигация между экранами
- Исправлен файловый плеер

## [0.1.0] - 2026-01-31

### Added

#### Инфраструктура (Фаза 1)

- React Native проект с TypeScript
- Nx интеграция (project.json)
- Metro bundler для монорепо
- Тёмная тема Tamagui (purple accent)
- React Navigation 7.x с типизацией
- Zustand store с AsyncStorage persistence

#### Экраны

- **ConnectScreen** — QR сканер для подключения к Animatrona Desktop
- **LibraryScreen** — Библиотека аниме с поиском, фильтрами, сортировкой
- **AnimeScreen** — Детали аниме с blur header и списком эпизодов
- **PlayerScreen** — Видеоплеер с контролами, субтитрами, автосохранением

#### Жесты плеера (Фаза 5)

- GestureLayer с react-native-gesture-handler
- Double-tap ±10 сек с ripple эффектом
- Вертикальный свайп: громкость (лево), яркость (право)
- Горизонтальный свайп: перемотка

#### Модальные окна плеера

- TrackSelector — выбор аудио и субтитров
- SpeedSelector — скорость воспроизведения (0.5x - 2x)
- SkipChapterButton — пропуск OP/ED
- NextEpisodeOverlay — автопереход к следующему эпизоду

#### Picture-in-Picture

- usePictureInPicture хук
- PipModule нативный модуль для Android
- ChapterMarkers — маркеры OP/ED на прогресс-баре

#### Хуки

- useNetworkStatus — отслеживание состояния сети
- useBrightness — управление яркостью экрана
- useWakeLock — предотвращение засыпания экрана
- usePlayerGestures — обработка жестов плеера

#### Нативные модули

- **libs/exoplayer-ass** — ASS субтитры через libass (JNI + C++)
- **libs/exoplayer-sync** — MergingMediaSource для видео + аудио
