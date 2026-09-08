import type { AudioTrack, VideoTrack } from '@letar/folder-scan'
import { describe, expect, it } from 'vitest'

import {
  checkCodecSupport,
  getUnsupportedAudioLabel,
  getUnsupportedContainerLabel,
  isHi10pVideo,
  normalizeCodecKey,
  pickDefaultTrack,
} from './codec-support'

/** Минимальная валидная видеодорожка — переопределяем только то, что важно для теста */
function makeVideoTrack(overrides: Partial<VideoTrack> = {}): VideoTrack {
  return {
    path: '/anime/episode-01.mkv',
    duration: 1440,
    codec: 'h264',
    bitDepth: 8,
    ...overrides,
  }
}

/** Минимальная валидная аудиодорожка — переопределяем только то, что важно для теста */
function makeAudioTrack(overrides: Partial<AudioTrack> = {}): AudioTrack {
  return {
    input: '/anime/episode-01.mkv',
    index: 0,
    language: 'jpn',
    title: 'Japanese',
    codec: 'aac',
    ...overrides,
  }
}

describe('isHi10pVideo', () => {
  it('AVC + 10-битная глубина цвета — Hi10P, Chromium не декодирует', () => {
    const video = makeVideoTrack({ codec: 'h264', bitDepth: 10 })
    expect(isHi10pVideo(video)).toBe(true)
  })

  it('AVC + 8-битная глубина цвета — обычное видео', () => {
    const video = makeVideoTrack({ codec: 'h264', bitDepth: 8 })
    expect(isHi10pVideo(video)).toBe(false)
  })

  it('HEVC 10 бит НЕ считается Hi10P — намеренно, Chromium умеет HEVC аппаратно', () => {
    const video = makeVideoTrack({ codec: 'hevc', bitDepth: 10 })
    expect(isHi10pVideo(video)).toBe(false)
  })

  it('отсутствующая дорожка — false', () => {
    expect(isHi10pVideo(undefined)).toBe(false)
  })
})

describe('normalizeCodecKey', () => {
  it('приводит к нижнему регистру', () => {
    expect(normalizeCodecKey('AC3')).toBe('ac3')
  })

  it('убирает дефисы', () => {
    expect(normalizeCodecKey('E-AC3')).toBe('eac3')
  })

  it('убирает пробелы внутри строки', () => {
    expect(normalizeCodecKey('DTS HD')).toBe('dtshd')
  })

  it('обрезает пробелы по краям', () => {
    expect(normalizeCodecKey('  ac3  ')).toBe('ac3')
  })

  it('undefined даёт пустую строку', () => {
    expect(normalizeCodecKey(undefined)).toBe('')
  })
})

describe('getUnsupportedAudioLabel', () => {
  it('AC3 — не поддерживается', () => {
    const audio = makeAudioTrack({ codec: 'ac3' })
    expect(getUnsupportedAudioLabel(audio)).toBe('AC3')
  })

  it('DTS — не поддерживается', () => {
    const audio = makeAudioTrack({ codec: 'dts' })
    expect(getUnsupportedAudioLabel(audio)).toBe('DTS')
  })

  it('TrueHD — не поддерживается', () => {
    const audio = makeAudioTrack({ codec: 'truehd' })
    expect(getUnsupportedAudioLabel(audio)).toBe('TrueHD')
  })

  it('mlpfba — тот же TrueHD (альтернативное имя кодека у ffprobe)', () => {
    const audio = makeAudioTrack({ codec: 'mlpfba' })
    expect(getUnsupportedAudioLabel(audio)).toBe('TrueHD')
  })

  it('AAC — поддерживается, null', () => {
    const audio = makeAudioTrack({ codec: 'aac' })
    expect(getUnsupportedAudioLabel(audio)).toBeNull()
  })

  it('Opus — поддерживается, null', () => {
    const audio = makeAudioTrack({ codec: 'opus' })
    expect(getUnsupportedAudioLabel(audio)).toBeNull()
  })

  it('FLAC — поддерживается, null', () => {
    const audio = makeAudioTrack({ codec: 'flac' })
    expect(getUnsupportedAudioLabel(audio)).toBeNull()
  })

  it('отсутствующая дорожка — null', () => {
    expect(getUnsupportedAudioLabel(undefined)).toBeNull()
  })
})

