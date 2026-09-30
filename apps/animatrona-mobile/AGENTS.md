# Animatrona Mobile — Инструкции для разработки

## ⚠️ ОБЯЗАТЕЛЬНО: Версионирование в логах

**При любых изменениях в touch handling или других проблемных местах — ВСЕГДА обновляй версию во ВСЕХ файлах и проверяй в логах!**

Это критично из-за агрессивного кэширования на всех уровнях (Metro, Gradle, устройство).

```js
// index.js — версия JS bundle
const JS_VERSION = '0.8.4-native-tap'
console.log(`[AnimatronaMobile] JS Bundle version: ${JS_VERSION}`)
```

```typescript
// PlayerScreen.tsx — версия экрана
const DEBUG_VERSION = '0.8.4'
console.log(`[PlayerScreen v${DEBUG_VERSION}] state:`, ...)
```

```kotlin
// SyncVideoView.kt — версия нативного кода (требует пересборки APK!)
companion object { private const val VERSION = "0.8.0" }
Log.d(TAG, "v$VERSION onTouchEvent ACTION_DOWN...")
```

**Проверка:** `adb logcat` должен показывать ожидаемые версии. Если версии старые — очисти кэш (см. ниже).

---

## Нативные модули (TurboModules, v0.5.0+)

Все нативные модули используют TurboModule архитектуру (specs в `specs/`):

| Модуль                | Spec                                   | Описание                                |
| --------------------- | -------------------------------------- | --------------------------------------- |
| HapticsModule         | `specs/NativeHapticsModule.ts`         | Haptic feedback (light/medium/heavy)    |
| DownloadServiceModule | `specs/NativeDownloadServiceModule.ts` | Foreground Service для загрузок         |
| BrightnessModule      | `specs/NativeBrightnessModule.ts`      | Яркость экрана (Window API)             |
| VolumeModule          | `specs/NativeVolumeModule.ts`          | Системная громкость (AudioManager)      |
| KeyEventModule        | `specs/NativeKeyEventModule.ts`        | D-pad, аппаратные кнопки (EventEmitter) |
| PipModule             | `specs/NativePipModule.ts`             | Picture-in-Picture (EventEmitter)       |

Fabric Components (specs в `libs/`):

| Компонент       | Spec                                                       | Описание                               |
| --------------- | ---------------------------------------------------------- | -------------------------------------- |
| SyncVideoView   | `libs/exoplayer-sync/src/SyncVideoViewNativeComponent.ts`  | Видео + аудио через MergingMediaSource |
| AssSubtitleView | `libs/exoplayer-ass/src/AssSubtitleViewNativeComponent.ts` | ASS субтитры через libass (JNI)        |

## Известные проблемы и решения

1. **Touch interception в ExoPlayer** — ✅ **РЕШЕНО в v0.2.2**

   **Проблема:** Тапы работали ТОЛЬКО когда контролы видны. Когда контролы скрыты — тапы не регистрировались.

   **Причина:** `isClickable = false` на FrameLayout контейнере SyncVideoView предотвращал вызов `onTouchEvent()`.

   **Решение:**
   - FrameLayout (контейнер): `isClickable = true` — получает touch события
   - PlayerView (дочерний): `isClickable = false`, `isEnabled = false` — не перехватывает тачи
   - `onTouchEvent()` в SyncVideoView обрабатывает ACTION_UP и отправляет `onSyncVideoTap` событие в RN

   **Файлы:**
   - `libs/exoplayer-sync/android/.../SyncVideoView.kt` — native touch handling
   - `src/components/SyncVideoPlayer.tsx` — обработка `onTap` события
   - `src/screens/PlayerScreen.tsx` — `handleVideoTap` callback

2. **Metro порт конфликт с IPFS (kubo)** — На Windows kubo занимает 127.0.0.1:8081, блокируя Metro bundler.
   - **Решение:** Запускать Metro на порту 8082:
     ```bash
     npx react-native start --port 8082
     adb reverse tcp:8081 tcp:8082  # Перенаправить 8081 на устройстве → 8082 на PC
     ```
   - **ВАЖНО:** Порт 8081 занят, всегда использовать 8082!

3. **JS Bundle кэширование** — Gradle может кэшировать старый JS bundle в APK. Очистка:

   ```bash
   rm android/app/build/intermediates/assets/debug/mergeDebugAssets/index.android.bundle
   rm android/app/src/main/assets/index.android.bundle
   ./gradlew clean assembleDebug --no-build-cache
   ```

