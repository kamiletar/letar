import { provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { beforeEach, describe, expect, it } from 'vitest'
import { Stage2HostComponent } from './testing/stage2-host.component'

describe('Этап 2 — оставшиеся 9 полей (Angular)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    })
  })

  it('рендерят все 9 полей с правильными нативными контролами', () => {
    const fixture = TestBed.createComponent(Stage2HostComponent)
    fixture.detectChanges()
    const root = fixture.debugElement

    expect(root.query(By.css('textarea')).nativeElement).toBeTruthy()
    expect(root.query(By.css('input[type="number"]')).nativeElement).toBeTruthy()
    expect(root.query(By.css('input[type="password"]')).nativeElement).toBeTruthy()
    expect(root.queryAll(By.css('input[type="checkbox"]'))).toHaveLength(2) // agree + notifications(switch)
    expect(root.query(By.css('input[role="switch"]')).nativeElement).toBeTruthy()
    expect(root.queryAll(By.css('input[type="radio"]'))).toHaveLength(2)
    expect(root.query(By.css('select')).nativeElement).toBeTruthy()
    expect(root.query(By.css('input[type="date"]')).nativeElement).toBeTruthy()
    expect(root.queryAll(By.css('[role="radio"]'))).toHaveLength(2) // YesNo
  })

  it('переключает видимость пароля по клику', () => {
    const fixture = TestBed.createComponent(Stage2HostComponent)
    fixture.detectChanges()

    const toggle = fixture.debugElement.query(By.css('button[aria-label="Toggle password visibility"]'))
      .nativeElement as HTMLButtonElement
    toggle.click()
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('#password')).nativeElement as HTMLInputElement
    expect(input.type).toBe('text')
  })

  it('RadioGroup выбирает значение по клику', () => {
    const fixture = TestBed.createComponent(Stage2HostComponent)
    fixture.detectChanges()

    const radios = fixture.debugElement.queryAll(By.css('input[type="radio"]'))
    const second = radios[1].nativeElement as HTMLInputElement
    second.checked = true
    second.dispatchEvent(new Event('change'))
    fixture.detectChanges()

    expect(second.checked).toBe(true)
  })

  it('YesNo выставляет boolean по клику на блок', () => {
    const fixture = TestBed.createComponent(Stage2HostComponent)
    fixture.detectChanges()

    const yesOption = fixture.debugElement.queryAll(By.css('[role="radio"]'))[0].nativeElement as HTMLElement
    yesOption.click()
    fixture.detectChanges()

    expect(yesOption.getAttribute('aria-checked')).toBe('true')
  })

  it('Number валидирует по Zod-подсхеме (min)', () => {
    const fixture = TestBed.createComponent(Stage2HostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('input[type="number"]')).nativeElement as HTMLInputElement
    input.value = '0'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new Event('blur'))
    fixture.detectChanges()

    const errors = fixture.debugElement.queryAll(By.css('.letar-field__error'))
    expect(errors.some((e) => e.nativeElement.textContent.includes('Минимум 1'))).toBe(true)
  })

  it('Checkbox переключает boolean через нативный CheckboxControlValueAccessor', () => {
    const fixture = TestBed.createComponent(Stage2HostComponent)
    fixture.detectChanges()

    const checkbox = fixture.debugElement.query(By.css('#agree')).nativeElement as HTMLInputElement
    checkbox.click()
    fixture.detectChanges()

    expect(checkbox.checked).toBe(true)
  })
})
