import { provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { beforeEach, describe, expect, it } from 'vitest'
import { StageCHostComponent } from './testing/stage-c-host.component'

/** Коммитит сырое значение через нативный `input`-эвент, как `typeValue` в `app-form.stage-b.spec.ts`
 * — `FieldPhoneComponent` не использует `MaskController`, поэтому `beforeinput` не нужен, но
 * приём тот же: пишем в `.value`, диспатчим `input`, читаем результат из DOM. */
function typeValue(input: HTMLInputElement, value: string): void {
  input.value = value
  input.dispatchEvent(new Event('input'))
}

describe('Stage C — Phone (Angular): чистый JS-форматтер, не MaskController', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    })
  })

  it('рендерит native input[type="tel"] для поля Phone', () => {
    const fixture = TestBed.createComponent(StageCHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#phone')).nativeElement as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.type).toBe('tel')
  })

  it('ввод сырых цифр форматируется маской RU-телефона в DOM', () => {
    const fixture = TestBed.createComponent(StageCHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#phone')).nativeElement as HTMLInputElement
    typeValue(input, '9161234567')
    fixture.detectChanges()

    expect(input.value).toBe('+7 (916) 123-45-67')
  })

  it('autoUnmask: false (default) — в FormControl уходит форматированная строка (как в <input>)', () => {
    const fixture = TestBed.createComponent(StageCHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#phone')).nativeElement as HTMLInputElement
    typeValue(input, '9161234567')
    fixture.detectChanges()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['phone']).toBe('+7 (916) 123-45-67')
  })

  it('autoUnmask: true — в FormControl уходит raw (только цифры), не formatted', () => {
    const fixture = TestBed.createComponent(StageCHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#phoneRaw')).nativeElement as HTMLInputElement
    typeValue(input, '9161234567')
    fixture.detectChanges()

    // DOM всё равно показывает форматированное значение
    expect(input.value).toBe('+7 (916) 123-45-67')

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    // FormControl хранит raw-цифры (без литералов маски), не форматированную строку.
    // `stripPhoneNumber(formatted)` берёт цифры из уже отформатированной строки — код страны
    // "7", вшитый в маску литералом, остаётся в этих цифрах (1-в-1 с Vue/React: `autoUnmask`
    // не гоняет значение через `normalizePhoneDigits` повторно).
    expect(fixture.componentInstance.lastSubmit?.['phoneRaw']).toBe('79161234567')
  })

  it('trunk-префикс (ведущая "8" в РФ) снимается при переполнении маски', () => {
    const fixture = TestBed.createComponent(StageCHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#phoneRaw')).nativeElement as HTMLInputElement
    typeValue(input, '89161234567')
    fixture.detectChanges()

    expect(input.value).toBe('+7 (916) 123-45-67')
  })
})
