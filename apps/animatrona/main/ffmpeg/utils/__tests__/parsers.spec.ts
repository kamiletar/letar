import { describe, expect, it } from 'vitest'
import { extractBitrate, getBitDepth, needsAudioTranscode, parseTimeToSeconds } from '../parsers'

describe('extractBitrate', () => {
  it('извлекает битрейт из bit_rate', () => {
    const stream = { bit_rate: '128000' }
    expect(extractBitrate(stream)).toBe(128000)
  })

  it('извлекает битрейт из tags.BPS', () => {
    const stream = { tags: { BPS: '256000' } }
    expect(extractBitrate(stream)).toBe(256000)
  })

  it('извлекает битрейт из tags.BPS-eng', () => {
    const stream = { tags: { 'BPS-eng': '320000' } }
    expect(extractBitrate(stream)).toBe(320000)
  })

  it('находит BPS в любом теге', () => {
    const stream = { tags: { 'BPS-rus': '192000' } }
    expect(extractBitrate(stream)).toBe(192000)
  })

  it('приоритет: bit_rate > tags.BPS', () => {
    const stream = { bit_rate: '128000', tags: { BPS: '256000' } }
    expect(extractBitrate(stream)).toBe(128000)
  })

  it('возвращает undefined для пустого потока', () => {
    expect(extractBitrate({})).toBeUndefined()
  })

  it('игнорирует нулевой битрейт', () => {
    const stream = { bit_rate: '0', tags: { BPS: '256000' } }
    expect(extractBitrate(stream)).toBe(256000)
  })

  it('игнорирует отрицательный битрейт', () => {
    const stream = { bit_rate: '-100' }
    expect(extractBitrate(stream)).toBeUndefined()
  })
})

describe('getBitDepth', () => {
  it('возвращает 8 для yuv420p', () => {
    expect(getBitDepth('yuv420p')).toBe(8)
  })

  it('возвращает 10 для yuv420p10le', () => {
    expect(getBitDepth('yuv420p10le')).toBe(10)
  })

  it('возвращает 10 для yuv444p10le', () => {
    expect(getBitDepth('yuv444p10le')).toBe(10)
  })

  it('возвращает 12 для yuv420p12le', () => {
    expect(getBitDepth('yuv420p12le')).toBe(12)
  })

  it('возвращает 8 для undefined', () => {
    expect(getBitDepth(undefined)).toBe(8)
  })

  it('возвращает 8 для пустой строки', () => {
    expect(getBitDepth('')).toBe(8)
  })
})

describe('parseTimeToSeconds', () => {
  it('парсит время 00:00:00.00', () => {
    expect(parseTimeToSeconds('time=00:00:00.00')).toBe(0)
  })

  it('парсит время 00:01:30.50', () => {
    expect(parseTimeToSeconds('time=00:01:30.50')).toBe(90.5)
  })

  it('парсит время с часами 01:30:00.00', () => {
    expect(parseTimeToSeconds('time=01:30:00.00')).toBe(5400)
  })

  it('парсит время из строки с другим текстом', () => {
    expect(parseTimeToSeconds('frame=100 fps=30 time=00:00:10.00 bitrate=1000')).toBe(10)
  })

  it('возвращает null для строки без времени', () => {
    expect(parseTimeToSeconds('no time here')).toBeNull()
  })

  it('возвращает null для пустой строки', () => {
    expect(parseTimeToSeconds('')).toBeNull()
  })
})

describe('needsAudioTranscode', () => {
  it('возвращает false для mp3', () => {
    expect(needsAudioTranscode('mp3', 320000)).toBe(false)
  })

  it('возвращает false для MP3 (регистронезависимо)', () => {
    expect(needsAudioTranscode('MP3', 320000)).toBe(false)
  })

  it('возвращает false для aac с низким битрейтом', () => {
    expect(needsAudioTranscode('aac', 128000)).toBe(false)
  })

  it('возвращает false для aac с битрейтом 256 kbps', () => {
    expect(needsAudioTranscode('aac', 256000)).toBe(false)
  })

  it('возвращает true для aac с высоким битрейтом', () => {
    expect(needsAudioTranscode('aac', 512000)).toBe(true)
  })

  it('возвращает true для flac', () => {
    expect(needsAudioTranscode('flac', 1000000)).toBe(true)
  })

  it('возвращает true для opus', () => {
    expect(needsAudioTranscode('opus', 128000)).toBe(true)
  })

  it('возвращает true для pcm_s16le', () => {
    expect(needsAudioTranscode('pcm_s16le', null)).toBe(true)
  })

  it('возвращает true для aac без битрейта', () => {
    expect(needsAudioTranscode('aac', null)).toBe(true)
  })

  it('возвращает true для aac с нулевым битрейтом', () => {
    expect(needsAudioTranscode('aac', 0)).toBe(true)
  })
})