describe('getUnsupportedContainerLabel', () => {
  it('.avi — не разбирается Chromium', () => {
    expect(getUnsupportedContainerLabel('/anime/episode-01.avi')).toBe('AVI')
  })

  it('.wmv — не разбирается Chromium', () => {
    expect(getUnsupportedContainerLabel('/anime/episode-01.wmv')).toBe('WMV')
  })

  it('.ts — не разбирается Chromium', () => {
    expect(getUnsupportedContainerLabel('/anime/episode-01.ts')).toBe('MPEG-TS')
  })

  it('.mkv — Chromium читает matroska напрямую, null', () => {
    expect(getUnsupportedContainerLabel('/anime/episode-01.mkv')).toBeNull()
  })

  it('.mp4 — поддерживается, null', () => {
    expect(getUnsupportedContainerLabel('/anime/episode-01.mp4')).toBeNull()
  })

  it('регистр расширения не важен — .AVI тоже ловится', () => {
    expect(getUnsupportedContainerLabel('/anime/episode-01.AVI')).toBe('AVI')
  })

  it('путь без расширения — null', () => {
    expect(getUnsupportedContainerLabel('/anime/episode-01')).toBeNull()
  })

  it('null — null', () => {
    expect(getUnsupportedContainerLabel(null)).toBeNull()
  })

  it('undefined — null', () => {
    expect(getUnsupportedContainerLabel(undefined)).toBeNull()
  })
})

describe('pickDefaultTrack', () => {
  it('берёт дорожку с isDefault: true, даже если она не первая', () => {
    const tracks = [
      makeAudioTrack({ index: 0, codec: 'ac3', isDefault: false }),
      makeAudioTrack({ index: 1, codec: 'aac', isDefault: true }),
    ]
    expect(pickDefaultTrack(tracks)).toBe(tracks[1])
  })

  it('без isDefault у всех дорожек — берёт первую', () => {
    const tracks = [
      makeAudioTrack({ index: 0, codec: 'ac3' }),
      makeAudioTrack({ index: 1, codec: 'aac' }),
    ]
    expect(pickDefaultTrack(tracks)).toBe(tracks[0])
  })

  it('пустой массив — undefined', () => {
    expect(pickDefaultTrack([])).toBeUndefined()
  })
})

describe('checkCodecSupport', () => {
  it('чистый H.264 8bit + AAC в mkv — полностью поддерживается, issues пустой', () => {
    const result = checkCodecSupport(
      [makeVideoTrack({ codec: 'h264', bitDepth: 8 })],
      [makeAudioTrack({ codec: 'aac', isDefault: true })],
      '/anime/episode-01.mkv',
    )
    expect(result.supported).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('Hi10P-видео даёт issue с kind: video', () => {
    const result = checkCodecSupport(
      [makeVideoTrack({ codec: 'h264', bitDepth: 10 })],
      [makeAudioTrack({ codec: 'aac', isDefault: true })],
      '/anime/episode-01.mkv',
    )
    expect(result.supported).toBe(false)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]).toMatchObject({ kind: 'video' })
  })

  it('AC3 на дефолтной дорожке даёт issue с kind: audio', () => {
    const result = checkCodecSupport(
      [makeVideoTrack({ codec: 'h264', bitDepth: 8 })],
      [makeAudioTrack({ codec: 'ac3', isDefault: true })],
      '/anime/episode-01.mkv',
    )
    expect(result.supported).toBe(false)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]).toMatchObject({ kind: 'audio' })
  })

  it('AVI-контейнер даёт issue с kind: container', () => {
    const result = checkCodecSupport(
      [makeVideoTrack({ codec: 'h264', bitDepth: 8 })],
      [makeAudioTrack({ codec: 'aac', isDefault: true })],
      '/anime/episode-01.avi',
    )
    expect(result.supported).toBe(false)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]).toMatchObject({ kind: 'container' })
  })

  it('комбинация нескольких проблем даёт несколько issues', () => {
    const result = checkCodecSupport(
      [makeVideoTrack({ codec: 'h264', bitDepth: 10 })],
      [makeAudioTrack({ codec: 'dts', isDefault: true })],
      '/anime/episode-01.avi',
    )
    expect(result.supported).toBe(false)
    expect(result.issues).toHaveLength(3)
    expect(result.issues.map((issue) => issue.kind).sort()).toEqual(['audio', 'container', 'video'])
  })
})
