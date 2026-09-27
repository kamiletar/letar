import { provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createListboxPopup, type ListboxPopup } from './listbox-popup'

interface Option {
  value: string
  disabled?: boolean
}

const OPTIONS: Option[] = [{ value: 'a' }, { value: 'b', disabled: true }, { value: 'c' }]

function createPopup(onSelect: (option: Option) => void, opts: { typeAhead?: boolean } = {}): ListboxPopup<Option> {
  return TestBed.runInInjectionContext(() =>
    createListboxPopup<Option>({
      options: () => OPTIONS,
      onSelect,
      idBase: 'test-field',
      typeAhead: opts.typeAhead,
    })
  )
}

function keydown(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, cancelable: true })
}

describe('createListboxPopup', () => {
  let popup: ListboxPopup<Option> | undefined
  let trigger: HTMLElement
  let listbox: HTMLElement

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] })
    trigger = document.createElement('button')
    listbox = document.createElement('ul')
    // `DomPortal` требует, чтобы переносимый узел уже имел `parentNode` (чтобы вернуть его назад
    // при detach) — в реальном поле `<ul>` всегда лежит в шаблоне компонента, здесь имитируем
    // тем же временным контейнером, из которого CDK его заберёт в overlay-панель.
    const templateHost = document.createElement('div')
    templateHost.append(listbox)
    document.body.append(trigger, templateHost)
  })

  afterEach(() => {
    popup?.destroy()
    popup = undefined
    trigger.remove()
    listbox.parentElement?.remove()
    listbox.remove()
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

  it('attaches the listbox to a CDK overlay once open and the element is registered', () => {
    popup = createPopup(vi.fn())
    popup.attachTrigger(trigger)
    popup.onKeydown(keydown('ArrowDown'))
    popup.attachFloating(listbox)

    // DomPortal переносит переданный узел внутрь overlay-контейнера CDK (аппендится в body)
    expect(listbox.isConnected).toBe(true)
    expect(trigger.contains(listbox)).toBe(false)
  })

  it('an outside click (CDK outsidePointerEvents) closes the popup', () => {
    popup = createPopup(vi.fn())
    popup.attachTrigger(trigger)
    popup.onKeydown(keydown('ArrowDown'))
    popup.attachFloating(listbox)
    expect(popup.isOpen()).toBe(true)

    // Диспетчер CDK шлёт outsidePointerEvents на 'click' (pointerdown только запоминает
    // координаты для различения клика от драга) — см. OverlayOutsideClickDispatcher
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(popup.isOpen()).toBe(false)
  })

  it('a click on the trigger does not close the popup', () => {
    popup = createPopup(vi.fn())
    popup.attachTrigger(trigger)
    popup.onKeydown(keydown('ArrowDown'))
    popup.attachFloating(listbox)

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(popup.isOpen()).toBe(true)
  })

  it('destroy() disposes the overlay and stops reacting to outside clicks', () => {
    popup = createPopup(vi.fn())
    popup.attachTrigger(trigger)
    popup.onKeydown(keydown('ArrowDown'))
    popup.attachFloating(listbox)
    popup.destroy()

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    // closePopup() внутри destroy() не вызывался — сигнал остаётся как был до dispose()
    expect(popup.isOpen()).toBe(true)
  })
})
