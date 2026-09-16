import { describe, expect, it } from 'vitest'
import { NVENC_BUILT_IN_LOOKAHEAD, NVENC_LOOKAHEAD_UI_MAX, nvencLookaheadLimit } from '../../../shared/nvenc-limits'

describe('nvencLookaheadLimit', () => {
  // Сверено с «Clipping lookahead depth to N» из ffmpeg N-124496 при -rc-lookahead 250
  it.each([
    [7, 51], // AV1 UHQ по умолчанию
    [5, 53], // AV1 HQ, HEVC UHQ
    [4, 54], // -bf 4
    [3, 55], // HEVC HQ, H.264 HQ
    [0, 58], // HEVC p1
  ])('%i B-кадров → %i', (bFrames, limit) => {
    expect(nvencLookaheadLimit(bFrames)).toBe(limit)
  })

  it('встроенные профили берут предел AV1 UHQ, форма — предел без B-кадров', () => {
    expect(NVENC_BUILT_IN_LOOKAHEAD).toBe(51)
    expect(NVENC_LOOKAHEAD_UI_MAX).toBe(58)
  })
})
