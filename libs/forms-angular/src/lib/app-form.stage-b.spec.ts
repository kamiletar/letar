import { provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { beforeEach, describe, expect, it } from 'vitest'
import { StageBHostComponent } from './testing/stage-b-host.component'

/** Вводит сырое значение и коммитит его через нативный `input`-эвент — без `beforeinput` (как
 * `input.setValue()` у `@vue/test-utils`) `MaskController.handleInput` трактует это как полную
 * программную замену (`pendingEdit === null` → `commitFullReplace`), что как раз и нужно тесту:
 * маска применяется к целой строке, без эмуляции посимвольного набора. */
function typeValue(input: HTMLInputElement, value: string): void {
  input.value = value
  input.dispatchEvent(new Event('input'))
}

function blur(input: HTMLInputElement): void {
  input.dispatchEvent(new Event('blur'))
}

describe('Stage B — 11 документных полей РФ (Angular): маски + контрольные суммы', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    })
  })

  function errorText(fixture: ReturnType<typeof TestBed.createComponent>, id: string): string | undefined {
    const field = fixture.debugElement.query(By.css(`#${id}`)).nativeElement.closest('.letar-field')
    return field?.querySelector('.letar-field__error')?.textContent ?? undefined
  }

  it('рендерит нативный input для каждого из 11 документных полей', () => {
    const fixture = TestBed.createComponent(StageBHostComponent)
    fixture.detectChanges()
    const root = fixture.debugElement

    for (
      const id of [
        'inn',
        'bik',
        'ogrn',
        'snils',
        'kpp',
        'passport',
        'bankAccount',
        'corrAccount',
        'foreignPassport',
        'departmentCode',
        'birthCertificate',
      ]
    ) {
      expect(root.query(By.css(`#${id}`)).nativeElement).toBeTruthy()
    }
  })

  it('ИНН (formatMode "off"): длина не 10/12 → ошибка формата', () => {
    const fixture = TestBed.createComponent(StageBHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#inn')).nativeElement as HTMLInputElement
    typeValue(input, '12345')
    blur(input)
    fixture.detectChanges()

    expect(errorText(fixture, 'inn')).toBe('ИНН должен содержать 10 или 12 цифр')
  })

  it('ИНН: валидная контрольная сумма (10 цифр) — без ошибки', () => {
    const fixture = TestBed.createComponent(StageBHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#inn')).nativeElement as HTMLInputElement
    typeValue(input, '7707083893')
    blur(input)
    fixture.detectChanges()

    expect(errorText(fixture, 'inn')).toBeUndefined()
  })

  it('ИНН: неверная контрольная сумма (10 цифр) — ошибка', () => {
    const fixture = TestBed.createComponent(StageBHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#inn')).nativeElement as HTMLInputElement
    typeValue(input, '7707083890')
    blur(input)
    fixture.detectChanges()

    expect(errorText(fixture, 'inn')).toBe('Неверная контрольная сумма ИНН')
  })

  it('БИК: не начинается с "04" — ошибка контрольной суммы', () => {
    const fixture = TestBed.createComponent(StageBHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#bik')).nativeElement as HTMLInputElement
    typeValue(input, '123456789')
    blur(input)
    fixture.detectChanges()

    expect(errorText(fixture, 'bik')).toBe('БИК должен начинаться с "04"')
  })

  it('БИК: валидное значение — без ошибки', () => {
    const fixture = TestBed.createComponent(StageBHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#bik')).nativeElement as HTMLInputElement
    typeValue(input, '044525225')
    blur(input)
    fixture.detectChanges()

    expect(errorText(fixture, 'bik')).toBeUndefined()
  })

  it('ОГРН: маска применяется, невалидная контрольная сумма — ошибка', () => {
    const fixture = TestBed.createComponent(StageBHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#ogrn')).nativeElement as HTMLInputElement
    typeValue(input, '1027700132190')
    blur(input)
    fixture.detectChanges()

    expect(errorText(fixture, 'ogrn')).toBe('Неверная контрольная сумма ОГРН')
  })

  it('ОГРН: валидная контрольная сумма — без ошибки', () => {
    const fixture = TestBed.createComponent(StageBHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#ogrn')).nativeElement as HTMLInputElement
    typeValue(input, '1027700132195')
    blur(input)
    fixture.detectChanges()

    expect(errorText(fixture, 'ogrn')).toBeUndefined()
  })

  it('СНИЛС: маска "999-999-999 99" группирует ввод, невалидная сумма — ошибка', () => {
    const fixture = TestBed.createComponent(StageBHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#snils')).nativeElement as HTMLInputElement
    typeValue(input, '11201745491')
    fixture.detectChanges()

    expect(input.value).toBe('112-017-454 91')

    blur(input)
    fixture.detectChanges()
    expect(errorText(fixture, 'snils')).toBe('Неверная контрольная сумма СНИЛС')
  })

  it('СНИЛС: валидная контрольная сумма — без ошибки', () => {
    const fixture = TestBed.createComponent(StageBHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#snils')).nativeElement as HTMLInputElement
    typeValue(input, '11201745490')
    blur(input)
    fixture.detectChanges()

    expect(errorText(fixture, 'snils')).toBeUndefined()
  })

  it('КПП: неверный формат — ошибка', () => {
    const fixture = TestBed.createComponent(StageBHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#kpp')).nativeElement as HTMLInputElement
    typeValue(input, '77070100!')
    blur(input)
    fixture.detectChanges()

    expect(errorText(fixture, 'kpp')).toBe('КПП должен содержать 9 символов')
  })

  it('КПП: валидный формат (NNNNPPXXX) — без ошибки', () => {
    const fixture = TestBed.createComponent(StageBHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#kpp')).nativeElement as HTMLInputElement
    typeValue(input, '770701001')
    blur(input)
    fixture.detectChanges()

    expect(errorText(fixture, 'kpp')).toBeUndefined()
  })

  it('Паспорт: маска "99 99 999999" группирует ввод пробелами', () => {
    const fixture = TestBed.createComponent(StageBHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#passport')).nativeElement as HTMLInputElement
    typeValue(input, '4506123456')
    fixture.detectChanges()

    expect(input.value).toBe('45 06 123456')
  })

  it('Расчётный счёт: 20 цифр без ошибки; Корр. счёт требует префикс "301"', () => {
    const fixture = TestBed.createComponent(StageBHostComponent)
    fixture.detectChanges()

    const bankAccount = fixture.debugElement.query(By.css('#bankAccount')).nativeElement as HTMLInputElement
    typeValue(bankAccount, '40702810038000000001')
    blur(bankAccount)
    fixture.detectChanges()
    expect(errorText(fixture, 'bankAccount')).toBeUndefined()

    const corrAccount = fixture.debugElement.query(By.css('#corrAccount')).nativeElement as HTMLInputElement
    typeValue(corrAccount, '40702810038000000001')
    blur(corrAccount)
    fixture.detectChanges()
    expect(errorText(fixture, 'corrAccount')).toBe('Корр. счёт должен начинаться с "301"')

    typeValue(corrAccount, '30101810400000000225')
    blur(corrAccount)
    fixture.detectChanges()
    expect(errorText(fixture, 'corrAccount')).toBeUndefined()
  })

  it('Загранпаспорт: длина не 9 цифр — ошибка', () => {
    const fixture = TestBed.createComponent(StageBHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#foreignPassport')).nativeElement as HTMLInputElement
    typeValue(input, '12345')
    blur(input)
    fixture.detectChanges()

    expect(errorText(fixture, 'foreignPassport')).toBe('Загранпаспорт должен содержать 9 цифр (серия + номер)')
  })

  it('Код подразделения: маска "999-999" группирует ввод дефисом', () => {
    const fixture = TestBed.createComponent(StageBHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#departmentCode')).nativeElement as HTMLInputElement
    typeValue(input, '770001')
    fixture.detectChanges()

    expect(input.value).toBe('770-001')
  })

  it('Свидетельство о рождении: нормализация гомоглифов происходит на blur', () => {
    const fixture = TestBed.createComponent(StageBHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#birthCertificate')).nativeElement as HTMLInputElement
    typeValue(input, 'II мю 123456')
    blur(input)
    fixture.detectChanges()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['birthCertificate']).toContain('№')
  })
})
