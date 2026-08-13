import { provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { beforeEach, describe, expect, it } from 'vitest'
import { Stage1HostComponent } from './testing/stage1-host.component'

/**
 * Разведка риска №1 (постановка задачи, `libs/forms/PLAN.md` Фаза 10): доказывает, что связка
 * `provideZonelessChangeDetection()` + `TestBed` + Vitest+jsdom реально рендерит и тестирует
 * standalone-компонент безо всякого Karma-раннера и без zone.js в зависимостях. Host-компонент —
 * в `./testing/stage1-host.component.ts` намеренно, не инлайн в этом файле (см. комментарий там).
 */
describe('AppForm + FieldString (Angular, zoneless TestBed)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    })
  })

  it('читает label/placeholder/required из Zod .meta({ ui }) без единой правки в forms-core', () => {
    const fixture = TestBed.createComponent(Stage1HostComponent)
    fixture.detectChanges()

    const label = fixture.debugElement.query(By.css('label'))
    const input = fixture.debugElement.query(By.css('input'))

    expect(label.nativeElement.textContent).toContain('Название')
    expect(label.nativeElement.textContent).toContain('*') // required — .min(3) не делает поле optional
    expect(input.attributes['placeholder']).toBe('Введите название')
  })

  it('валидирует по Zod-подсхеме поля через нативный Angular FormControl', () => {
    const fixture = TestBed.createComponent(Stage1HostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('input')).nativeElement as HTMLInputElement
    input.value = 'ab'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new Event('blur'))
    fixture.detectChanges()

    const errorEl = fixture.debugElement.query(By.css('.letar-field__error'))
    expect(errorEl?.nativeElement.textContent).toContain('Минимум 3 символа')
  })

  it('снимает ошибку, когда значение снова валидно', () => {
    const fixture = TestBed.createComponent(Stage1HostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('input')).nativeElement as HTMLInputElement
    input.value = 'ab'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new Event('blur'))
    fixture.detectChanges()
    expect(fixture.debugElement.query(By.css('.letar-field__error'))).toBeTruthy()

    input.value = 'валидное название'
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    expect(fixture.debugElement.query(By.css('.letar-field__error'))).toBeFalsy()
  })

  it('submit отдаёт актуальное значение формы', () => {
    const fixture = TestBed.createComponent(Stage1HostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('input')).nativeElement as HTMLInputElement
    input.value = 'валидное название'
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit).toEqual({ title: 'валидное название' })
  })
})
