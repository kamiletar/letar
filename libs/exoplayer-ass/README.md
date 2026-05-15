# @letar/exoplayer-ass

Нативный модуль для рендеринга ASS/SSA субтитров в React Native через libass и JNI.

## Архитектура

```
┌─────────────────────────────────────┐
│         ExoPlayer (видео)           │
├─────────────────────────────────────┤
│     AssSubtitleDecoder (Kotlin)     │  ← Кастомный декодер
│              ↓ JNI                  │
│     libass (C) → Bitmap             │  ← Нативный рендеринг
├─────────────────────────────────────┤
│   NativeAssView (React Native)      │  ← Отображение
└─────────────────────────────────────┘
```

## Использование

```tsx
import { NativeAssView } from '@letar/exoplayer-ass'

<Video onProgress={({ currentTime }) => setTime(currentTime * 1000)} />
<NativeAssView
  assContent={assFileContent}
  currentTimeMs={time}
  videoWidth={1920}
  videoHeight={1080}
  style={StyleSheet.absoluteFill}
  pointerEvents="none"
/>
```

## Зависимости

- **libass** — библиотека рендеринга ASS (подключается через FFmpeg Kit)
- **react-native-video** — для синхронизации с видео

## Сборка нативных библиотек

### Вариант A: FFmpeg Kit (рекомендуется)

```groovy
// android/build.gradle.kts
dependencies {
    implementation("com.arthenica:ffmpeg-kit-full:6.0-2")
}
```

### Вариант B: Ручная сборка libass

См. `apps/animatrona/ass-subtitles-android-guide.md`

## Структура файлов

```
libs/exoplayer-ass/
├── android/
│   ├── src/main/
│   │   ├── java/com/lena/exoplayer/ass/
│   │   │   ├── AssSubtitleDecoder.kt    # JNI обёртка
│   │   │   ├── AssSubtitleView.kt       # Native View
│   │   │   └── AssPackage.kt            # React Native package
│   │   ├── cpp/
│   │   │   ├── ass-bridge.cpp           # JNI мост к libass
│   │   │   └── CMakeLists.txt
│   │   └── jniLibs/
│   │       ├── arm64-v8a/               # 64-bit ARM библиотеки
│   │       └── armeabi-v7a/             # 32-bit ARM библиотеки
│   └── build.gradle.kts
├── src/
│   ├── index.tsx                        # React Native компонент
│   └── types.ts
└── package.json
```

## API

### NativeAssView Props

| Prop            | Type      | Description                                    |
| --------------- | --------- | ---------------------------------------------- |
| `assContent`    | `string`  | Содержимое ASS/SSA файла                       |
| `currentTimeMs` | `number`  | Текущее время видео в миллисекундах            |
| `videoWidth`    | `number`  | Ширина видео (для корректного масштабирования) |
| `videoHeight`   | `number`  | Высота видео                                   |
| `fontDir`       | `string?` | Путь к директории с кастомными шрифтами        |

## Производительность

- Рендеринг субтитров ~1-5ms на кадр
- Bitmap кэшируется когда субтитры не меняются
- GPU-ускорение через OpenGL (опционально)
