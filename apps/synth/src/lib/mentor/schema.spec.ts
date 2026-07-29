import { describe, expect, it } from 'vitest'
import { MentorEventSchema, MentorStateReportSchema } from './schema'

describe('MentorEventSchema', () => {
  it('принимает валидное highlight_param', () => {
    const result = MentorEventSchema.safeParse({
      kind: 'highlight_param',
      name: 'Cutoff',
      message: 'Занавеска яркости',
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет highlight_param с пустым message', () => {
    const result = MentorEventSchema.safeParse({ kind: 'highlight_param', name: 'Cutoff', message: '' })
    expect(result.success).toBe(false)
  })

  it('принимает dim_all без дополнительных полей', () => {
    expect(MentorEventSchema.safeParse({ kind: 'dim_all' }).success).toBe(true)
  })

  it('отклоняет focus_section с неизвестной секцией', () => {
    const result = MentorEventSchema.safeParse({ kind: 'focus_section', section: 'oscillators' })
    expect(result.success).toBe(false)
  })

  it('принимает focus_section с известной секцией', () => {
    const result = MentorEventSchema.safeParse({ kind: 'focus_section', section: 'engine' })
    expect(result.success).toBe(true)
  })

  it('отклоняет midi_sequence с пустым массивом нот', () => {
    const result = MentorEventSchema.safeParse({ kind: 'midi_sequence', notes: [] })
    expect(result.success).toBe(false)
  })

  it('принимает midi_sequence с валидной нотой', () => {
    const result = MentorEventSchema.safeParse({
      kind: 'midi_sequence',
      notes: [{ note: 60, velocity: 100, startMs: 0, durationMs: 500 }],
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет неизвестный kind', () => {
    const result = MentorEventSchema.safeParse({ kind: 'unknown_event' })
    expect(result.success).toBe(false)
  })
})

describe('MentorStateReportSchema', () => {
  it('принимает валидный репорт состояния', () => {
    const result = MentorStateReportSchema.safeParse({ engineType: 'fm', patchName: 'Glass Bells', started: true })
    expect(result.success).toBe(true)
  })

  it('отклоняет неизвестный engineType', () => {
    const result = MentorStateReportSchema.safeParse({ engineType: 'wavetable', patchName: 'X', started: false })
    expect(result.success).toBe(false)
  })
})
