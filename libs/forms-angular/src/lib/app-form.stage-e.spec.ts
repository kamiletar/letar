import { provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { beforeEach, describe, expect, it } from 'vitest'
import { StageEHostComponent } from './testing/stage-e-host.component'

function typeValue(input: HTMLInputElement, value: string): void {
  input.value = value
  input.dispatchEvent(new Event('input'))
}

describe('Stage E — Select/CascadingSelect/Combobox/Autocomplete/Listbox/RadioCard/SegmentedGroup/ImageChoice (Angular)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    })
  })

  it('FieldSelectComponent — кастомный listbox: placeholder, открытие кликом, выбор опции собирается в submit', async () => {
    const fixture = TestBed.createComponent(StageEHostComponent)
    fixture.detectChanges()

    // Этап 3g (`forms-vue-angular-select-parity`): нативный `<select>` заменён на
    // `<button role="combobox">` + `<ul role="listbox">` поверх `createListboxPopup`
    const trigger = fixture.debugElement.query(By.css('[data-field-name="country"] button[role="combobox"]'))
      .nativeElement as HTMLButtonElement
    expect(trigger.textContent?.trim()).toBe('Выберите страну')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')

    trigger.click()
    fixture.detectChanges()

    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    // Попап телепортируется CDK Overlay (`DomPortal`) вне `[data-field-name]`-обёртки — селектор без неё
    const options = fixture.debugElement.queryAll(By.css('li[role="option"]'))
    expect(options.map((option) => (option.nativeElement as HTMLLIElement).textContent?.trim())).toEqual([
      'Россия',
      'Германия',
    ])
    ;(options[0].nativeElement as HTMLLIElement).click()
    fixture.detectChanges()
    await Promise.resolve()

    // Выбор закрывает попап и подставляет label выбранной опции в триггер
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.textContent?.trim()).toBe('Россия')

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['country']).toBe('ru')
  })

  it('FieldCascadingSelectComponent — список городов зависит от выбранной страны, смена страны сбрасывает город', async () => {
    const fixture = TestBed.createComponent(StageEHostComponent)
    fixture.detectChanges()

    const countryTrigger = fixture.debugElement.query(By.css('[data-field-name="country"] button[role="combobox"]'))
      .nativeElement as HTMLButtonElement
    const citySelect = fixture.debugElement.query(By.css('[data-field-name="city"] select'))
      .nativeElement as HTMLSelectElement

    expect(citySelect.disabled).toBe(true)

    countryTrigger.click()
    fixture.detectChanges()
    // Попап телепортируется CDK Overlay (`DomPortal`) вне `[data-field-name]`-обёртки — селектор без неё
    let countryOptions = fixture.debugElement.queryAll(By.css('li[role="option"]'))
    ;(countryOptions[0].nativeElement as HTMLLIElement).click() // Россия
    fixture.detectChanges()
    await Promise.resolve()
    await Promise.resolve()
    fixture.detectChanges()

    expect(citySelect.disabled).toBe(false)
    const cityLabels = Array.from(citySelect.options).map((o) => o.textContent)
    expect(cityLabels).toContain('Москва')

    citySelect.value = 'msk'
    citySelect.dispatchEvent(new Event('change'))
    fixture.detectChanges()

    countryTrigger.click()
    fixture.detectChanges()
    countryOptions = fixture.debugElement.queryAll(By.css('li[role="option"]'))
    ;(countryOptions[1].nativeElement as HTMLLIElement).click() // Германия
    fixture.detectChanges()
    await Promise.resolve()
    await Promise.resolve()
    fixture.detectChanges()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['city']).toBe('')
  })

  it('FieldComboboxComponent — фильтрует опции по введённому тексту и выбирает по клику', () => {
    const fixture = TestBed.createComponent(StageEHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('[data-field-name="team"] input'))
      .nativeElement as HTMLInputElement
    typeValue(input, 'диз')
    fixture.detectChanges()

    const optionEl = fixture.debugElement.query(By.css('[data-field-name="team"] .letar-field__combobox-option'))
      .nativeElement as HTMLLIElement
    expect(optionEl.textContent).toBe('Дизайн')

    optionEl.dispatchEvent(new Event('mousedown', { cancelable: true }))
    fixture.detectChanges()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['team']).toBe('design')
  })

  it('FieldAutocompleteComponent — принимает произвольный текст и показывает подсказки', () => {
    const fixture = TestBed.createComponent(StageEHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('[data-field-name="supportContact"] input'))
      .nativeElement as HTMLInputElement
    typeValue(input, 'Иван')
    fixture.detectChanges()

    const suggestion = fixture.debugElement.query(By.css('.letar-field__autocomplete-option'))

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['supportContact']).toBe('Иван')
    expect(suggestion).toBeTruthy()
  })

  it('FieldListboxComponent — multi-selection тоглит значения в массив', () => {
    const fixture = TestBed.createComponent(StageEHostComponent)
    fixture.detectChanges()

    const options = fixture.debugElement.queryAll(
      By.css('[data-field-name="favoriteColors"] .letar-field__listbox-option'),
    )
    expect(options.length).toBe(3)
    ;(options[0].nativeElement as HTMLButtonElement).click()
    fixture.detectChanges()
    ;(options[2].nativeElement as HTMLButtonElement).click()
    fixture.detectChanges()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['favoriteColors']).toEqual(['red', 'blue'])
  })

  it('FieldRadioCardComponent — одиночный выбор карточкой, role="radio"', () => {
    const fixture = TestBed.createComponent(StageEHostComponent)
    fixture.detectChanges()

    const cards = fixture.debugElement.queryAll(By.css('[data-field-name="plan"] .letar-field__card'))
    expect(cards.length).toBe(2)
    ;(cards[1].nativeElement as HTMLButtonElement).click()
    fixture.detectChanges()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['plan']).toBe('pro')
    expect(cards[1].nativeElement.getAttribute('aria-checked')).toBe('true')
  })

  it('FieldSegmentedGroupComponent — одиночный выбор сегментом', () => {
    const fixture = TestBed.createComponent(StageEHostComponent)
    fixture.detectChanges()

    const segments = fixture.debugElement.queryAll(By.css('[data-field-name="layout"] .letar-field__segment'))
    expect(segments.length).toBe(2)
    ;(segments[1].nativeElement as HTMLButtonElement).click()
    fixture.detectChanges()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['layout']).toBe('list')
  })

  it('FieldImageChoiceComponent — single-selection карточками с изображением', () => {
    const fixture = TestBed.createComponent(StageEHostComponent)
    fixture.detectChanges()

    const items = fixture.debugElement.queryAll(
      By.css('[data-field-name="avatar"] .letar-field__image-choice-item'),
    )
    expect(items.length).toBe(2)
    ;(items[0].nativeElement as HTMLButtonElement).click()
    fixture.detectChanges()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['avatar']).toBe('cat')
  })
})
