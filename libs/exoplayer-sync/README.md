# @letar/exoplayer-sync

React Native компонент для синхронного воспроизведения видео + внешнего аудио через ExoPlayer MergingMediaSource.

## Преимущества MergingMediaSource

| Критерий           | Два Video компонента   | MergingMediaSource |
| ------------------ | ---------------------- | ------------------ |
| Синхронизация      | Ручная, возможен drift | На уровне фреймов  |
| Производительность | 2 декодера             | 1 декодер          |
| Seek/Pause         | Нужна синхронизация    | Атомарно           |
| Буферизация        | Раздельная             | Общая              |

## Использование

```tsx
import { SyncVideoPlayer, SyncVideoPlayerRef } from '@letar/exoplayer-sync'

const playerRef = useRef<SyncVideoPlayerRef>(null)

<SyncVideoPlayer
  ref={playerRef}
  videoSource="http://example.com/video.mp4"
  audioSource="http://example.com/audio.m4a"
  paused={false}
  volume={1.0}
  muted={false}
  resizeMode="contain"
  style={{ flex: 1 }}
  onLoad={({ duration, naturalWidth, naturalHeight }) => {
    console.log('Loaded:', duration, naturalWidth, naturalHeight)
  }}
  onProgress={({ currentTime, playableDuration }) => {
    console.log('Progress:', currentTime)
  }}
  onError={({ code, message }) => {
    console.error('Error:', code, message)
  }}
  onEnd={() => {
    console.log('Playback ended')
  }}
/>

// Управление через ref
playerRef.current?.seek(30)
playerRef.current?.play()
playerRef.current?.pause()
```

## Props

| Prop          | Тип                                 | По умолчанию | Описание                          |
| ------------- | ----------------------------------- | ------------ | --------------------------------- |
| `videoSource` | `string`                            | **required** | URI видео файла                   |
| `audioSource` | `string \| null`                    | `null`       | URI внешнего аудио (опционально)  |
| `paused`      | `boolean`                           | `true`       | Приостановлено ли воспроизведение |
| `volume`      | `number`                            | `1.0`        | Громкость (0.0 - 1.0)             |
| `muted`       | `boolean`                           | `false`      | Отключить звук                    |
| `resizeMode`  | `'contain' \| 'cover' \| 'stretch'` | `'contain'`  | Режим масштабирования             |
| `style`       | `ViewStyle`                         | —            | Стиль контейнера                  |

## Events

| Event        | Payload                                     | Описание                  |
| ------------ | ------------------------------------------- | ------------------------- |
| `onLoad`     | `{ duration, naturalWidth, naturalHeight }` | Медиа загружено           |
| `onProgress` | `{ currentTime, playableDuration }`         | Прогресс воспроизведения  |
| `onError`    | `{ code, message }`                         | Ошибка воспроизведения    |
| `onEnd`      | —                                           | Воспроизведение завершено |
| `onSeek`     | `{ currentTime, seekTime }`                 | Выполнен seek             |

## Ref методы

| Метод                   | Описание                       |
| ----------------------- | ------------------------------ |
| `seek(positionSeconds)` | Перемотка на указанную позицию |
| `play()`                | Начать воспроизведение         |
| `pause()`               | Приостановить воспроизведение  |

## Платформы

- ✅ Android (ExoPlayer + MergingMediaSource)
- ⏳ iOS (не реализовано — возвращает placeholder)

## Интеграция в приложение

### 1. settings.gradle

```gradle
include ':exoplayer-sync'
project(':exoplayer-sync').projectDir = new File(rootProject.projectDir, '../../../libs/exoplayer-sync/android')
```

### 2. build.gradle

```gradle
dependencies {
    implementation project(':exoplayer-sync')
}
```

### 3. MainApplication.kt

```kotlin
import com.lena.exoplayer.sync.SyncPackage

// В getPackages():
packages.add(SyncPackage())
```

### 4. tsconfig.json

```json
{
  "compilerOptions": {
    "paths": {
      "@letar/exoplayer-sync": ["../../libs/exoplayer-sync/src"]
    }
  }
}
```

### 5. metro.config.js

```js
const singletonPackages = {
  '@letar/exoplayer-sync': path.resolve(monorepoRoot, 'libs/exoplayer-sync/src'),
}
```