4. **Metro кэш** — Регулярно возникают проблемы с кэшем Metro (ошибка "Unable to deserialize cloned data"). Решение:

   ```bash
   # Очистить кэш Metro
   npx react-native start --reset-cache --port 8082

   # Или удалить кэш вручную
   rm -rf node_modules/.cache
   rm -rf $TMPDIR/metro-*
   ```

5. **Версионирование для отладки кэша** — ✅ Реализовано везде:

   **Правило:** При любых изменениях в touch handling обновляй версию во ВСЕХ файлах:

   ```js
   // index.js - версия JS bundle
   const JS_VERSION = '0.7.0-tap-debug'
   console.log(`[AnimatronaMobile] JS Bundle version: ${JS_VERSION}`)
   ```

   ```typescript
   // PlayerScreen.tsx - версия экрана
   const DEBUG_VERSION = '0.7.0'
   console.log(`[PlayerScreen v${DEBUG_VERSION}] state:`, ...)
   console.log(`[PlayerScreen v${DEBUG_VERSION}] handleVideoTap called!`)
   ```

   ```typescript
   // SyncVideoPlayer.tsx - версия компонента
   console.log('[SyncVideoPlayer v0.7.0] onTap received from native:', ...)
   ```

   ```kotlin
   // SyncVideoView.kt - версия нативного кода
   companion object {
       private const val VERSION = "0.7.0"
   }
   Log.d(TAG, "v$VERSION onTouchEvent ACTION_DOWN at ...")
   Log.i(TAG, "v$VERSION emitTap: sending onSyncVideoTap event...")
   ```

   **ВАЖНО:**
   - Версия в нативном коде требует пересборки APK (`./gradlew clean assembleDebug`)
   - Версия в JS файлах обновляется через Metro hot reload
   - Всегда проверяй в логах что версии совпадают ожидаемым

6. **adb reverse обязателен** — После каждого перезапуска Metro нужно выполнить:

   ```bash
   /c/Android/Sdk/platform-tools/adb.exe reverse tcp:8081 tcp:8082
   ```

   - Без этого устройство не сможет подключиться к Metro на порту 8082
   - Проверить: `adb reverse --list`

## Сборка и установка APK

⚠️ **КРИТИЧНО:** Gradle (JVM) не наследует PATH из bash — нужно явно добавить `node` в PATH, иначе Gradle не найдёт его и сборка упадёт с ошибкой `node: not found`.

### Полный цикл сборки и установки

```bash
# 1. Подготовка окружения
export JAVA_HOME="/c/Android/jdk-17.0.13+11"
node_dir=$(dirname $(which node))           # Динамически: fnm_multishells меняет путь
export PATH="$node_dir:$JAVA_HOME/bin:$PATH"

# 2. Сборка JS bundle (ОБЯЗАТЕЛЬНО перед assembleDebug!)
cd /c/web/letar/apps/animatrona-mobile
npx react-native bundle --platform android --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/

# 3. Сборка APK
cd android && ./gradlew assembleDebug

# 4. Установка и запуск
/c/Android/Sdk/platform-tools/adb.exe install -r "C:/web/letar/apps/animatrona-mobile/android/app/build/outputs/apk/debug/app-debug.apk"
/c/Android/Sdk/platform-tools/adb.exe shell am force-stop com.letar.animatrona.mobile
/c/Android/Sdk/platform-tools/adb.exe shell am start -n com.letar.animatrona.mobile/.MainActivity
```

**APK:** `android/app/build/outputs/apk/debug/app-debug.apk` (~150 MB)

### ⚠️ Когда нужен ручной bundle

**ВСЕГДА** выполняй шаг 2 (`npx react-native bundle`) если:

- Удалял `app/build/generated/assets/` или `app/build/intermediates/assets/`
- Делал `./gradlew clean`
- JS bundle в APK оказался пустым (ошибка "Unable to load script" на устройстве)

Без явной сборки bundle `assembleDebug` может закэшировать старый или пустой bundle.

### Пересборка с чистым кэшем

```bash
# Если видны старые версии кода — удалить кэш assets и пересобрать bundle
rm -rf android/app/build/generated/assets/ android/app/build/intermediates/assets/
# Затем выполнить полный цикл сборки (шаги 2-4 выше)
```

**НЕ используй** `./gradlew clean` — ломает CMake autolinking для нативных модулей (exoplayer-sync, exoplayer-ass). Вместо этого удаляй только `assets/` директории.

---

## Окружение разработки (Windows)

