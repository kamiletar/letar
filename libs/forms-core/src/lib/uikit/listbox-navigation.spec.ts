import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createListboxTypeAhead, moveListboxActiveIndex } from './listbox-navigation'

describe('moveListboxActiveIndex', () => {
  const opts = [{}, {}, {}]

  it('moves to the next index', () => {
    expect(moveListboxActiveIndex(opts, 0, 'next')).toBe(1)
  })

  it('moves to the previous index', () => {
    expect(moveListboxActiveIndex(opts, 1, 'prev')).toBe(0)
  })

  it('wraps from the last option to the first on next', () => {
    expect(moveListboxActiveIndex(opts, 2, 'next')).toBe(0)
  })

  it('wraps from the first option to the last on prev', () => {
    expect(moveListboxActiveIndex(opts, 0, 'prev')).toBe(2)
  })

  it('first/last jump to the ends regardless of the current index', () => {
    expect(moveListboxActiveIndex(opts, 1, 'first')).toBe(0)
    expect(moveListboxActiveIndex(opts, 1, 'last')).toBe(2)
  })

  it('next from -1 (nothing active) lands on the first option', () => {
    expect(moveListboxActiveIndex(opts, -1, 'next')).toBe(0)
  })

  it('skips disabled options', () => {
    const withDisabled = [{}, { disabled: true }, {}]
    expect(moveListboxActiveIndex(withDisabled, 0, 'next')).toBe(2)
    expect(moveListboxActiveIndex(withDisabled, 2, 'next')).toBe(0)
  })

  it('returns -1 when every option is disabled', () => {
    const allDisabled = [{ disabled: true }, { disabled: true }]
    expect(moveListboxActiveIndex(allDisabled, 0, 'next')).toBe(-1)
  })

  it('returns -1 for an empty list', () => {
    expect(moveListboxActiveIndex([], -1, 'next')).toBe(-1)
  })
})

describe('createListboxTypeAhead', () => {
  interface Option {
    label: string
    disabled?: boolean
  }
  const getText = (o: Option) => o.label

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('matches the first option starting with the typed character', () => {
    const options: Option[] = [{ label: 'Apple' }, { label: 'Banana' }, { label: 'Cherry' }]
    const typeAhead = createListboxTypeAhead(getText)
    expect(typeAhead.match(options, -1, 'b')).toBe(1)
  })

  it('accumulates consecutive characters into one query', () => {
    const options: Option[] = [{ label: 'Banana' }, { label: 'Berry' }]
    const typeAhead = createListboxTypeAhead(getText)
    typeAhead.match(options, -1, 'b')
    expect(typeAhead.match(options, -1, 'e')).toBe(1)
  })

  it('cycles to the next match on repeated queries, skipping the active option', () => {
    const options: Option[] = [{ label: 'Apple' }, { label: 'Apricot' }, { label: 'Banana' }]
    const typeAhead = createListboxTypeAhead(getText)
    const first = typeAhead.match(options, -1, 'a')
    expect(first).toBe(0)

    // Second, separate "a" press (past the reset window) starts a new query from the active option
    vi.advanceTimersByTime(1000)
    expect(typeAhead.match(options, first, 'a')).toBe(1)
  })

  it('skips disabled options', () => {
    const options: Option[] = [{ label: 'Apple', disabled: true }, { label: 'Apricot' }]
    const typeAhead = createListboxTypeAhead(getText)
    expect(typeAhead.match(options, -1, 'a')).toBe(1)
  })

  it('returns -1 and clears the buffer when nothing matches', () => {
    const options: Option[] = [{ label: 'Apple' }]
    const typeAhead = createListboxTypeAhead(getText)
    expect(typeAhead.match(options, -1, 'z')).toBe(-1)
    // Buffer cleared — next unrelated character starts a fresh query
    expect(typeAhead.match(options, -1, 'a')).toBe(0)
  })

  it('reset() clears the buffer immediately', () => {
    const options: Option[] = [{ label: 'Banana' }]
    const typeAhead = createListboxTypeAhead(getText)
    typeAhead.match(options, -1, 'b')
    typeAhead.reset()
    // Without reset, 'a' alone would not match "Banana"; after reset it's a fresh query for 'a'
    expect(typeAhead.match(options, -1, 'a')).toBe(-1)
  })
})
