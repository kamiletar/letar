# Changelog

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
