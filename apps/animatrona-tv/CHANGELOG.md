# Changelog

## [0.5.3] - 2026-08-20

### Changed

- Дублирующийся паттерн «экран ошибки» (центрированное сообщение + кнопка(и) повтора/назад)
  из 4 мест (`TVPlayerScreen.tsx` ×2, `TVHomeScreen.tsx`, `TVAnimeScreen.tsx`) вынесен в
  `components/tv/TVErrorScreen.tsx`

## [0.5.2] - 2026-08-20

### Changed

- `TVPlayerScreen.tsx` (652 строки) разбит на подкомпоненты: диалог возобновления просмотра
  вынесен в `components/tv/ResumeOverlay.tsx` (по образцу уже существующего
  `TVNextEpisodeOverlay.tsx`), загрузка аниме/эпизода и выбор дефолтных аудио/субтитр дорожек —
  в хук `hooks/usePlayerEpisode.ts`. Экран сократился до ~550 строк, логика загрузки данных
  отделена от рендера плеера

## [0.5.1] - 2026-08-20

### Changed

- Убрано дублирование `({ focused }: TVPressableState) => [...]` в ~20 местах 9 файлов — вынесен
  helper `focusableStyle(base, focusedStyle, after?)` в `src/utils/tvStyles.ts`

## [0.5.0] - 2026-08-20

### Changed

- Убран локальный пин `react` (19.2.3) — версии зависимостей только в корне монорепо
- Обновление React Native 0.84.1 → 0.87.0 вслед за корневым пином и `animatrona-mobile`
- Миграция кода под breaking changes RN 0.87: `StyleSheet.absoluteFillObject` → `absoluteFill`,
  `TextInput` ref-тип → `TextInputInstance`, `PressableStateCallbackType` (0.87 — `type`, не
  `interface`) перестал расширяться через declaration merging — заменено на локальный union-тип
  `TVPressableState` с явной аннотацией параметра
- `libs/exoplayer-ass`/`libs/exoplayer-sync`: `@types/react` `^18.3.18` → `^19.2.18` (унификация с
  корнем), `StyleSheet.flatten(...)` может вернуть `null` в типах RN 0.87 — добавлен `?? undefined`

## [0.4.0] - 2026-03-02

### Changed

- Обновление React Native 0.80.3 → 0.84.1
- Обновление React 19.1.0 → 19.2.3
- Исправлены runtime краши после обновления RN 0.84
- Исправлены deprecation warnings

## [0.3.0] - 2026-02-06

### Улучшено

- **Фокус-стейты** — кардинально улучшена видимость фокуса на TV:
  - Бордеры увеличены 2-3px → 4px, цвет изменён на белый (#fff) для максимального контраста
  - Добавлены фоновые изменения при фокусе (backgroundColor) на всех интерактивных элементах
  - Scale transforms увеличены (1.05→1.1, кнопки play до 1.2)
  - Добавлен Android `elevation` вместо iOS-only `shadowColor`
- **TextInput** — добавлен фокус-стейт на ConnectScreen (бордер + фон) и onSubmitEditing
- **FlatList TV** — увеличен windowSize/initialNumToRender, заменён gap на ItemSeparatorComponent для лучшей совместимости с D-pad навигацией
- **TVRow** — исправлен порядок хуков (useCallback перед ранним return)

## [0.2.0] - 2026-02-03

### Добавлено

- Адаптивная иконка приложения (ic_launcher с фиолетовым фоном)
- Полноценное тестирование на Android TV эмулляторе (AOSP TV API 36)

### Исправлено

- **SDK path** — создан `local.properties` для корректной сборки exoplayer-ass/exoplayer-sync модулей
- **JDK path** — исправлен `gradle.properties` (org.gradle.java.home), WebStorm JBR не содержит jlink
- **Тема** — изменена с `Theme.Leanback` на `Theme.AppCompat.NoActionBar` (требование ReactActivity)
- **Metro config** — полная переработка для поддержки монорепо libs/ (nodeModulesPaths, singletonPackages, resolveRequest)
- **JAVA_HOME** в project.json — исправлен путь на `C:\Android\jdk-17.0.13+11`

### Проверено на эмуляторе

- TVConnectScreen — ввод URL, D-pad навигация, подключение к серверу
- TVHomeScreen — отображение библиотеки, карточки аниме, секции
- TVAnimeScreen — детали аниме, список эпизодов
- TVPlayerScreen — видеоплеер, overlay контролы, Play/Pause, перемотка, аудио/субтитры

## [0.1.0] - 2026-02-03

### Добавлено

- Инициализация проекта React Native 0.80.3 для Android TV
- Экраны: Connect, Home, Anime, Player, Settings
- Интеграция SyncVideoPlayer (exoplayer-sync) и ASS субтитров (exoplayer-ass)
- D-Pad навигация с визуальным фокусом на всех экранах
- Выбор аудиодорожки и субтитров (TVTrackSelector)
- Автоскрытие контролов плеера
- Сохранение прогресса просмотра (useWatchProgress)
- Экран настроек (TVSettingsScreen)
