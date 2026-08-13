import { provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StageGHostComponent } from './testing/stage-g-host.component'

describe('Stage G — PinInput/OTPInput/ColorPicker/FileUpload/Signature/Address/City/CreditCard (Angular)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    })
    // jsdom не реализует 2D-контекст canvas — стаб с методами, которые вызывает FieldSignatureComponent.
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,stub')
  })

  it('рендерят контролы всех восьми полей', () => {
    const fixture = TestBed.createComponent(StageGHostComponent)
    fixture.detectChanges()

    expect(fixture.debugElement.queryAll(By.css('input[data-field-name="pin"]')).length).toBe(1)
    expect(fixture.debugElement.query(By.css('.letar-field__pin-input')).queryAll(By.css('input')).length).toBe(4)
    expect(fixture.debugElement.query(By.css('input[type="color"][data-field-name="color"]'))).toBeTruthy()
    expect(fixture.debugElement.query(By.css('input[type="file"][data-field-name="file"]'))).toBeTruthy()
    expect(fixture.debugElement.query(By.css('canvas[data-field-name="signature"]'))).toBeTruthy()
    expect(fixture.debugElement.query(By.css('input[data-field-name="address"]'))).toBeTruthy()
    expect(fixture.debugElement.query(By.css('input[data-field-name="city"]'))).toBeTruthy()
    expect(fixture.debugElement.query(By.css('input[name="cardnumber"]'))).toBeTruthy()
  })

  it('FieldPinInputComponent — ввод цифры переводит фокус на следующую ячейку и склеивает значение', () => {
    const fixture = TestBed.createComponent(StageGHostComponent)
    fixture.detectChanges()

    const boxes = fixture.debugElement.queryAll(By.css('.letar-field__pin-input-box'))
      .map((el) => el.nativeElement as HTMLInputElement)

    for (const [i, digit] of ['1', '2', '3', '4'].entries()) {
      boxes[i]!.value = digit
      boxes[i]!.dispatchEvent(new Event('input'))
    }
    fixture.detectChanges()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['pin']).toBe('1234')
  })

  it('FieldOtpInputComponent — показывает таймер повторной отправки, после клика — вызывает onResend', async () => {
    const onResend = vi.fn().mockResolvedValue(undefined)
    const fixture = TestBed.createComponent(StageGHostComponent)
    fixture.componentInstance.onResend = onResend
    fixture.detectChanges()

    const button = fixture.debugElement.query(By.css('.letar-field__otp-resend button'))
    expect(button.nativeElement.textContent.trim()).toBe('Отправить повторно')

    button.nativeElement.click()
    fixture.detectChanges()
    await Promise.resolve()
    fixture.detectChanges()

    expect(onResend).toHaveBeenCalledOnce()
    expect(fixture.debugElement.query(By.css('[data-testid="otp-countdown"]'))).toBeTruthy()
  })

  it('FieldColorPickerComponent — выбор свотча обновляет значение и отмечает его выбранным', () => {
    const fixture = TestBed.createComponent(StageGHostComponent)
    fixture.detectChanges()

    const swatch = fixture.debugElement.query(By.css('.letar-field__color-swatch[aria-label="#F56565"]'))
    swatch.nativeElement.click()
    fixture.detectChanges()

    const colorInput = fixture.debugElement.query(By.css('input[type="color"]')).nativeElement as HTMLInputElement
    expect(colorInput.value).toBe('#f56565')
    expect(swatch.nativeElement.getAttribute('data-selected')).toBe('true')
  })

  it('FieldFileUploadComponent — выбор файла добавляет его в список, удаление убирает', () => {
    const fixture = TestBed.createComponent(StageGHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('input[type="file"]')).nativeElement as HTMLInputElement
    const file = new File(['hello'], 'note.txt', { type: 'text/plain' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    input.dispatchEvent(new Event('change'))
    fixture.detectChanges()

    expect(fixture.debugElement.query(By.css('.letar-field__file-item')).nativeElement.textContent).toContain(
      'note.txt',
    )

    fixture.debugElement.query(By.css('.letar-field__file-item button')).nativeElement.click()
    fixture.detectChanges()

    expect(fixture.debugElement.query(By.css('.letar-field__file-item'))).toBeFalsy()
  })

  it('FieldSignatureComponent — рисование на canvas показывает кнопку очистки, очистка убирает её', () => {
    const fixture = TestBed.createComponent(StageGHostComponent)
    fixture.detectChanges()

    const canvas = fixture.debugElement.query(By.css('canvas')).nativeElement as HTMLCanvasElement
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 5, clientY: 5 }))
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 15, clientY: 15 }))
    canvas.dispatchEvent(new MouseEvent('mouseup'))
    fixture.detectChanges()

    expect(fixture.debugElement.query(By.css('.letar-field__signature-actions button'))).toBeTruthy()

    fixture.debugElement.query(By.css('.letar-field__signature-actions button')).nativeElement.click()
    fixture.detectChanges()

    expect(fixture.debugElement.query(By.css('.letar-field__signature-actions'))).toBeFalsy()
  })

  it('FieldAddressComponent — ввод запроса показывает подсказки, выбор заполняет инпут', async () => {
    const fixture = TestBed.createComponent(StageGHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('input[data-field-name="address"]'))
      .nativeElement as HTMLInputElement
    input.value = 'Тверская'
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()

    await new Promise((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    expect(fixture.componentInstance.provider.getSuggestions).toHaveBeenCalledWith('Тверская', expect.anything())

    const suggestion = fixture.debugElement.query(By.css('.letar-field__address-suggestions li'))
    suggestion.nativeElement.dispatchEvent(new MouseEvent('mousedown', { cancelable: true }))
    fixture.detectChanges()

    expect(input.value).toBe('Москва, ул. Тверская, д. 1')
  })

  it('FieldCityComponent — выбор подсказки извлекает название города из данных провайдера', async () => {
    const fixture = TestBed.createComponent(StageGHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('input[data-field-name="city"]'))
      .nativeElement as HTMLInputElement
    input.value = 'Моск'
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()

    await new Promise((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const suggestion = fixture.debugElement.query(By.css('.letar-field__address-suggestions li'))
    suggestion.nativeElement.dispatchEvent(new MouseEvent('mousedown', { cancelable: true }))
    fixture.detectChanges()

    expect(input.value).toBe('Москва')
  })

  it('FieldCreditCardComponent — ввод номера/срока/CVC пишет составное значение и определяет бренд', () => {
    const fixture = TestBed.createComponent(StageGHostComponent)
    fixture.detectChanges()

    const numberInput = fixture.debugElement.query(By.css('input[name="cardnumber"]'))
      .nativeElement as HTMLInputElement
    numberInput.value = '4111111111111111'
    numberInput.dispatchEvent(new Event('input'))
    fixture.detectChanges()

    expect(numberInput.getAttribute('data-status')).toBe('idle')
    expect(fixture.debugElement.query(By.css('[data-brand]')).nativeElement.getAttribute('data-brand')).toBe('visa')

    const expiryInput = fixture.debugElement.query(By.css('input[name="cc-exp"]')).nativeElement as HTMLInputElement
    expiryInput.value = '1230'
    expiryInput.dispatchEvent(new Event('input'))
    fixture.detectChanges()

    const cvcInput = fixture.debugElement.query(By.css('input[name="cvc"]')).nativeElement as HTMLInputElement
    cvcInput.value = '123'
    cvcInput.dispatchEvent(new Event('input'))
    fixture.detectChanges()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['card']).toEqual({
      number: '4111111111111111',
      expiry: '12/30',
      cvc: '123',
    })
  })
})
