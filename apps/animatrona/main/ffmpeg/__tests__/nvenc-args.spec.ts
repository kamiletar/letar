import { describe, expect, it } from 'vitest'
import type { VideoTranscodeOptions } from '../../../shared/types'
import {
  buildNvencEncodeArgs,
  buildNvencTemporalFilterArgs,
  isNvencTemporalFilterError,
  NVENC_TEMPORAL_FILTER_LEVEL,
  supportsNvenc10BitOutput,
} from '../nvenc-args'

/** Опции встроенного профиля «Blackwell UHQ» в том виде, в каком их собирает buildVideoOptions */
const BLACKWELL_UHQ: VideoTranscodeOptions = {
  codec: 'av1',
  useGpu: true,
  cq: 24,
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

/** Значение аргумента после флага, либо undefined */
function valueOf(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag)
  return index === -1 ? undefined : args[index + 1]
}

describe('buildNvencTemporalFilterArgs', () => {
  it('уровень фильтра — 4: nvenc.c принимает только 0 и 4', () => {
    expect(NVENC_TEMPORAL_FILTER_LEVEL).toBe(4)
  })

  it('AV1 UHQ: только -tf_level 4, B-кадры пресета (7) не трогаем', () => {
    expect(buildNvencTemporalFilterArgs({ enabled: true, codec: 'av1', tune: 'UHQ', supported: true })).toEqual([
      '-tf_level',
      '4',
    ])
  })

  it('AV1 HQ: без -bf — у пресета 5 B-кадров', () => {
    expect(buildNvencTemporalFilterArgs({ enabled: true, codec: 'av1', tune: 'HQ', supported: true })).toEqual([
      '-tf_level',
      '4',
    ])
  })

  it.each(
    [
      ['hevc', 'HQ'],
      ['hevc', 'NONE'],
      ['hevc', undefined],
      ['h264', 'HQ'],
    ] as const,
  )('%s с tune %s: добавляет -bf 4, иначе InitializeEncoder падает', (codec, tune) => {
    expect(buildNvencTemporalFilterArgs({ enabled: true, codec, tune, supported: true })).toEqual([
      '-tf_level',
      '4',
      '-bf',
      '4',
    ])
  })

  it('HEVC UHQ: без -bf — у пресета 5 B-кадров', () => {
    expect(buildNvencTemporalFilterArgs({ enabled: true, codec: 'hevc', tune: 'UHQ', supported: true })).toEqual([
      '-tf_level',
      '4',
    ])
  })

  it('выключен в профиле — пусто', () => {
    expect(buildNvencTemporalFilterArgs({ enabled: false, codec: 'av1', tune: 'UHQ', supported: true })).toEqual([])
    expect(buildNvencTemporalFilterArgs({ enabled: undefined, codec: 'av1', tune: 'UHQ', supported: true })).toEqual(
      [],
    )
  })

  it('GPU без поддержки (Ada и старше) — пусто', () => {
    expect(buildNvencTemporalFilterArgs({ enabled: true, codec: 'av1', tune: 'UHQ', supported: false })).toEqual([])
  })

  it.each(['LL', 'ULL'] as const)('low-latency tune %s — пусто: без B-кадров фильтр не работает', (tune) => {
    expect(buildNvencTemporalFilterArgs({ enabled: true, codec: 'hevc', tune, supported: true })).toEqual([])
  })
})

describe('isNvencTemporalFilterError', () => {
  it.each([
    '[av1_nvenc @ 0000029f] Temporal filtering not supported by the device',
    '[hevc_nvenc @ 000002be] Temporal filtering needs at least 4 B-Frames (-bf 4).',
    '[av1_nvenc @ 000001c4] Clipping lookahead depth to 51 (from 250) due to lack of surfaces/delayInvalid temporal filtering level.',
  ])('узнаёт отказ фильтра: %s', (line) => {
    expect(isNvencTemporalFilterError(line)).toBe(true)
  })

  it.each([
    '[av1_nvenc @ 000002e6] Clipping lookahead depth to 51 (from 250) due to lack of surfaces/delay',
    '[av1_nvenc @ 000001] InitializeEncoder failed: invalid param (8):',
    'Error while opening encoder - maybe incorrect parameters such as bit_rate, rate, width or height',
  ])('не путает с другими ошибками: %s', (line) => {
    expect(isNvencTemporalFilterError(line)).toBe(false)
  })
})