```bash
# Переменные окружения для сборки
export JAVA_HOME="/c/Android/jdk-17.0.13+11"
export PATH="$JAVA_HOME/bin:$PATH"

# ADB команды
/c/Android/Sdk/platform-tools/adb.exe devices
/c/Android/Sdk/platform-tools/adb.exe install -r app.apk
/c/Android/Sdk/platform-tools/adb.exe logcat -s ReactNativeJS:* SyncVideoView:*
/c/Android/Sdk/platform-tools/adb.exe reverse tcp:8081 tcp:8082

# Скриншот с устройства
/c/Android/Sdk/platform-tools/adb.exe exec-out screencap -p > screen.png
```

## Методика тапа по координатам (ADB)

**Проблема:** Claude отображает скриншоты в сильно уменьшенном масштабе.

**ВАЖНО:** Указанный Claude масштаб "displayed at 878x2000" — это CSS размер, но реальный визуальный размер в интерфейсе ещё меньше!

**Эмпирически найденный scale (для экрана 1080x2460):**

- Scale X ≈ **4.26** (если displayed ширина ~254px визуально)
- Scale Y ≈ **2.36** (если displayed высота ~1043px визуально)

**Калибровка через известный элемент:**

1. Найти элемент с известной позицией (например, шестерёнка Settings в правом верхнем углу)
2. Оценить его координаты на отображённом изображении (X_displayed, Y_displayed)
3. Тапнуть по предполагаемым real координатам и проверить
4. Если сработало — вычислить scale: `scale_x = X_real / X_displayed`

**Проверенный пример (Redmi Note 8 Pro, 1080x2460):**

- Шестерёнка Settings: displayed ≈ (235, 55), real = (1000, 130)
- Scale X = 1000/235 ≈ 4.26
- Scale Y = 130/55 ≈ 2.36

**Алгоритм тапа:**

1. Визуально оценить координаты элемента на отображённом скриншоте
2. Умножить на scale: `X_real = X_displayed * 4.26`, `Y_real = Y_displayed * 2.36`
3. Выполнить: `adb shell input tap X_real Y_real`

**Пример — тап по карточке аниме:**

- Центр карточки на displayed: X≈100, Y≈290
- Real координаты: X = 100 _ 4.26 = 426, Y = 290 _ 2.36 = 684
- Команда: `adb shell input tap 426 684` ✅ Работает!

**Альтернатива — использовать keyevent:**

```bash
adb shell input keyevent 4   # BACK
adb shell input keyevent 66  # ENTER
adb shell input keyevent 20  # DPAD_DOWN
```

## Файлы жестов

- `src/components/player/GestureOverlay.tsx` — слой жестов с PanResponder
- `src/components/player/GestureLayer.tsx` — анимации (FadeView, ZoomFadeView) на стандартном Animated API
- `src/hooks/useBrightness.ts` — яркость экрана (TurboModule: NativeBrightnessModule)
- `src/hooks/useSystemVolume.ts` — системная громкость (TurboModule: NativeVolumeModule)

## Архитектура

```
animatrona-mobile/
├── android/
│   └── app/                    # Android проект (TurboModules в nativemodules/)
├── specs/                      # TurboModule TypeScript specs (codegen)
│   ├── NativeHapticsModule.ts
│   ├── NativeDownloadServiceModule.ts
│   ├── NativeBrightnessModule.ts
│   ├── NativeVolumeModule.ts
│   ├── NativeKeyEventModule.ts
│   └── NativePipModule.ts
├── src/
│   ├── api/                    # API клиент для desktop
│   ├── components/
│   │   ├── player/             # Компоненты плеера
│   │   │   ├── GestureOverlay.tsx
│   │   │   ├── GestureLayer.tsx  # FadeView, ZoomFadeView (стандартный Animated)
│   │   │   ├── LockOverlay.tsx
│   │   │   ├── SpeedSelector.tsx
│   │   │   └── ...
│   │   ├── NativeAssView.tsx   # ASS субтитры (Fabric Component)
│   │   ├── SrtSubtitleView.tsx # SRT субтитры
│   │   └── SyncVideoPlayer.tsx # Видеоплеер (Fabric Component)
│   ├── hooks/
│   │   ├── useBrightness.ts    # Яркость (TurboModule)
│   │   ├── useSystemVolume.ts  # Громкость (TurboModule)
│   │   ├── useLockScreen.ts    # Блокировка экрана
│   │   └── ...
│   ├── screens/
│   │   ├── PlayerScreen.tsx    # Главный экран плеера
│   │   ├── AnimeScreen.tsx     # Страница аниме
│   │   └── ConnectScreen.tsx   # Подключение
│   └── navigation/             # React Navigation
└── libs/
    ├── exoplayer-ass/          # ASS декодер (JNI + libass), Fabric spec
    └── exoplayer-sync/         # MergingMediaSource, Fabric spec
```
