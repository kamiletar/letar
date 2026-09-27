import { afterEach, describe, expect, it, vi } from 'vitest'
import { createListboxPopup, type ListboxPopup } from './listbox-popup'

interface Option {
  value: string
  disabled?: boolean
}

const OPTIONS: Option[] = [{ value: 'a' }, { value: 'b', disabled: true }, { value: 'c' }]

function createPopup(onSelect: (option: Option) => void, opts: { typeAhead?: boolean } = {}): ListboxPopup<Option> {
  return createListboxPopup<Option>({
    options: () => OPTIONS,
    onSelect,
    idBase: 'test-field',
    typeAhead: opts.typeAhead,
  })
}

function keydown(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, cancelable: true })
}

describe('createListboxPopup', () => {
  let popup: ListboxPopup<Option> | undefined

  afterEach(() => {
    popup?.destroy()
    popup = undefined
  })

  it('starts closed with no active option', () => {
    popup = createPopup(vi.fn())
    expect(popup.isOpen()).toBe(false)
    expect(popup.activeIndex()).toBe(-1)
  })

  it('ArrowDown opens the popup and activates the first enabled option', () => {
    popup = createPopup(vi.fn())
    popup.onKeydown(keydown('ArrowDown'))
    expect(popup.isOpen()).toBe(true)
    expect(popup.activeIndex()).toBe(0)
  })

  it('ArrowDown again skips the disabled option', () => {
    popup = createPopup(vi.fn())
    popup.onKeydown(keydown('ArrowDown'))
    popup.onKeydown(keydown('ArrowDown'))
    expect(popup.activeIndex()).toBe(2)
  })

  it('ArrowUp from the first option wraps to the last enabled one', () => {
    popup = createPopup(vi.fn())
    popup.onKeydown(keydown('ArrowDown'))
    popup.onKeydown(keydown('ArrowUp'))
    expect(popup.activeIndex()).toBe(2)
  })

  it('Enter selects the active option and closes the popup', () => {
    const onSelect = vi.fn()
    popup = createPopup(onSelect)
    popup.onKeydown(keydown('ArrowDown'))
    popup.onKeydown(keydown('Enter'))
    expect(onSelect).toHaveBeenCalledWith({ value: 'a' })
    expect(popup.isOpen()).toBe(false)
  })

  it('Escape closes the popup without selecting', () => {
    const onSelect = vi.fn()
    popup = createPopup(onSelect)
    popup.onKeydown(keydown('ArrowDown'))
    popup.onKeydown(keydown('Escape'))
    expect(popup.isOpen()).toBe(false)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('Home/End jump to the first/last option', () => {
    popup = createPopup(vi.fn())
    popup.onKeydown(keydown('ArrowDown'))
    popup.onKeydown(keydown('End'))
    expect(popup.activeIndex()).toBe(2)
    popup.onKeydown(keydown('Home'))
    expect(popup.activeIndex()).toBe(0)
  })

  it('type-ahead opens the popup and activates a matching option, when enabled', () => {
    popup = createPopup(vi.fn())
    popup.onKeydown(keydown('c'))
    expect(popup.isOpen()).toBe(true)
    expect(popup.activeIndex()).toBe(2)
  })

  it('type-ahead is a no-op when disabled (Combobox/Autocomplete own their input)', () => {
    popup = createPopup(vi.fn(), { typeAhead: false })
    popup.onKeydown(keydown('c'))
    expect(popup.isOpen()).toBe(false)
  })

  it('a mousedown outside the root closes the popup', () => {
    popup = createPopup(vi.fn())
    const root = document.createElement('div')
    popup.attachRoot(root)
    popup.onKeydown(keydown('ArrowDown'))
    expect(popup.isOpen()).toBe(true)

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(popup.isOpen()).toBe(false)
  })

  it('a mousedown inside the root does not close the popup', () => {
    popup = createPopup(vi.fn())
    const root = document.createElement('div')
    const trigger = document.createElement('button')
    root.appendChild(trigger)
    popup.attachRoot(root)
    popup.onKeydown(keydown('ArrowDown'))

    trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(popup.isOpen()).toBe(true)
  })

  it('destroy() stops reacting to document mousedown', () => {
    popup = createPopup(vi.fn())
    const root = document.createElement('div')
    popup.attachRoot(root)
    popup.onKeydown(keydown('ArrowDown'))
    popup.destroy()

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(popup.isOpen()).toBe(true)
  })
})
