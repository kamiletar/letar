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

  it('FieldSelectComponent — рендерит placeholder-опцию и опции, собирает значение в submit', async () => {
    const fixture = TestBed.createComponent(StageEHostComponent)
    fixture.detectChanges()

    const select = fixture.debugElement.query(By.css('[data-field-name="country"] select'))
      .nativeElement as HTMLSelectElement
    expect(select.options[0].textContent).toBe('Выберите страну')

    select.value = 'ru'
    select.dispatchEvent(new Event('change'))
    fixture.detectChanges()
    await Promise.resolve()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['country']).toBe('ru')
  })

  it('FieldCascadingSelectComponent — список городов зависит от выбранной страны, смена страны сбрасывает город', async () => {
    const fixture = TestBed.createComponent(StageEHostComponent)
    fixture.detectChanges()

    const countrySelect = fixture.debugElement.query(By.css('[data-field-name="country"] select'))
      .nativeElement as HTMLSelectElement
    const citySelect = fixture.debugElement.query(By.css('[data-field-name="city"] select'))
      .nativeElement as HTMLSelectElement

    expect(citySelect.disabled).toBe(true)

    countrySelect.value = 'ru'
    countrySelect.dispatchEvent(new Event('change'))
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

    countrySelect.value = 'de'
    countrySelect.dispatchEvent(new Event('change'))
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
