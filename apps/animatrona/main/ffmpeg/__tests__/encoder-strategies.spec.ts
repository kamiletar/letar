import { describe, expect, it } from 'vitest'
import { getBuiltInProfiles } from '../../../shared/encoding-profiles'
import type { EncodingProfileOptions } from '../../../shared/types'
import { CpuEncoderStrategy, getEncoderStrategy, NvencEncoderStrategy } from '../encoder-strategies'

/** Встроенный профиль по имени как EncodingProfileOptions */
function builtIn(generation: 'blackwell' | 'ada' | 'ampere', name: string): EncodingProfileOptions {
  const profile = getBuiltInProfiles(generation).find((p) => p.name === name)
  if (!profile) {
    throw new Error(`Нет встроенного профиля ${name} для ${generation}`)
  }
  return profile
}

/** Значение аргумента после флага, либо undefined */
function valueOf(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag)
  return index === -1 ? undefined : args[index + 1]
}

const BLACKWELL = new NvencEncoderStrategy({ temporalFilterSupported: true })
const ADA = new NvencEncoderStrategy({ temporalFilterSupported: false })

describe('NvencEncoderStrategy.buildArgs', () => {
  it('Blackwell UHQ — -tf_level 4 без -bf и 10-bit через -highbitdepth', () => {
    const args = BLACKWELL.buildArgs(builtIn('blackwell', 'Blackwell UHQ'), 8)

    expect(valueOf(args, '-c:v')).toBe('av1_nvenc')
    expect(valueOf(args, '-tf_level')).toBe('4')
    expect(args).not.toContain('-bf')
    expect(valueOf(args, '-highbitdepth')).toBe('1')
    // -pix_fmt с -hwaccel_output_format cuda падает: «Impossible to convert between the formats»
    expect(args).not.toContain('-pix_fmt')
  })

  it('Архив на Blackwell тоже с фильтром', () => {
    expect(valueOf(BLACKWELL.buildArgs(builtIn('blackwell', 'Архив'), 10), '-tf_level')).toBe('4')
  })

  it('«Качество» на Blackwell — фильтр выключен в профиле', () => {
    expect(BLACKWELL.buildArgs(builtIn('blackwell', 'Качество'), 8)).not.toContain('-tf_level')
  })

  it('GPU без поддержки — профиль с фильтром кодируется без него', () => {
    const args = ADA.buildArgs(builtIn('blackwell', 'Blackwell UHQ'), 8)
    expect(args).not.toContain('-tf_level')
    expect(valueOf(args, '-highbitdepth')).toBe('1')
  })

  it('HEVC HQ с фильтром — добавляет -bf 4', () => {
    const profile = { ...builtIn('ampere', 'Качество'), temporalFilter: true }
    const args = BLACKWELL.buildArgs(profile, 8)
    expect(valueOf(args, '-c:v')).toBe('hevc_nvenc')
    expect(valueOf(args, '-tf_level')).toBe('4')
    expect(valueOf(args, '-bf')).toBe('4')
  })

  it('H.264 с force10Bit — без -highbitdepth (High 10 не играет в Chromium)', () => {
    const profile = { ...builtIn('blackwell', 'Качество'), codec: 'H264' as const, force10Bit: true }
    expect(BLACKWELL.buildArgs(profile, 8)).not.toContain('-highbitdepth')
  })

  it('без force10Bit — без -highbitdepth', () => {
    expect(BLACKWELL.buildArgs(builtIn('blackwell', 'Качество'), 8)).not.toContain('-highbitdepth')
  })

  it('встроенные GPU-профили не обещают lookahead, который ffmpeg обрежет', () => {
    for (const generation of ['blackwell', 'ada', 'ampere'] as const) {
      for (const profile of getBuiltInProfiles(generation)) {
        const lookahead = valueOf(BLACKWELL.buildArgs(profile, 8), '-rc-lookahead')
        if (lookahead !== undefined) {
          expect(Number(lookahead)).toBeLessThanOrEqual(51)
        }
      }
    }
  })
})

describe('NvencEncoderStrategy.buildVideoFilterChain', () => {
  it('8-bit источник — nv12', () => {
    expect(BLACKWELL.buildVideoFilterChain({ deband: true })).toBe(
      'hwdownload,format=nv12,deband=1thr=0.02:2thr=0.02:3thr=0.02:4thr=0.02,format=nv12,hwupload_cuda',
    )
  })

  it('10-bit источник — p010le, иначе hwdownload падает на «Invalid output format nv12»', () => {
    expect(BLACKWELL.buildVideoFilterChain({ deband: true, cropFilter: 'crop=1920:800:0:140', sourceBitDepth: 10 }))
      .toBe(
        'hwdownload,format=p010le,crop=1920:800:0:140,deband=1thr=0.02:2thr=0.02:3thr=0.02:4thr=0.02,format=p010le,hwupload_cuda',
      )
  })

  it('без фильтров — undefined', () => {
    expect(BLACKWELL.buildVideoFilterChain({ deband: false, sourceBitDepth: 10 })).toBeUndefined()
  })
})

describe('CpuEncoderStrategy', () => {
  it('цепочка фильтров без GPU-трансфера', () => {
    expect(new CpuEncoderStrategy().buildVideoFilterChain({ deband: true, cropFilter: 'crop=1:1:0:0' })).toBe(
      'crop=1:1:0:0,deband=1thr=0.02:2thr=0.02:3thr=0.02:4thr=0.02',
    )
  })
})

describe('getEncoderStrategy', () => {
  it('выбирает стратегию по useGpu', () => {
    expect(getEncoderStrategy(true, { temporalFilterSupported: true })).toBeInstanceOf(NvencEncoderStrategy)
    expect(getEncoderStrategy(false, { temporalFilterSupported: true })).toBeInstanceOf(CpuEncoderStrategy)
  })
})
