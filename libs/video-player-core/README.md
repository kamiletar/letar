# @letar/video-player-core

Vanilla JS ядро видеоплеера на базе Shaka Player.

## Установка

```bash
bun add @letar/video-player-core shaka-player
```

## Использование

### Базовое использование

```typescript
import { ShakaPlayerManager } from '@letar/video-player-core'
import shaka from 'shaka-player'

const container = document.getElementById('player')!

const player = new ShakaPlayerManager({ container })

// Инициализация с Shaka Player
await player.init({
  src: 'http://localhost:8765/ipfs/QmVideoHash',
  startTime: 0,
  autoPlay: false,
  Shaka: shaka,
})

// События
player.on('ready', () => console.log('Player ready'))
player.on('timeupdate', ({ currentTime, duration }) => {
  console.log(`${currentTime} / ${duration}`)
})
player.on('ended', () => console.log('Video ended'))

// Управление
player.play()
player.pause()
player.seek(60) // Перейти к 60 секундам
player.setVolume(0.5)
player.setPlaybackRate(1.5)
player.toggleFullscreen()

// Cleanup
player.destroy()
```

### Синхронизация video + audio

Для режима раздельных аудиодорожек:

```typescript
import { AudioSyncManager, ShakaPlayerManager } from '@letar/video-player-core'

const video = document.createElement('video')
const audio = document.createElement('audio')
audio.src = 'http://localhost:8765/ipfs/QmAudioHash'

const player = new ShakaPlayerManager({
  container,
  usesSeparateAudio: true,
})

await player.init({ src, Shaka: shaka })

const audioSync = new AudioSyncManager(video, audio)
audioSync.init()

// При уничтожении
audioSync.destroy()
player.destroy()
```

### Субтитры

```typescript
import { SubtitleManager } from '@letar/video-player-core'

const video = document.querySelector('video')!
const subtitles = new SubtitleManager({ video })

// Загрузить SRT или VTT
const vttUrl = await subtitles.loadNative('http://localhost:8765/ipfs/QmSubsHash')

// Подписаться на cuechange для кастомного оверлея
subtitles.onCueChange((cues) => {
  cues.forEach((cue) => console.log(cue.text))
})

subtitles.destroy()
```

### Горячие клавиши

```typescript
import { KeyboardHandler } from '@letar/video-player-core'

const keyboard = new KeyboardHandler({ video })

keyboard.setCallbacks({
  onTogglePlay: () => (player.isPlaying ? player.pause() : player.play()),
  onSeek: (delta) => player.seek(player.getCurrentTime() + delta),
  onToggleMute: () => player.setVolume(player.getVolume() === 0 ? 1 : 0),
  onToggleFullscreen: () => player.toggleFullscreen(),
  onPlaybackRateChange: (delta) => player.setPlaybackRate(player.getPlaybackRate() + delta),
})

keyboard.register()

// При уничтожении
keyboard.destroy()
```

### Автоскрытие контролов

```typescript
import { ControlsAutoHide } from '@letar/video-player-core'

const autoHide = new ControlsAutoHide({
  timeout: 3000,
  onVisibilityChange: (visible) => {
    controls.style.opacity = visible ? '1' : '0'
  },
})

// При движении мыши
container.addEventListener('mousemove', () => autoHide.resetTimeout())

// При play/pause
player.on('play', () => autoHide.setPlaying(true))
player.on('pause', () => autoHide.setPlaying(false))

autoHide.destroy()
```

## Утилиты

### Media URLs

```typescript
import { getAudioUrl, getVideoUrl, isIpfsUrl, toPlayableUrl } from '@letar/video-player-core'

// IPFS CID → HTTP URL
toPlayableUrl({ cid: 'QmHash' })
// → 'http://localhost:8765/ipfs/QmHash'

// Локальный путь → media:// URL
toPlayableUrl({ path: 'C:/Videos/video.mp4' })
// → 'media://C:/Videos/video.mp4'

// Helpers
getVideoUrl({ transcodedCid: 'QmHash' })
getAudioUrl({ transcodedCid: 'QmHash' })
isIpfsUrl('http://localhost:8765/ipfs/QmHash') // true
```

### SRT → VTT

```typescript
import { loadSubtitleAsVtt, revokeSubtitleUrl, srtToVtt } from '@letar/video-player-core'

// Конвертация SRT → VTT
const vttContent = srtToVtt(srtContent)

// Загрузка и конвертация
const blobUrl = await loadSubtitleAsVtt('media://C:/Videos/subs.srt')

// Освобождение
revokeSubtitleUrl(blobUrl)
```

## Константы

```typescript
import {
  AUDIO_SYNC_THRESHOLD, // 0.1 сек
  HIDE_CONTROLS_TIMEOUT, // 3000 мс
  IPFS_GATEWAY_PORT, // 8765
  PLAYBACK_SPEEDS, // [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
  SKIP_TIME, // 10 сек
  VOLUME_STEP, // 0.1
} from '@letar/video-player-core'
```

## Типы

```typescript
import type {
  AudioTrackInfo,
  PlayerAPI,
  PlayerEventHandler,
  PlayerEventMap,
  PlayerOptions,
  PlayerState,
  SubtitleTrackInfo,
  VideoMetadata,
} from '@letar/video-player-core'
```

## Архитектура

```
@letar/video-player-core
├── managers/
│   ├── ShakaPlayerManager   # Shaka Player wrapper
│   ├── AudioSyncManager     # Video + Audio синхронизация
│   ├── SubtitleManager      # SRT/VTT субтитры
│   ├── KeyboardHandler      # Горячие клавиши
│   ├── ControlsAutoHide     # Автоскрытие контролов
│   └── PlayerEventEmitter   # Event system
├── utils/
│   ├── media-url            # IPFS/media:// URL helpers
│   └── srt-to-vtt           # SRT → VTT конвертация
├── types/
│   ├── player               # Player types
│   ├── tracks               # Audio/Subtitle types
│   └── events               # Event types
└── constants                # Константы
```
