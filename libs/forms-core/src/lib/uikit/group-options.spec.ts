import { describe, expect, it } from 'vitest'
import { getOptionLabel, getOptionText, groupOptions, hasGroups, isNodeLabelWithoutText } from './group-options'

describe('groupOptions', () => {
  it('returns null when no option declares a group', () => {
    expect(groupOptions([{ value: 'a' }, { value: 'b' }])).toBeNull()
  })

  it('returns null for an empty list', () => {
    expect(groupOptions([])).toBeNull()
  })

  it('groups options by their group key', () => {
    const groups = groupOptions([
      { value: 'a', group: 'Vowels' },
      { value: 'b', group: 'Consonants' },
      { value: 'e', group: 'Vowels' },
    ])

    expect(groups).not.toBeNull()
    expect([...groups!.keys()]).toEqual(['Vowels', 'Consonants'])
    expect(groups!.get('Vowels')?.map((o) => o.value)).toEqual(['a', 'e'])
    expect(groups!.get('Consonants')?.map((o) => o.value)).toEqual(['b'])
  })

  it('preserves input order inside a group', () => {
    const groups = groupOptions([
      { value: '3', group: 'g' },
      { value: '1', group: 'g' },
      { value: '2', group: 'g' },
    ])

    expect(groups!.get('g')?.map((o) => o.value)).toEqual(['3', '1', '2'])
  })

  it('puts ungrouped options under an empty key when some options are grouped', () => {
    const groups = groupOptions([
      { value: 'a', group: 'Named' },
      { value: 'b' },
    ])

    expect(groups!.get('Named')?.map((o) => o.value)).toEqual(['a'])
    expect(groups!.get('')?.map((o) => o.value)).toEqual(['b'])
  })

  it('treats an empty-string group as ungrouped', () => {
    // `hasGroups` uses truthiness, so `group: ''` must not switch on grouped rendering
    expect(groupOptions([{ value: 'a', group: '' }])).toBeNull()
  })

  it('does not mutate the input array', () => {
    const options = [{ value: 'a', group: 'g' }]
    groupOptions(options)
    expect(options).toEqual([{ value: 'a', group: 'g' }])
  })
})

describe('hasGroups', () => {
  it('detects at least one grouped option', () => {
    expect(hasGroups([{ value: 'a' }, { value: 'b', group: 'g' }])).toBe(true)
  })

  it('is false when every group is missing or empty', () => {
    expect(hasGroups([{ value: 'a' }, { value: 'b', group: '' }])).toBe(false)
  })
})

describe('getOptionLabel', () => {
  it('returns a string label as is', () => {
    expect(getOptionLabel({ value: 'v', label: 'Label' })).toBe('Label')
  })

  it('falls back to the stringified value when the label is missing', () => {
    expect(getOptionLabel({ value: 42 })).toBe('42')
  })

  it('falls back to the value for non-string labels (e.g. a React node)', () => {
    // The core must not know what a ReactNode is — anything non-string degrades to the value
    expect(getOptionLabel({ value: 'v', label: { type: 'span' } })).toBe('v')
  })
})

describe('getOptionText', () => {
  it('textValue сильнее label и value', () => {
    expect(getOptionText({ label: 'Метка', textValue: 'Текст', value: 'v' })).toBe('Текст')
  })

  it('строковый и числовой label — сам label', () => {
    expect(getOptionText({ label: 'Метка', value: 'v' })).toBe('Метка')
    expect(getOptionText({ label: 5, value: 'v' })).toBe('5')
  })

  it('узел без textValue — String(value)', () => {
    expect(getOptionText({ label: { type: 'em' }, value: 7 })).toBe('7')
    expect(getOptionText({ value: 'v' })).toBe('v')
  })

  it('пустой textValue допустим и не откатывается к label', () => {
    expect(getOptionText({ label: 'Метка', textValue: '', value: 'v' })).toBe('')
  })

  it('getOptionLabel делегирует: без textValue результат прежний, с textValue — он', () => {
    expect(getOptionLabel({ label: 'Метка', value: 'v' })).toBe('Метка')
    expect(getOptionLabel({ label: {}, value: 'v' })).toBe('v')
    expect(getOptionLabel({ label: {}, textValue: 'T', value: 'v' })).toBe('T')
  })
})

describe('isNodeLabelWithoutText', () => {
  it('true только для узла без textValue', () => {
    expect(isNodeLabelWithoutText({ label: { type: 'b' } })).toBe(true)
    expect(isNodeLabelWithoutText({ label: { type: 'b' }, textValue: 'x' })).toBe(false)
    expect(isNodeLabelWithoutText({ label: 'строка' })).toBe(false)
    expect(isNodeLabelWithoutText({ label: 3 })).toBe(false)
    expect(isNodeLabelWithoutText({ label: null })).toBe(false)
  })
})
