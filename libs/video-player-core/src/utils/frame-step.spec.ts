import { describe, expect, it } from 'vitest'
import { FRAME_STEP_COUNT, getShakaFrameRate } from './frame-step'

function makePlayer(tracks: { active: boolean; frameRate: number | null }[]) {
  return { getVariantTracks: () => tracks } as Parameters<typeof getShakaFrameRate>[0]
}

describe('FRAME_STEP_COUNT', () => {
  it('равен 5 кадрам за нажатие', () => {
    expect(FRAME_STEP_COUNT).toBe(5)
  })
})

describe('getShakaFrameRate', () => {
  it('возвращает 24 (fallback), если плеер не передан', () => {
    expect(getShakaFrameRate(null)).toBe(24)
    expect(getShakaFrameRate(undefined)).toBe(24)
  })

  it('возвращает frameRate активной дорожки', () => {
    const player = makePlayer([
      { active: false, frameRate: 60 },
      { active: true, frameRate: 30 },
    ])
    expect(getShakaFrameRate(player)).toBe(30)
  })

  it('возвращает 24 (fallback), если активная дорожка не сообщает frameRate', () => {
    const player = makePlayer([{ active: true, frameRate: null }])
    expect(getShakaFrameRate(player)).toBe(24)
  })

  it('возвращает 24 (fallback), если активной дорожки нет вовсе', () => {
    const player = makePlayer([{ active: false, frameRate: 60 }])
    expect(getShakaFrameRate(player)).toBe(24)
  })

  it('возвращает 24 (fallback), если getVariantTracks бросает исключение', () => {
    const player = {
      getVariantTracks: () => {
        throw new Error('плеер ещё не готов')
      },
    } as Parameters<typeof getShakaFrameRate>[0]
    expect(getShakaFrameRate(player)).toBe(24)
  })
})
