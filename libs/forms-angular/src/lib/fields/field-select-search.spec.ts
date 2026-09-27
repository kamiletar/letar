import { provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fieldSelectManyOptions,
  FieldSelectSearchHostComponent as HostComponent,
} from '../testing/field-select-host.component'
import type { FieldSelectOption } from './field-select.component'

function trigger(fixture: ComponentFixture<HostComponent>): HTMLButtonElement {
  return fixture.debugElement.query(By.css('button[role="combobox"]')).nativeElement as HTMLButtonElement
}

function openPopup(fixture: ComponentFixture<HostComponent>): void {
  trigger(fixture).click()
  fixture.detectChanges()
}

function searchInput(fixture: ComponentFixture<HostComponent>): HTMLInputElement | null {
  const el = fixture.debugElement.query(By.css('input[role="searchbox"]'))
  return el ? (el.nativeElement as HTMLInputElement) : null
}

function optionTexts(fixture: ComponentFixture<HostComponent>): string[] {
  return fixture.debugElement.queryAll(By.css('li[role="option"]')).map((el) => el.nativeElement.textContent ?? '')
}

function typeSearch(fixture: ComponentFixture<HostComponent>, value: string): void {
  const input = searchInput(fixture)!
  input.value = value
  input.dispatchEvent(new Event('input'))
  fixture.detectChanges()
}

function createFixture(
  options: FieldSelectOption[],
  extra: Partial<HostComponent> = {},
): ComponentFixture<HostComponent> {
  const fixture = TestBed.createComponent(HostComponent)
  fixture.componentInstance.options = options
  Object.assign(fixture.componentInstance, extra)
  fixture.detectChanges()
  return fixture
}

/**
 * Этап 3i паритета Select — `searchable`: headless-эквивалент `libs/forms-vue/src/lib/fields/
 * field-select-search.spec.ts`, адаптированный под Angular TestBed/DOM API и разметку этого
 * пакета (кастомный listbox поверх `createListboxPopup`, а не `<select>`). Бизнес-логика
 * (`createSelectionSearch`, Этап 2) общая с остальными скинами.
 */
