# @letar/video-player-react

React bindings для `@letar/video-player-core`.

## Установка

```bash
bun add @letar/video-player-react @letar/video-player-core shaka-player
```

## Использование

### Базовый плеер

```tsx
import {
  useAudioSync,
  useAutoHideControls,
  useKeyboardShortcuts,
  usePlayerControls,
  useShakaPlayer,
} from '@letar/video-player-react'
import { useRef, useState } from 'react'
import shaka from 'shaka-player'

function VideoPlayer({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const usesSeparateAudioRef = useRef(false)

  const [isMuted, setIsMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)

  // Инициализация Shaka Player
  const { videoRef, isVideoReady, isLoading } = useShakaPlayer({
    src,
    containerRef,
    audioRef,
    usesSeparateAudioRef,
    ShakaClass: shaka,
    onDurationChange: setDuration,
  })

  // Синхронизация audio (если раздельные дорожки)
  useAudioSync({
    videoRef,
    audioRef,
    usesSeparateAudio: usesSeparateAudioRef.current,
    isVideoReady,
  })

  // Управление воспроизведением
  const { togglePlay, toggleMute, toggleFullscreen, skipTime } = usePlayerControls({
    videoRef,
    audioRef,
    containerRef,
    usesSeparateAudio: usesSeparateAudioRef.current,
    usesSeparateAudioRef,
    duration,
    setIsMuted,
  })

  // Автоскрытие контролов
  const { showControls, resetHideTimeout } = useAutoHideControls({ isPlaying })

  // Горячие клавиши
  useKeyboardShortcuts({
    videoRef,
    togglePlay,
    toggleMute,
    toggleFullscreen,
    skipTime,
  })

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimeout}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      {isLoading && <div>Loading...</div>}

      {/* Audio элемент для раздельных дорожек */}
      <audio ref={audioRef} />

      {/* Контролы */}
      {showControls && (
        <div style={{ position: 'absolute', bottom: 0, width: '100%' }}>
          <button onClick={togglePlay}>{isPlaying ? 'Pause' : 'Play'}</button>
          <button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</button>
          <button onClick={toggleFullscreen}>Fullscreen</button>
        </div>
      )}
    </div>
  )
}
```

### Раздельные аудиодорожки

```tsx
import { getAudioUrl, useAudioSync, useShakaPlayer } from '@letar/video-player-react'
import { useMemo, useRef } from 'react'

function VideoPlayerWithSeparateAudio({ videoSrc, audioTracks, currentAudioTrackId }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const usesSeparateAudioRef = useRef(true)

  const currentTrack = useMemo(
    () => audioTracks.find((t) => t.id === currentAudioTrackId),
    [audioTracks, currentAudioTrackId]
  )

  const { videoRef, isVideoReady } = useShakaPlayer({
    src: videoSrc,
    containerRef,
    audioRef,
    usesSeparateAudioRef,
    ShakaClass: shaka,
  })

  // Синхронизация с указанием текущей дорожки
  useAudioSync({
    videoRef,
    audioRef,
    usesSeparateAudio: true,
    isVideoReady,
    currentAudioTrackId,
  })

  const audioSrc = currentTrack ? getAudioUrl(currentTrack) : null

  return (
    <div ref={containerRef}>
      <audio ref={audioRef} src={audioSrc || undefined} />
    </div>
  )
}
```

### Субтитры

```tsx
import { useShakaPlayer, useSubtitles } from '@letar/video-player-react'
import { useRef } from 'react'

function VideoPlayerWithSubtitles({ src, subtitleUrl }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const usesSeparateAudioRef = useRef(false)

  const { videoRef, isVideoReady } = useShakaPlayer({
    src,
    containerRef,
    audioRef,
    usesSeparateAudioRef,
    ShakaClass: shaka,
  })

  const { loadNative, show, hide } = useSubtitles({
    videoRef,
    isVideoReady,
    onCueChange: (cues) => {
      console.log('Current cues:', cues)
    },
  })

  // Загрузка субтитров
  useEffect(() => {
    if (isVideoReady && subtitleUrl) {
      loadNative(subtitleUrl)
    }
  }, [isVideoReady, subtitleUrl, loadNative])

  return (
    <div ref={containerRef}>
      <audio ref={audioRef} />
      <button onClick={show}>Show Subs</button>
      <button onClick={hide}>Hide Subs</button>
    </div>
  )
}
```