describe('supportsNvenc10BitOutput', () => {
  it('AV1 и HEVC — да, H.264 High 10 Chromium не играет — нет', () => {
    expect(supportsNvenc10BitOutput('av1')).toBe(true)
    expect(supportsNvenc10BitOutput('hevc')).toBe(true)
    expect(supportsNvenc10BitOutput('h264')).toBe(false)
  })
})

describe('buildNvencEncodeArgs', () => {
  it('Blackwell UHQ — полный набор аргументов, проверенный на ffmpeg N-124496 + драйвер 616.92', () => {
    expect(buildNvencEncodeArgs(BLACKWELL_UHQ, { temporalFilterSupported: true })).toEqual([
      '-c:v',
      'av1_nvenc',
      '-rc',
      'vbr',
      '-cq',
      '24',
      '-preset',
      'p7',
      '-tune',
      'uhq',
      '-multipass',
      'fullres',
      '-g',
      '240',
      '-spatial-aq',
      '1',
      '-temporal-aq',
      '1',
      '-aq-strength',
      '8',
      '-rc-lookahead',
      '51',
      '-lookahead_level',
      '3',
      '-b_ref_mode',
      'middle',
      '-tf_level',
      '4',
      '-pix_fmt',
      'p010le',
    ])
  })

  it('фильтр не поддерживается — без -tf_level, остальное то же', () => {
    const args = buildNvencEncodeArgs(BLACKWELL_UHQ, { temporalFilterSupported: false })
    expect(args).not.toContain('-tf_level')
    expect(valueOf(args, '-rc-lookahead')).toBe('51')
    expect(valueOf(args, '-pix_fmt')).toBe('p010le')
  })

  it('не-VBR — constqp с -qp, а не -cq', () => {
    const args = buildNvencEncodeArgs({ ...BLACKWELL_UHQ, rateControl: 'CONSTQP' }, { temporalFilterSupported: true })
    expect(valueOf(args, '-rc')).toBe('constqp')
    expect(valueOf(args, '-qp')).toBe('24')
    expect(args).not.toContain('-cq')
  })

  it('VBR с maxBitrate — maxrate и двойной bufsize', () => {
    const args = buildNvencEncodeArgs({ ...BLACKWELL_UHQ, maxBitrate: 12 }, { temporalFilterSupported: true })
    expect(valueOf(args, '-maxrate')).toBe('12M')
    expect(valueOf(args, '-bufsize')).toBe('24M')
  })

  it('lookahead_level без lookahead не передаётся', () => {
    const args = buildNvencEncodeArgs({ ...BLACKWELL_UHQ, lookahead: null }, { temporalFilterSupported: true })
    expect(args).not.toContain('-rc-lookahead')
    expect(args).not.toContain('-lookahead_level')
  })

  it('HEVC HQ с фильтром — -bf 4', () => {
    const args = buildNvencEncodeArgs(
      { ...BLACKWELL_UHQ, codec: 'hevc', tune: 'HQ' },
      { temporalFilterSupported: true },
    )
    expect(valueOf(args, '-c:v')).toBe('hevc_nvenc')
    expect(valueOf(args, '-tf_level')).toBe('4')
    expect(valueOf(args, '-bf')).toBe('4')
  })

  it('H.264 с force10Bit остаётся 8-bit', () => {
    const args = buildNvencEncodeArgs({ ...BLACKWELL_UHQ, codec: 'h264', tune: 'HQ' }, {
      temporalFilterSupported: true,
    })
    expect(args).not.toContain('-pix_fmt')
  })

  it('без необязательных полей — дефолты прежнего VideoPool', () => {
    const args = buildNvencEncodeArgs(
      { codec: 'av1', useGpu: true, cq: 30, preset: 'p5' },
      { temporalFilterSupported: true },
    )
    expect(args).toEqual([
      '-c:v',
      'av1_nvenc',
      '-rc',
      'constqp',
      '-qp',
      '30',
      '-preset',
      'p5',
      '-tune',
      'hq',
      '-g',
      '240',
      '-spatial-aq',
      '1',
      '-temporal-aq',
      '1',
      '-aq-strength',
      '8',
    ])
  })

  it('tune NONE — без -tune', () => {
    const args = buildNvencEncodeArgs({ ...BLACKWELL_UHQ, tune: 'NONE' }, { temporalFilterSupported: false })
    expect(args).not.toContain('-tune')
  })
})