describe('FieldSelectComponent (Этап 3i) — searchable', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] })
  })

  it('без searchable — поля поиска нет при малом числе опций', () => {
    const fixture = createFixture(fieldSelectManyOptions.slice(0, 3))
    openPopup(fixture)
    expect(searchInput(fixture)).toBeNull()
  })

  it('auto (по умолчанию): меньше 10 опций — поля поиска нет', () => {
    const fixture = createFixture(fieldSelectManyOptions.slice(0, 9), { searchable: 'auto' })
    openPopup(fixture)
    expect(searchInput(fixture)).toBeNull()
  })

  it('auto: 10 опций и больше — поле поиска появляется', () => {
    const fixture = createFixture(fieldSelectManyOptions.slice(0, 10), { searchable: 'auto' })
    openPopup(fixture)
    expect(searchInput(fixture)).not.toBeNull()
  })

  it('searchable: true — поле поиска при любом количестве опций', () => {
    const fixture = createFixture(fieldSelectManyOptions.slice(0, 3), { searchable: true })
    openPopup(fixture)
    expect(searchInput(fixture)).not.toBeNull()
  })

  it('searchable: false — поля поиска нет даже при 10+ опциях', () => {
    const fixture = createFixture(fieldSelectManyOptions, { searchable: false })
    openPopup(fixture)
    expect(searchInput(fixture)).toBeNull()
  })

  it('searchable: {threshold: 2} — порог настраивается (строго «больше», не «не меньше»)', () => {
    const fixture = createFixture(fieldSelectManyOptions.slice(0, 3), { searchable: { threshold: 2 } })
    openPopup(fixture)
    expect(searchInput(fixture)).not.toBeNull()
  })

  it('фильтр раскладко-/регистро-/ё-нечувствителен', () => {
    const options: FieldSelectOption[] = [
      { value: 'hello', label: 'Привет' },
      { value: 'bye', label: 'Пока' },
      { value: 'elka', label: 'ёлка' },
    ]
    const fixture = createFixture(options, { searchable: true })
    openPopup(fixture)

    // Латинская раскладка того же физического набора клавиш, что кириллическое «Привет»
    typeSearch(fixture, 'ghbdtn')
    expect(optionTexts(fixture)).toContain('Привет')
    expect(optionTexts(fixture)).not.toContain('Пока')

    typeSearch(fixture, 'ЁЛКА')
    expect(optionTexts(fixture)).toContain('ёлка')
  })

  it('пустой результат — дефолтное сообщение «Ничего не найдено»', () => {
    const fixture = createFixture(fieldSelectManyOptions.slice(0, 3), { searchable: true })
    openPopup(fixture)
    typeSearch(fixture, 'zzz-нет-такого')
    const listbox = fixture.debugElement.query(By.css('ul[role="listbox"]')).nativeElement as HTMLUListElement
    expect(listbox.textContent).toContain('Ничего не найдено')
  })

  it('пустой результат — свой emptyMessage', () => {
    const fixture = createFixture(fieldSelectManyOptions.slice(0, 3), {
      searchable: { threshold: 0, emptyMessage: 'Пусто, попробуйте иначе' },
    })
    openPopup(fixture)
    typeSearch(fixture, 'zzz-нет-такого')
    const listbox = fixture.debugElement.query(By.css('ul[role="listbox"]')).nativeElement as HTMLUListElement
    expect(listbox.textContent).toContain('Пусто, попробуйте иначе')
  })

  it('свой filter — приложение решает, что подходит', () => {
    const options: FieldSelectOption[] = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ]
    const filter = vi.fn((opt: FieldSelectOption) => opt.value === 'b')
    const fixture = createFixture(options, { searchable: { threshold: 0, filter } })
    openPopup(fixture)
    typeSearch(fixture, 'что угодно')
    expect(optionTexts(fixture)).toContain('Beta')
    expect(optionTexts(fixture)).not.toContain('Alpha')
    expect(filter).toHaveBeenCalled()
  })

  it('searchInDescription: true (по умолчанию) — ищет и по описанию', () => {
    const options: FieldSelectOption[] = [
      { value: 'a', label: 'Тариф А', description: 'уникальный-маркер' },
      { value: 'b', label: 'Тариф Б' },
    ]
    const fixture = createFixture(options, { searchable: true })
    openPopup(fixture)
    typeSearch(fixture, 'уникальный-маркер')
    const texts = optionTexts(fixture)
    expect(texts.some((text) => text.includes('Тариф А'))).toBe(true)
    expect(texts.some((text) => text.includes('Тариф Б'))).toBe(false)
  })

  it('searchInDescription: false — по описанию не ищет', () => {
    const options: FieldSelectOption[] = [
      { value: 'a', label: 'Тариф А', description: 'уникальный-маркер' },
      { value: 'b', label: 'Тариф Б' },
    ]
    const fixture = createFixture(options, { searchable: true, searchInDescription: false })
    openPopup(fixture)
    typeSearch(fixture, 'уникальный-маркер')
    expect(optionTexts(fixture).some((text) => text.includes('Тариф А'))).toBe(false)
  })

  it('опция с пустым значением остаётся видна и выбираема во время активного поиска', () => {
    const options: FieldSelectOption[] = [
      { value: '', label: 'Все категории' },
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]
    const fixture = createFixture(options, { searchable: true })
    openPopup(fixture)
    typeSearch(fixture, 'все')
    const target = fixture.debugElement.queryAll(By.css('li[role="option"]'))
      .find((el) => (el.nativeElement as HTMLLIElement).textContent?.includes('Все категории'))
    expect(target).toBeDefined()
    ;(target!.nativeElement as HTMLLIElement).click()
    fixture.detectChanges()
    expect(trigger(fixture).textContent?.trim()).toBe('Все категории')
  })

  it('стрелки перемещают активный пункт по отфильтрованному списку, Enter выбирает', () => {
    const fixture = createFixture(fieldSelectManyOptions.slice(0, 3), { searchable: true })
    openPopup(fixture)
    const input = searchInput(fixture)!
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }))
    fixture.detectChanges()
    // Открытие подсвечивает первую опцию (v0), два ArrowDown сдвигают на две позиции вперёд (v2)
    expect(trigger(fixture).textContent?.trim()).toBe('Опция 2')
  })

  it('Escape в поле поиска закрывает попап', () => {
    const fixture = createFixture(fieldSelectManyOptions.slice(0, 3), { searchable: true })
    openPopup(fixture)
    const input = searchInput(fixture)!
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    fixture.detectChanges()
    expect(fixture.debugElement.query(By.css('ul[role="listbox"]'))).toBeNull()
  })

  it('a11y: role=combobox, aria-haspopup=listbox, aria-expanded переключается', () => {
    const fixture = createFixture(fieldSelectManyOptions.slice(0, 3), { searchable: true })
    expect(trigger(fixture).getAttribute('aria-haspopup')).toBe('listbox')
    expect(trigger(fixture).getAttribute('aria-expanded')).toBe('false')
    openPopup(fixture)
    expect(trigger(fixture).getAttribute('aria-expanded')).toBe('true')
  })

  it('"+ Добавить" с активным поиском подставляет запрос в подпись пункта создания', () => {
    const fixture = createFixture(fieldSelectManyOptions.slice(0, 3), { searchable: true, onCreate: vi.fn() })
    openPopup(fixture)
    typeSearch(fixture, 'Новый фреймворк')
    const listbox = fixture.debugElement.query(By.css('ul[role="listbox"]')).nativeElement as HTMLUListElement
    expect(listbox.textContent).toContain('Новый фреймворк')
  })

  it('поле поиска получает фокус сразу после открытия попапа', () => {
    const fixture = createFixture(fieldSelectManyOptions.slice(0, 3), { searchable: true })
    openPopup(fixture)
    expect(document.activeElement).toBe(searchInput(fixture))
  })
})