## Хуки

### useShakaPlayer

Инициализация и управление Shaka Player.

```typescript
const { videoRef, managerRef, isVideoReady, isLoading, reload } = useShakaPlayer({
  src: string
  startTime?: number
  autoPlay?: boolean
  containerRef: RefObject<HTMLDivElement>
  audioRef: RefObject<HTMLAudioElement>
  usesSeparateAudioRef: MutableRefObject<boolean>
  ShakaClass: typeof shaka
  onError?: (error: Error) => void
  onDurationChange?: (duration: number) => void
  onVideoReady?: () => void
})
```

### useAudioSync

Синхронизация video + audio элементов.

```typescript
useAudioSync({
  videoRef: MutableRefObject<HTMLVideoElement>
  audioRef: RefObject<HTMLAudioElement>
  usesSeparateAudio: boolean
  isVideoReady: boolean
  currentAudioTrackId?: string
})
```

### usePlayerControls

Функции управления воспроизведением.

```typescript
const {
  togglePlay,
  handleSeek,
  handleVolumeChange,
  toggleMute,
  toggleFullscreen,
  skipTime,
  play,
  pause,
  seek,
  setVolume,
  setPlaybackRate,
} = usePlayerControls({
  videoRef: MutableRefObject<HTMLVideoElement>
  audioRef: RefObject<HTMLAudioElement>
  containerRef: RefObject<HTMLDivElement>
  usesSeparateAudio: boolean
  usesSeparateAudioRef: MutableRefObject<boolean>
  duration: number
  setIsMuted: (v: boolean) => void
})
```

### useAutoHideControls

Автоскрытие контролов при воспроизведении.

```typescript
const { showControls, resetHideTimeout, show, hide } = useAutoHideControls({
  isPlaying: boolean
  timeout?: number
})
```

### useKeyboardShortcuts

Горячие клавиши плеера.

```typescript
useKeyboardShortcuts({
  videoRef: RefObject<HTMLVideoElement>
  togglePlay: () => void
  skipTime: (seconds: number) => void
  toggleMute: () => void
  toggleFullscreen: () => void
  adjustPlaybackSpeed?: (delta: number) => void
  toggleVideoInfo?: () => void
  disabled?: boolean
})
```

### useSubtitles

Управление субтитрами (SRT/VTT).

```typescript
const { managerRef, loadNative, show, hide, activeTrackLabel, isLoading } = useSubtitles({
  videoRef: MutableRefObject<HTMLVideoElement>
  isVideoReady: boolean
  onCueChange?: (cues: VTTCue[]) => void
})
```

## Реэкспорт из Core

Библиотека реэкспортирует всё из `@letar/video-player-core`:

```typescript
import {
  AUDIO_SYNC_THRESHOLD,
  type AudioTrackInfo,
  getAudioUrl,
  getVideoUrl,
  // Константы
  HIDE_CONTROLS_TIMEOUT,
  loadSubtitleAsVtt,
  PLAYBACK_SPEEDS,
  type PlayerOptions,
  // Типы
  type PlayerState,
  SKIP_TIME,
  srtToVtt,
  type SubtitleTrackInfo,
  // Утилиты
  toPlayableUrl,
  VOLUME_STEP,
} from '@letar/video-player-react'
```

## Архитектура

```
@letar/video-player-react
├── hooks/
│   ├── useShakaPlayer      # Shaka Player wrapper
│   ├── useAudioSync        # Video + Audio синхронизация
│   ├── usePlayerControls   # Play/Pause/Seek/Volume
│   ├── useAutoHideControls # Автоскрытие контролов
│   ├── useKeyboardShortcuts # Горячие клавиши
│   └── useSubtitles        # SRT/VTT субтитры
└── index.ts                # Реэкспорт core + hooks
```
