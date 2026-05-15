# Animatrona Mobile

React Native приложение для просмотра аниме из библиотеки Animatrona Desktop.

## Документация

| Файл                                   | Описание                             |
| -------------------------------------- | ------------------------------------ |
| [README.md](README.md)                 | Обзор проекта, установка, команды    |
| [PLAN.md](PLAN.md)                     | Текущие задачи, TODO, roadmap        |
| [PLAN_COMPLETED.md](PLAN_COMPLETED.md) | Завершённые фичи по версиям          |
| [PLAN_TESTING.md](PLAN_TESTING.md)     | План и статистика тестирования       |
| [CHANGELOG.md](CHANGELOG.md)           | История изменений (Keep a Changelog) |

## Возможности

- 📱 Подключение к Desktop через QR-код
- 📚 Просмотр библиотеки аниме
- 🎬 Воспроизведение видео через ExoPlayer
- 🔤 Поддержка ASS/SSA субтитров через libass
- 📊 Синхронизация прогресса просмотра
- 🎛️ Выбор аудиодорожек и субтитров
- 📺 Picture-in-Picture режим

## Технический стек

| Категория     | Библиотека                   | Версия    |
| ------------- | ---------------------------- | --------- |
| Framework     | React Native                 | 0.84.x    |
| UI            | Tamagui                      | 1.125+    |
| Navigation    | React Navigation             | 7.x       |
| Video         | react-native-video           | 6.9+      |
| Gestures      | Gesture Handler + Reanimated | 2.21/3.16 |
| State         | Zustand                      | 5.x       |
| ASS Subtitles | @letar/exoplayer-ass          | 0.1.0     |

**Min SDK:** Android 7.0 (API 24)

## Структура

```
apps/animatrona-mobile/
├── src/
│   ├── api/               # API клиент
│   │   ├── client.ts      # HTTP функции
│   │   └── types.ts       # TypeScript типы
│   ├── components/
│   │   ├── player/        # Компоненты плеера
│   │   ├── library/       # Компоненты библиотеки
│   │   └── common/        # Общие компоненты
│   ├── hooks/             # Кастомные хуки
│   ├── screens/           # Экраны
│   │   ├── ConnectScreen.tsx
│   │   ├── LibraryScreen.tsx
│   │   ├── AnimeScreen.tsx
│   │   └── PlayerScreen.tsx
│   ├── navigation/        # React Navigation
│   ├── store/             # Zustand stores
│   └── theme/             # Tamagui конфигурация
├── android/               # Android native код
└── App.tsx
```

## Установка

```bash
# Установка зависимостей
cd apps/animatrona-mobile
bun install

# Запуск Metro bundler
nx start animatrona-mobile

# Запуск на Android
nx android animatrona-mobile
```

## Подключение к Desktop

1. Запустите Animatrona Desktop
2. Откройте **Настройки → Mobile Server → Запустить сервер**
3. Нажмите **Показать QR-код**
4. В мобильном приложении отсканируйте QR-код

Также можно ввести адрес сервера вручную (например, `192.168.1.100:3100`).

## ASS/SSA субтитры

Приложение поддерживает полноценный рендеринг ASS/SSA субтитров через библиотеку libass.
Нативный модуль `@letar/exoplayer-ass` обеспечивает:

- Стили и позиционирование
- Кастомные шрифты
- Анимации и эффекты
- Караоке

См. `libs/exoplayer-ass/README.md` для деталей.

## Команды Nx

```bash
# Разработка
nx start animatrona-mobile      # Metro bundler
nx android animatrona-mobile    # Запуск на Android

# Сборка
nx build-android animatrona-mobile  # Release APK

# Качество кода
nx lint animatrona-mobile       # Линтинг
nx typecheck animatrona-mobile  # Проверка типов

# Очистка
nx clean animatrona-mobile      # Gradle clean
```

## Сборка Release APK

### Окружение (Windows)

```bash
# Java (JDK 17)
export JAVA_HOME="/c/Android/jdk-17.0.13+11"

# Node.js — управляется через fnm, нужно добавить в PATH
NODE_DIR=$(dirname "$(which node)")
export PATH="$NODE_DIR:$JAVA_HOME/bin:$PATH"
```

### Быстрая сборка (без изменения нативного кода)

```bash
cd apps/animatrona-mobile/android
./gradlew assembleRelease
```

APK: `app/build/outputs/apk/release/app-release.apk`

