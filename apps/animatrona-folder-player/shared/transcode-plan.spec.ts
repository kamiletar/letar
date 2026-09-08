import type { AudioTrack, VideoTrack } from '@letar/folder-scan'
import { describe, expect, it } from 'vitest'

import { buildCodecArgs, buildTranscodePlan, type TranscodePlan } from './transcode-plan'

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

describe('buildTranscodePlan', () => {
  it('обычный файл (H.264 8bit + AAC, .mkv) — стратегия direct, ffmpeg не нужен', () => {
    const plan = buildTranscodePlan({
      videoTracks: [makeVideoTrack({ codec: 'h264', bitDepth: 8 })],
      audioTracks: [makeAudioTrack({ codec: 'aac', isDefault: true })],
      filePath: '/anime/episode-01.mkv',
    })

    expect(plan.strategy).toBe('direct')
    expect(plan.needsFfmpeg).toBe(false)
    expect(plan.cost).toBe('none')
    expect(plan.videoAction).toBe('copy')
    expect(plan.audioAction).toBe('copy')
    expect(plan.reasons).toEqual([])
  })

  it('проблема только в контейнере (.avi с H.264+AAC) — стратегия remux, обе дорожки копируются', () => {
    const plan = buildTranscodePlan({
      videoTracks: [makeVideoTrack({ codec: 'h264', bitDepth: 8 })],
      audioTracks: [makeAudioTrack({ codec: 'aac', isDefault: true })],
      filePath: '/anime/episode-01.avi',
    })

    expect(plan.strategy).toBe('remux')
    expect(plan.needsFfmpeg).toBe(true)
    expect(plan.cost).toBe('cheap')
    expect(plan.videoAction).toBe('copy')
    expect(plan.audioAction).toBe('copy')
    expect(plan.reasons).not.toEqual([])
  })

  it('проблема только в звуке (H.264 8bit + AC3) — стратегия audio-only, видео копируется', () => {
    const plan = buildTranscodePlan({
      videoTracks: [makeVideoTrack({ codec: 'h264', bitDepth: 8 })],
      audioTracks: [makeAudioTrack({ codec: 'ac3', isDefault: true })],
      filePath: '/anime/episode-01.mkv',
    })

    expect(plan.strategy).toBe('audio-only')
    expect(plan.needsFfmpeg).toBe(true)
    expect(plan.cost).toBe('moderate')
    expect(plan.videoAction).toBe('copy')
    expect(plan.audioAction).toBe('transcode')
    expect(plan.reasons).not.toEqual([])
  })

  it('Hi10P-видео (звук любой) — стратегия video-and-audio, самая дорогая', () => {
    const plan = buildTranscodePlan({
      videoTracks: [makeVideoTrack({ codec: 'h264', bitDepth: 10 })],
      audioTracks: [makeAudioTrack({ codec: 'aac', isDefault: true })],
      filePath: '/anime/episode-01.mkv',
    })

    expect(plan.strategy).toBe('video-and-audio')
    expect(plan.needsFfmpeg).toBe(true)
    expect(plan.cost).toBe('expensive')
    expect(plan.videoAction).toBe('transcode')
    expect(plan.audioAction).toBe('copy')
    expect(plan.reasons).not.toEqual([])
  })

  it('Hi10P в AVI со звуком DTS — video-and-audio побеждает как самая дорогая стратегия, все причины в reasons', () => {
    const plan = buildTranscodePlan({
      videoTracks: [makeVideoTrack({ codec: 'h264', bitDepth: 10 })],
      audioTracks: [makeAudioTrack({ codec: 'dts', isDefault: true })],
      filePath: '/anime/episode-01.avi',
    })

    expect(plan.strategy).toBe('video-and-audio')
    expect(plan.videoAction).toBe('transcode')
    expect(plan.audioAction).toBe('transcode')
    expect(plan.cost).toBe('expensive')
    expect(plan.reasons).toHaveLength(3)
  })

  it('audioTrackIndex выбирает не-дефолтную дорожку: дефолт AAC, по индексу — AC3 → audio-only', () => {
    const plan = buildTranscodePlan({
      videoTracks: [makeVideoTrack({ codec: 'h264', bitDepth: 8 })],
      audioTracks: [
        makeAudioTrack({ index: 0, codec: 'aac', isDefault: true }),
        makeAudioTrack({ index: 1, codec: 'ac3', isDefault: false }),
      ],
      filePath: '/anime/episode-01.mkv',
      audioTrackIndex: 1,
    })

    expect(plan.strategy).toBe('audio-only')
    expect(plan.audioAction).toBe('transcode')
  })

  it('audioTrackIndex выбирает поддерживаемую дорожку: дефолт AC3, по индексу — AAC → direct', () => {
    const plan = buildTranscodePlan({
      videoTracks: [makeVideoTrack({ codec: 'h264', bitDepth: 8 })],
      audioTracks: [
        makeAudioTrack({ index: 0, codec: 'ac3', isDefault: true }),
        makeAudioTrack({ index: 1, codec: 'aac', isDefault: false }),
      ],
      filePath: '/anime/episode-01.mkv',
      audioTrackIndex: 1,
    })

    expect(plan.strategy).toBe('direct')
    expect(plan.audioAction).toBe('copy')
  })

  it('reasons непустой для любой стратегии, кроме direct', () => {
    const remux = buildTranscodePlan({
      videoTracks: [makeVideoTrack({ codec: 'h264', bitDepth: 8 })],
      audioTracks: [makeAudioTrack({ codec: 'aac', isDefault: true })],
      filePath: '/anime/episode-01.wmv',
    })
    const audioOnly = buildTranscodePlan({
      videoTracks: [makeVideoTrack({ codec: 'h264', bitDepth: 8 })],
      audioTracks: [makeAudioTrack({ codec: 'truehd', isDefault: true })],
      filePath: '/anime/episode-01.mkv',
    })
    const videoAndAudio = buildTranscodePlan({
      videoTracks: [makeVideoTrack({ codec: 'h264', bitDepth: 10 })],
      audioTracks: [makeAudioTrack({ codec: 'aac', isDefault: true })],
      filePath: '/anime/episode-01.mkv',
    })

    expect(remux.reasons.length).toBeGreaterThan(0)
    expect(audioOnly.reasons.length).toBeGreaterThan(0)
    expect(videoAndAudio.reasons.length).toBeGreaterThan(0)
  })
})

