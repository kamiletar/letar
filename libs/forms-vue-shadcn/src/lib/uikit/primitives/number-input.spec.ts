import { describe, expect, it } from 'vitest'
import { NumberInput } from './number-input'

const base = { value: 1, onChange: () => {} }

/** Классы корневого `<input>` vnode. */
function classOf(props: Parameters<typeof NumberInput>[0]): string {
  return String((NumberInput(props).props as { class: string }).class)
}

describe('NumberInput (vue-shadcn) — hideControls', () => {
  it('по умолчанию нативные степперы не скрыты', () => {
    expect(classOf(base)).not.toContain('spin-button')
  })

  it('hideControls скрывает нативные степперы type="number"', () => {
    const cls = classOf({ ...base, hideControls: true })
    expect(cls).toContain('[&::-webkit-inner-spin-button]:appearance-none')
    expect(cls).toContain('[appearance:textfield]')
  })
})
