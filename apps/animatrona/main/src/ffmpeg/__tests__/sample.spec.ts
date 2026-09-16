/**
 * Аргументы VMAF-сэмплов — должны совпадать с финальным кодированием (VideoPool)
 */

import { describe, expect, it, vi } from 'vitest'

import type { VideoTranscodeOptions } from '../../../../shared/types'
import { buildNvencEncodeArgs } from '../../../ffmpeg/nvenc-args'
import { buildEncodingArgs } from '../sample'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp'),
    getAppPath: vi.fn(() => '/tmp'),
  },
}))

vi.mock('../../../utils/logger', () => ({
  createModuleLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

/** Опции CQ-поиска для профиля «Blackwell UHQ» (см. import-queue-controller) */
const OPTIONS: VideoTranscodeOptions = {
  codec: 'av1',
  useGpu: true,
  cq: 28,
  preset: 'p7',
  rateControl: 'VBR',
  tune: 'UHQ',
  multipass: 'FULLRES',
  spatialAq: true,
  temporalAq: true,
  aqStrength: 8,
  lookahead: 51,
  lookaheadLevel: 3,
  gopSize: 240,
  bRefMode: 'MIDDLE',
  force10Bit: true,
  temporalFilter: true,
}

/** Аргументы между входным и выходным файлом без `-an` */
function encoderArgs(args: string[]): string[] {
  const afterInput = args.slice(args.indexOf('-i') + 2)
  return afterInput.slice(0, afterInput.indexOf('-an'))
}

describe('buildEncodingArgs (VMAF-сэмплы)', () => {
  it.each([true, false])('NVENC-аргументы совпадают с VideoPool (фильтр поддерживается: %s)', (supported) => {
    const args = buildEncodingArgs('in.mkv', 'out.mkv', OPTIONS, false, supported)
    expect(encoderArgs(args)).toEqual(buildNvencEncodeArgs(OPTIONS, { temporalFilterSupported: supported }))
    expect(args.slice(-2)).toEqual(['-an', 'out.mkv'])
  })

  it('AV1 на GPU декодирует через -hwaccel cuda до -i', () => {
    const args = buildEncodingArgs('in.mkv', 'out.mkv', OPTIONS, false, true)
    expect(args.slice(0, 5)).toEqual(['-y', '-hwaccel', 'cuda', '-i', 'in.mkv'])
  })

  it('HEVC на GPU — hevc_nvenc с аргументами профиля, а не CPU', () => {
    const options = { ...OPTIONS, codec: 'hevc' as const, tune: 'HQ' as const }
    const args = buildEncodingArgs('in.mkv', 'out.mkv', options, false, true)
    expect(encoderArgs(args)).toEqual(buildNvencEncodeArgs(options, { temporalFilterSupported: true }))
  })

  it('кодек из БД в верхнем регистре нормализуется', () => {
    const options = { ...OPTIONS, codec: 'AV1' as unknown as VideoTranscodeOptions['codec'] }
    const args = buildEncodingArgs('in.mkv', 'out.mkv', options, false, true)
    expect(args).toContain('av1_nvenc')
  })

  it('CPU AV1 — быстрый libsvtav1 без NVENC-аргументов', () => {
    const args = buildEncodingArgs('in.mkv', 'out.mkv', OPTIONS, true, true)
    expect(args).toContain('libsvtav1')
    expect(args).not.toContain('-tf_level')
    expect(args).not.toContain('-hwaccel')
  })

  it('CPU HEVC — пресет NVENC переводится в формат x265', () => {
    const args = buildEncodingArgs('in.mkv', 'out.mkv', { ...OPTIONS, codec: 'hevc' }, true, true)
    expect(args[args.indexOf('-c:v') + 1]).toBe('libx265')
    expect(args[args.indexOf('-preset') + 1]).toBe('slow')
  })
})
