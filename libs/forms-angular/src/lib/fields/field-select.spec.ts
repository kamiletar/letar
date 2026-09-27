import { provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  FieldSelectBasicHostComponent as BasicHostComponent,
  FieldSelectCustomRenderHostComponent as CustomRenderHostComponent,
  FieldSelectNoEmptyOptionHostComponent as NoEmptyOptionHostComponent,
} from '../testing/field-select-host.component'

/**
 * Этап 3g паритета Select/Combobox (`forms-vue-angular-select-parity`) — точечные тесты
 * `FieldSelectComponent` рядом с реализацией. Сквозной сценарий (открытие/выбор/submit формы,
 * взаимодействие с `FieldCascadingSelectComponent`) уже покрыт `app-form.stage-e.spec.ts`, здесь —
 * то, что тому сценарию не нужно: клавиатура, `renderOption`/`renderValue`, `description`, опция
 * с пустым значением. Хост-компоненты — в `../testing/field-select-host.component.ts` (декоратор
 * `@Component` внутри `.spec.ts` не парсится текущей связкой esbuild/vitest этого пакета, тот же
 * приём, что `stage-e-host.component.ts`).
 */
function openPopup(fixture: ComponentFixture<unknown>): HTMLButtonElement {
  const trigger = fixture.debugElement.query(By.css('button[role="combobox"]')).nativeElement as HTMLButtonElement
  trigger.click()
  fixture.detectChanges()
  return trigger
}

describe('FieldSelectComponent (Этап 3g — кастомный listbox)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] })
  })

  it('закрыт по умолчанию; начальное значение "" совпадает с опцией — показан её label, не placeholder', () => {
    const fixture = TestBed.createComponent(BasicHostComponent)
    fixture.detectChanges()

    // initialValue формы — `{ country: '' }`, а среди опций есть `{ value: '', label: 'Все категории' }` —
    // значит поле уже НЕ пустое (опция с пустым значением — валидный выбор, см. тест ниже),
    // placeholder показывается только когда текущее значение не совпадает ни с одной опцией
    const trigger = fixture.debugElement.query(By.css('button[role="combobox"]')).nativeElement as HTMLButtonElement
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.textContent?.trim()).toBe('Все категории')
    expect(fixture.debugElement.query(By.css('ul[role="listbox"]'))).toBeNull()
  })

  it('показывает placeholder, когда текущее значение не совпадает ни с одной опцией', () => {
    const fixture = TestBed.createComponent(NoEmptyOptionHostComponent)
    fixture.detectChanges()

    const trigger = fixture.debugElement.query(By.css('button[role="combobox"]')).nativeElement as HTMLButtonElement
    expect(trigger.textContent?.trim()).toBe('Выберите страну')
  })

  it('открывается кликом по триггеру и закрывается повторным кликом', () => {
    const fixture = TestBed.createComponent(BasicHostComponent)
    fixture.detectChanges()
    const trigger = openPopup(fixture)

    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(fixture.debugElement.query(By.css('ul[role="listbox"]'))).not.toBeNull()

    trigger.click()
    fixture.detectChanges()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(fixture.debugElement.query(By.css('ul[role="listbox"]'))).toBeNull()
  })

  it('открывается стрелкой вниз, ArrowDown/Enter выбирают опцию', async () => {
    const fixture = TestBed.createComponent(BasicHostComponent)
    fixture.detectChanges()
    const trigger = fixture.debugElement.query(By.css('button[role="combobox"]')).nativeElement as HTMLButtonElement

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }))
    fixture.detectChanges()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')

    // Первая опция ('') уже активна после открытия (совпадает с текущим значением формы) —
    // двигаем на следующую ('ru') и выбираем Enter
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }))
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }))
    fixture.detectChanges()
    await Promise.resolve()

    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.textContent?.trim()).toBe('Россия')

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()
    expect(fixture.componentInstance.lastSubmit?.['country']).toBe('ru')
  })

  it('Escape закрывает попап без выбора', () => {
    const fixture = TestBed.createComponent(BasicHostComponent)
    fixture.detectChanges()
    const trigger = openPopup(fixture)

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    fixture.detectChanges()

    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    // Значение формы не изменилось — по-прежнему label опции с value=''
    expect(trigger.textContent?.trim()).toBe('Все категории')
  })

  it('выбор опции с пустым значением работает как любая другая опция', async () => {
    const fixture = TestBed.createComponent(BasicHostComponent)
    fixture.detectChanges()
    openPopup(fixture)

    // Сначала выбираем непустую опцию, чтобы убедиться, что возврат к '' — осознанный выбор, а не то,
    // что поле и так было в этом состоянии с самого начала
    let liOptions = fixture.debugElement.queryAll(By.css('li[role="option"]'))
    ;(liOptions[2].nativeElement as HTMLLIElement).click() // Германия
    fixture.detectChanges()
    await Promise.resolve()
    expect(fixture.debugElement.query(By.css('button[role="combobox"]')).nativeElement.textContent.trim())
      .toBe('Германия')

    openPopup(fixture)
    liOptions = fixture.debugElement.queryAll(By.css('li[role="option"]'))
    ;(liOptions[0].nativeElement as HTMLLIElement).click() // ''
    fixture.detectChanges()
    await Promise.resolve()

    const trigger = fixture.debugElement.query(By.css('button[role="combobox"]')).nativeElement as HTMLButtonElement
    expect(trigger.textContent?.trim()).toBe('Все категории')

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()
    expect(fixture.componentInstance.lastSubmit?.['country']).toBe('')
  })

  it('по умолчанию рендерит label и description второй строкой', () => {
    const fixture = TestBed.createComponent(BasicHostComponent)
    fixture.detectChanges()
    openPopup(fixture)

    const liOptions = fixture.debugElement.queryAll(By.css('li[role="option"]'))
    const russiaOption = liOptions[1].nativeElement as HTMLLIElement
    expect(russiaOption.querySelector('.letar-field__select-option-label')?.textContent).toBe('Россия')
    expect(russiaOption.querySelector('.letar-field__select-option-description')?.textContent)
      .toBe('Российская Федерация')

    // У опции без description вторая строка не рендерится вовсе
    const germanyOption = liOptions[2].nativeElement as HTMLLIElement
    expect(germanyOption.querySelector('.letar-field__select-option-description')).toBeNull()
  })

  it('renderOption/renderValue — свой шаблон подменяет содержимое опции и триггера', async () => {
    const fixture = TestBed.createComponent(CustomRenderHostComponent)
    fixture.detectChanges()
    const trigger = openPopup(fixture)

    const liOptions = fixture.debugElement.queryAll(By.css('li[role="option"]'))
    const customOption = liOptions[1].nativeElement.querySelector('.custom-option') as HTMLElement
    expect(customOption).not.toBeNull()
    expect(customOption.textContent?.trim()).toBe('Россия #ru')
    // Встроенный рендер опции (label/description-спаны) не используется, когда задан свой шаблон
    expect(liOptions[1].nativeElement.querySelector('.letar-field__select-option-label')).toBeNull()

    customOption.click()
    fixture.detectChanges()
    await Promise.resolve()

    const customValue = trigger.querySelector('.custom-value')
    expect(customValue?.textContent?.trim()).toBe('Выбрано: Россия')
  })
})
