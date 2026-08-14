import { provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { beforeEach, describe, expect, it } from 'vitest'
import { StageJHostComponent } from './testing/stage-j-host.component'

/** См. `typeValue` в `app-form.stage-b.spec.ts` — тот же приём: `MaskController.handleInput`
 * без `beforeinput` трактует замену `.value` как полную программную замену строки целиком. */
function typeValue(input: HTMLInputElement, value: string): void {
  input.value = value
  input.dispatchEvent(new Event('input'))
}

describe('Stage J — Auto/Calculated/MaskedInput (Angular), финал 61/61', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    })
  })

  it('FieldAuto: короткая строка → <input type="text">', () => {
    const fixture = TestBed.createComponent(StageJHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#nickname')).nativeElement as HTMLInputElement
    expect(input.tagName).toBe('INPUT')
    expect(input.type).toBe('text')
  })

  it('FieldAuto: длинная строка (maxLength > 200) → <textarea>', () => {
    const fixture = TestBed.createComponent(StageJHostComponent)
    fixture.detectChanges()

    const el = fixture.debugElement.query(By.css('#bio')).nativeElement as HTMLElement
    expect(el.tagName).toBe('TEXTAREA')
  })

  it('FieldAuto: number → <input type="number">', () => {
    const fixture = TestBed.createComponent(StageJHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#age')).nativeElement as HTMLInputElement
    expect(input.type).toBe('number')
  })

  it('FieldAuto: boolean → <input type="checkbox">', () => {
    const fixture = TestBed.createComponent(StageJHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#subscribed')).nativeElement as HTMLInputElement
    expect(input.type).toBe('checkbox')
  })

  it('FieldAuto: enum → <select> с опциями из enumValues, подписанными camelCaseToLabel', () => {
    const fixture = TestBed.createComponent(StageJHostComponent)
    fixture.detectChanges()

    const select = fixture.debugElement.query(By.css('#role')).nativeElement as HTMLSelectElement
    expect(select.tagName).toBe('SELECT')
    const optionLabels = Array.from(select.options).map((o) => o.textContent)
    expect(optionLabels).toEqual(['Admin', 'User'])
  })

  it('FieldCalculated: пересчитывает quantity × price и форматирует значение', () => {
    const fixture = TestBed.createComponent(StageJHostComponent)
    fixture.detectChanges()

    const calculated = fixture.debugElement.query(By.css('[data-field-name="total"] [data-testid="calculated-value"]'))
    expect(calculated.nativeElement.textContent).toBe('200 ₽')

    const quantityInput = fixture.debugElement.query(By.css('#quantity')).nativeElement as HTMLInputElement
    quantityInput.value = '5'
    quantityInput.dispatchEvent(new Event('input'))
    fixture.detectChanges()

    const recalculated = fixture.debugElement.query(
      By.css('[data-field-name="total"] [data-testid="calculated-value"]'),
    )
    expect(recalculated.nativeElement.textContent).toBe('500 ₽')
  })

  it('FieldCalculated: значение уходит в submit вместе с остальной формой', () => {
    const fixture = TestBed.createComponent(StageJHostComponent)
    fixture.detectChanges()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['total']).toBe(200)
  })

  it('FieldMaskedInput: маска "999-999" группирует ввод дефисом (та же маска, что у Stage B)', () => {
    const fixture = TestBed.createComponent(StageJHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#departmentCode')).nativeElement as HTMLInputElement
    typeValue(input, '770001')
    fixture.detectChanges()

    expect(input.value).toBe('770-001')
  })

  it('FieldMaskedInput: описание формата видно до начала ввода (WCAG 3.3.2)', () => {
    const fixture = TestBed.createComponent(StageJHostComponent)
    fixture.detectChanges()

    const hint = fixture.debugElement.query(By.css('#departmentCode-format-description'))
    expect(hint.nativeElement.textContent).toBe('Формат: 3 цифры, дефис, 3 цифры')

    const input = fixture.debugElement.query(By.css('#departmentCode')).nativeElement as HTMLInputElement
    expect(input.getAttribute('aria-describedby')).toBe('departmentCode-format-description')
  })
})