describe('buildCodecArgs', () => {
  const basePlan: TranscodePlan = {
    strategy: 'direct',
    videoAction: 'copy',
    audioAction: 'copy',
    needsFfmpeg: false,
    cost: 'none',
    reasons: [],
  }

  it('videoAction: copy — есть -c:v copy, libvpx-vp9 не встречается', () => {
    const args = buildCodecArgs({ ...basePlan, videoAction: 'copy' })
    expect(args).toEqual(expect.arrayContaining(['-c:v', 'copy']))
    expect(args).not.toContain('libvpx-vp9')
  })

  it('videoAction: transcode — есть libvpx-vp9, profile 2 и -pix_fmt yuv420p10le (10 бит сохраняется)', () => {
    const args = buildCodecArgs({ ...basePlan, videoAction: 'transcode' })
    expect(args).toContain('libvpx-vp9')
    expect(args).not.toContain('libx264')

    const pixFmtIndex = args.indexOf('-pix_fmt')
    expect(pixFmtIndex).toBeGreaterThanOrEqual(0)
    expect(args[pixFmtIndex + 1]).toBe('yuv420p10le')

    const profileIndex = args.indexOf('-profile:v')
    expect(profileIndex).toBeGreaterThanOrEqual(0)
    expect(args[profileIndex + 1]).toBe('2')
  })

  it('audioAction: transcode — есть aac и -ac 2', () => {
    const args = buildCodecArgs({ ...basePlan, audioAction: 'transcode' })
    expect(args).toEqual(expect.arrayContaining(['-c:a', 'aac']))
    const acIndex = args.indexOf('-ac')
    expect(acIndex).toBeGreaterThanOrEqual(0)
    expect(args[acIndex + 1]).toBe('2')
  })

  it('audioAction: copy — есть -c:a copy', () => {
    const args = buildCodecArgs({ ...basePlan, audioAction: 'copy' })
    expect(args).toEqual(expect.arrayContaining(['-c:a', 'copy']))
  })
})
