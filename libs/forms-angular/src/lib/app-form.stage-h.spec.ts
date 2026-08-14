import { provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { beforeEach, describe, expect, it } from 'vitest'
import { StageHHostComponent } from './testing/stage-h-host.component'

/**
 * `FieldRichTextComponent`'s реальный `import()` (не `defineAsyncComponent`, как в Vue, но тот же
 * принцип «резолвится через несколько тасков очереди микро/макрозадач») — обычного
 * `fixture.detectChanges()` недостаточно, нужно прогнать очередь несколько раз.
 */
async function waitForLazyField(fixture: { detectChanges: () => void }) {
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 25))
    fixture.detectChanges()
  }
}

describe('Stage H — PasswordStrength/Editable/RichText (Angular)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    })
  })

  it('рендерит контролы всех трёх полей (RichText — после ленивой подгрузки)', async () => {
    const fixture = TestBed.createComponent(StageHHostComponent)
    fixture.detectChanges()

    expect(fixture.debugElement.query(By.css('input[data-field-name="password"]'))).toBeTruthy()
    expect(fixture.debugElement.query(By.css('.letar-field__editable-preview[data-field-name="nickname"]')))
      .toBeTruthy()
    expect(fixture.debugElement.query(By.css('.letar-field__lazy-skeleton'))).toBeTruthy()

    await waitForLazyField(fixture)

    expect(fixture.debugElement.query(By.css('.letar-field__richtext[data-field-name="bio"]'))).toBeTruthy()
    expect(fixture.debugElement.query(By.css('.letar-field__lazy-skeleton'))).toBeFalsy()
  })

  it('FieldPasswordStrengthComponent — ввод пароля обновляет метр силы и чеклист требований', async () => {
    const fixture = TestBed.createComponent(StageHHostComponent)
    fixture.detectChanges()
    // Дожидаемся фонового `import()` ленивого RichText-поля того же хоста — иначе он резолвится
    // уже после уничтожения TestBed-окружения этого теста (`destroyAfterEach`) и роняет
    // необработанный `NG0205: Injector has already been destroyed`.
    await waitForLazyField(fixture)

    const input = fixture.debugElement.query(By.css('input[data-field-name="password"]'))
      .nativeElement as HTMLInputElement

    input.value = 'weak'
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()

    let fill = fixture.debugElement.query(By.css('.letar-field__password-meter-fill'))
      .nativeElement as HTMLDivElement
    const weakWidth = Number.parseFloat(fill.style.width)
    expect(weakWidth).toBeGreaterThan(0)
    expect(weakWidth).toBeLessThan(100)

    input.value = 'Str0ng!Pass'
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()

    fill = fixture.debugElement.query(By.css('.letar-field__password-meter-fill')).nativeElement as HTMLDivElement
    expect(Number.parseFloat(fill.style.width)).toBe(100)

    const requirements = fixture.debugElement.queryAll(By.css('.letar-field__password-requirement'))
    expect(requirements.length).toBe(5)
    expect(requirements.every((r) => r.nativeElement.getAttribute('data-met') === 'true')).toBe(true)

    // Переключатель видимости
    const toggle = fixture.debugElement.query(By.css('.letar-field__password-toggle')).nativeElement as HTMLElement
    expect(input.type).toBe('password')
    toggle.click()
    fixture.detectChanges()
    expect(input.type).toBe('text')
  })

  it('FieldEditableComponent — клик открывает инпут, Enter коммитит, Escape отменяет черновик', async () => {
    const fixture = TestBed.createComponent(StageHHostComponent)
    fixture.detectChanges()
    await waitForLazyField(fixture)

    const preview = fixture.debugElement.query(By.css('.letar-field__editable-preview[data-field-name="nickname"]'))
      .nativeElement as HTMLButtonElement
    expect(preview.textContent?.trim()).toBe('Нажмите для редактирования')

    preview.click()
    fixture.detectChanges()

    let input = fixture.debugElement.query(By.css('input[data-field-name="nickname"]'))
      .nativeElement as HTMLInputElement
    input.value = 'Ками'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }))
    fixture.detectChanges()

    const previewAfterCommit = fixture.debugElement.query(
      By.css('.letar-field__editable-preview[data-field-name="nickname"]'),
    ).nativeElement as HTMLButtonElement
    expect(previewAfterCommit.textContent?.trim()).toBe('Ками')

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()
    expect(fixture.componentInstance.lastSubmit?.['nickname']).toBe('Ками')

    // Второй заход: правим черновик, потом Escape — activationMode='click' возвращает превью,
    // черновик отброшен, сохранённое значение контрола не тронуто (порт поведения Vue-версии:
    // `isEditing.value = props.activationMode === 'none'`).
    previewAfterCommit.click()
    fixture.detectChanges()

    input = fixture.debugElement.query(By.css('input[data-field-name="nickname"]')).nativeElement as HTMLInputElement
    input.value = 'Черновик'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    fixture.detectChanges()

    expect(fixture.debugElement.query(By.css('input[data-field-name="nickname"]'))).toBeFalsy()
    const previewAfterEscape = fixture.debugElement.query(
      By.css('.letar-field__editable-preview[data-field-name="nickname"]'),
    ).nativeElement as HTMLButtonElement
    expect(previewAfterEscape.textContent?.trim()).toBe('Ками')
  })

  it('FieldRichTextComponent — после ленивой подгрузки рендерит тулбар и contenteditable, клик по "B" переключает bold', async () => {
    const fixture = TestBed.createComponent(StageHHostComponent)
    fixture.detectChanges()
    await waitForLazyField(fixture)

    expect(fixture.debugElement.query(By.css('.letar-field__richtext-toolbar'))).toBeTruthy()
    const editable = fixture.debugElement.query(By.css('[contenteditable="true"]'))
    expect(editable).toBeTruthy()

    const boldButton = fixture.debugElement.queryAll(By.css('.letar-field__richtext-btn'))
      .find((btn) => btn.nativeElement.textContent.trim() === 'B')
    expect(boldButton).toBeTruthy()
    expect(boldButton!.nativeElement.getAttribute('aria-pressed')).toBe('false')

    editable!.nativeElement.dispatchEvent(new FocusEvent('focus'))
    boldButton!.nativeElement.click()
    fixture.detectChanges()
    await Promise.resolve()
    fixture.detectChanges()

    expect(boldButton!.nativeElement.getAttribute('aria-pressed')).toBe('true')
  })
})