### Сборка с обновлением JS bundle

Gradle кэширует JS bundle. Если изменили только TypeScript/JS код, а бандл не обновился (`createBundleReleaseJsAndAssets UP-TO-DATE`):

```bash
cd apps/animatrona-mobile/android

# Удалить кэшированный бандл
rm -f app/build/generated/assets/react/release/index.android.bundle
rm -f app/build/generated/sourcemaps/react/release/index.android.bundle.map
rm -f app/build/intermediates/assets/release/mergeReleaseAssets/index.android.bundle

# Пересобрать
./gradlew assembleRelease
```

Или принудительно пересобрать только бандл:

```bash
./gradlew app:createBundleReleaseJsAndAssets --rerun-tasks
./gradlew assembleRelease
```

### Полная чистая сборка (нативные изменения)

> **Внимание:** `./gradlew clean` удаляет codegen директории, после чего CMake не может найти JNI пути. Используй этот метод только при изменении нативного кода (Kotlin/C++).

```bash
cd apps/animatrona-mobile/android

# Полная пересборка (долго, ~5-10 мин)
./gradlew clean && ./gradlew assembleRelease
```

Если clean + assembleRelease падает с ошибкой CMake (`add_subdirectory given source ... which is not an existing directory`), запусти сборку в два шага — codegen отработает при первой сборке:

```bash
./gradlew clean
./gradlew generateCodegenArtifactsFromSchema
./gradlew assembleRelease
```

### Установка на устройство

```bash
# Список подключённых устройств
/c/Android/Sdk/platform-tools/adb.exe devices

# Установка (если одно устройство)
/c/Android/Sdk/platform-tools/adb.exe install -r app/build/outputs/apk/release/app-release.apk

# Установка на конкретное устройство (если несколько)
/c/Android/Sdk/platform-tools/adb.exe -s <DEVICE_SERIAL> install -r app/build/outputs/apk/release/app-release.apk
```

### Подпись APK

Release APK подписывается автоматически ключом из `android/app/animatrona-mobile-release.keystore`. Конфигурация — в `android/app/build.gradle` секция `signingConfigs`.

## Roadmap

### Фаза 1 ✅ Инфраструктура

- [x] React Native проект
- [x] Tamagui тема
- [x] React Navigation
- [x] API клиент
- [x] QR сканер
- [x] exoplayer-ass модуль (JNI/C++ готов, нужна сборка libass)

### Фаза 2 ✅ Библиотека

- [x] LibraryScreen с FlatList
- [x] Pull-to-refresh
- [x] Фильтры по статусу и сортировка
- [x] Продолжить просмотр карточка
- [x] Поиск с debounce

### Фаза 3 ✅ Детали аниме

- [x] AnimeScreen с blur header
- [x] SectionList по сезонам со sticky headers
- [x] Прогресс эпизодов с индикаторами
- [x] Жанры, описание, метаданные

### Фаза 4 ✅ Видеоплеер

- [x] PlayerScreen с react-native-video (ExoPlayer)
- [x] Выбор аудиодорожек (TrackSelector)
- [x] Выбор субтитров (VTT через нативный TextTrack)
- [x] Fullscreen/Landscape + immersive mode
- [x] Автосохранение прогресса
- [x] Wake lock
- [x] ASS субтитры (NativeAssView)

### Фаза 5 ✅ Жесты

- [x] GestureLayer с react-native-gesture-handler
- [x] Double-tap ±10 сек с ripple эффектом
- [x] Swipe громкость (левая зона)
- [x] Swipe яркость (правая зона)
- [x] Seek свайп (центральная зона)
- [x] Индикаторы с Reanimated анимациями

### Фаза 6 ✅ Дополнительные фичи

- [x] SkipChapterButton (OP/ED)
- [x] NextEpisodeOverlay с countdown
- [x] SpeedSelector (0.5x - 2x)
- [x] OfflineIndicator
- [x] PiP режим (usePictureInPicture + PipModule)
- [x] ChapterMarkers на прогресс-баре

### Фаза 7 ✅ Release и оптимизация

- [x] Haptic feedback для жестов
- [x] Кэширование постеров
- [x] Signed release APK
- [x] Strip debug symbols из libass.so (21 MB → 3.5 MB)

---

**Версия:** 0.5.6 | **Обновлено:** 2026-03-11 | **React Native** 0.84 | **Min SDK** 24
