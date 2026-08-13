import { provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { beforeEach, describe, expect, it } from 'vitest'
import { StageAHostComponent } from './testing/stage-a-host.component'

describe('Stage A — 7 полей (Angular): NumberInput/Currency/Percentage/Slider/Rating/Hidden/Time', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    })
  })

  it('рендерят все поля с правильными нативными контролами', () => {
    const fixture = TestBed.createComponent(StageAHostComponent)
    fixture.detectChanges()
    const root = fixture.debugElement

    const numberInputs = root.queryAll(By.css('input[type="number"]'))
    expect(numberInputs).toHaveLength(3) // amount + price(currency) + discount(percentage)
    expect(root.query(By.css('input[type="range"]')).nativeElement).toBeTruthy() // slider
    expect(root.queryAll(By.css('[role="radio"]'))).toHaveLength(5) // rating (count=5)
    expect(root.query(By.css('input[type="time"]')).nativeElement).toBeTruthy()
    // hidden не рендерит DOM вовсе
    expect(root.query(By.css('letar-field-hidden')).nativeElement.childNodes.length).toBe(0)
  })

  it('NumberInput валидирует по Zod-подсхеме (min)', () => {
    const fixture = TestBed.createComponent(StageAHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#amount')).nativeElement as HTMLInputElement
    input.value = '0'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new Event('blur'))
    fixture.detectChanges()

    const errors = fixture.debugElement.queryAll(By.css('.letar-field__error'))
    expect(errors.some((e) => e.nativeElement.textContent.includes('Минимум 1'))).toBe(true)
  })

  it('Currency прокидывает currency атрибутом data-currency', () => {
    const fixture = TestBed.createComponent(StageAHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#price')).nativeElement as HTMLInputElement
    expect(input.getAttribute('data-currency')).toBe('USD')
  })

  it('Slider отображает текущее значение при showValue', () => {
    const fixture = TestBed.createComponent(StageAHostComponent)
    fixture.detectChanges()

    const valueEl = fixture.debugElement.query(By.css('.letar-field__slider-value'))
    expect(valueEl.nativeElement.textContent).toBe('50')

    const slider = fixture.debugElement.query(By.css('input[type="range"]')).nativeElement as HTMLInputElement
    slider.value = '80'
    slider.dispatchEvent(new Event('input'))
    fixture.detectChanges()

    expect(fixture.debugElement.query(By.css('.letar-field__slider-value')).nativeElement.textContent).toBe('80')
  })

  it('Rating выставляет значение по клику на звезду', () => {
    const fixture = TestBed.createComponent(StageAHostComponent)
    fixture.detectChanges()

    const stars = fixture.debugElement.queryAll(By.css('.letar-field__rating-star'))
    const thirdStar = stars[2].nativeElement as HTMLButtonElement
    thirdStar.click()
    fixture.detectChanges()

    expect(thirdStar.getAttribute('aria-checked')).toBe('true')
    expect(thirdStar.textContent).toBe('★')
  })

  it('Hidden передаёт своё value в состояние формы без рендера DOM-контрола', () => {
    const fixture = TestBed.createComponent(StageAHostComponent)
    fixture.detectChanges()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['utm']).toBe('from-campaign')
  })

  it('Time рендерит нативный input[type="time"] с формконтролом', () => {
    const fixture = TestBed.createComponent(StageAHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#startTime')).nativeElement as HTMLInputElement
    input.value = '09:30'
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['startTime']).toBe('09:30')
  })
})
