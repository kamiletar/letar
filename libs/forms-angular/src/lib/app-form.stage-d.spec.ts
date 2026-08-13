import { provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { beforeEach, describe, expect, it } from 'vitest'
import { StageDHostComponent } from './testing/stage-d-host.component'

function typeValue(input: HTMLInputElement, value: string): void {
  input.value = value
  input.dispatchEvent(new Event('input'))
}

describe('Stage D — DateRange/DateTimePicker/Duration/Schedule (Angular)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    })
  })

  describe('FieldDateRangeComponent', () => {
    it('рендерит два input[type="date"] и собирает значение { start, end }', () => {
      const fixture = TestBed.createComponent(StageDHostComponent)
      fixture.detectChanges()

      const startInput = fixture.debugElement.query(By.css('[data-field-name="vacation.start"]'))
        .nativeElement as HTMLInputElement
      const endInput = fixture.debugElement.query(By.css('[data-field-name="vacation.end"]'))
        .nativeElement as HTMLInputElement
      expect(startInput.type).toBe('date')
      expect(endInput.type).toBe('date')

      typeValue(startInput, '2026-08-01')
      fixture.detectChanges()
      typeValue(endInput, '2026-08-14')
      fixture.detectChanges()

      const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
      form.dispatchEvent(new Event('submit', { cancelable: true }))
      fixture.detectChanges()

      expect(fixture.componentInstance.lastSubmit?.['vacation']).toEqual({ start: '2026-08-01', end: '2026-08-14' })
    })

    it('клик по пресету заполняет обе даты разом', () => {
      const fixture = TestBed.createComponent(StageDHostComponent)
      fixture.detectChanges()

      const presetButton = fixture.debugElement.query(By.css('.letar-field__date-range-preset'))
        .nativeElement as HTMLButtonElement
      presetButton.click()
      fixture.detectChanges()

      const startInput = fixture.debugElement.query(By.css('[data-field-name="vacation.start"]'))
        .nativeElement as HTMLInputElement
      const endInput = fixture.debugElement.query(By.css('[data-field-name="vacation.end"]'))
        .nativeElement as HTMLInputElement
      expect(startInput.value).not.toBe('')
      expect(endInput.value).not.toBe('')
    })
  })

  describe('FieldDateTimePickerComponent', () => {
    it('комбинирует date+time инпуты в единую ISO-строку в FormControl', () => {
      const fixture = TestBed.createComponent(StageDHostComponent)
      fixture.detectChanges()

      const dateInput = fixture.debugElement.query(By.css('[data-field-name="meeting-date"]'))
        .nativeElement as HTMLInputElement
      typeValue(dateInput, '2026-08-20')
      fixture.detectChanges()

      const timeInput = fixture.debugElement.query(By.css('[data-field-name="meeting-time"]'))
        .nativeElement as HTMLInputElement
      typeValue(timeInput, '14:30')
      fixture.detectChanges()

      const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
      form.dispatchEvent(new Event('submit', { cancelable: true }))
      fixture.detectChanges()

      expect(fixture.componentInstance.lastSubmit?.['meeting']).toBe('2026-08-20T14:30:00')
    })
  })

  describe('FieldDurationComponent', () => {
    it('формат HH:MM — два input[type="number"], изменение часов пересчитывает минуты в FormControl', () => {
      const fixture = TestBed.createComponent(StageDHostComponent)
      fixture.detectChanges()

      const hoursInput = fixture.debugElement.query(By.css('[data-field-name="meetingLength-hours"]'))
        .nativeElement as HTMLInputElement
      typeValue(hoursInput, '2')
      fixture.detectChanges()

      const minsInput = fixture.debugElement.query(By.css('[data-field-name="meetingLength-mins"]'))
        .nativeElement as HTMLInputElement
      typeValue(minsInput, '30')
      fixture.detectChanges()

      const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
      form.dispatchEvent(new Event('submit', { cancelable: true }))
      fixture.detectChanges()

      expect(fixture.componentInstance.lastSubmit?.['meetingLength']).toBe(150)
    })

    it('валидирует по Zod-подсхеме минут (min: 15)', () => {
      const fixture = TestBed.createComponent(StageDHostComponent)
      fixture.detectChanges()

      const hoursInput = fixture.debugElement.query(By.css('[data-field-name="meetingLength-hours"]'))
        .nativeElement as HTMLInputElement
      typeValue(hoursInput, '0')
      fixture.detectChanges()
      hoursInput.dispatchEvent(new Event('blur'))
      fixture.detectChanges()

      const errorEl = fixture.debugElement.query(
        By.css('[data-field-name="meetingLength"] .letar-field__error'),
      )
      expect(errorEl?.nativeElement.textContent).toContain('Минимум 15 минут')
    })
  })

  describe('FieldScheduleComponent', () => {
    it('рендерит 7 дней недели с переключателем и временем открытия/закрытия', () => {
      const fixture = TestBed.createComponent(StageDHostComponent)
      fixture.detectChanges()

      const dayRows = fixture.debugElement.queryAll(By.css('[data-day]'))
      expect(dayRows.length).toBe(7)

      const mondayToggle = fixture.debugElement.query(By.css('[data-day-switch="monday"]'))
        .nativeElement as HTMLInputElement
      expect(mondayToggle.checked).toBe(true)

      const saturdayOff = fixture.debugElement.query(By.css('[data-day="saturday"] .letar-field__schedule-day-off'))
      expect(saturdayOff).toBeTruthy()
    })

    it('выключение дня убирает его расписание из FormControl (null)', () => {
      const fixture = TestBed.createComponent(StageDHostComponent)
      fixture.detectChanges()

      const mondayToggle = fixture.debugElement.query(By.css('[data-day-switch="monday"]'))
        .nativeElement as HTMLInputElement
      mondayToggle.checked = false
      mondayToggle.dispatchEvent(new Event('change'))
      fixture.detectChanges()

      const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
      form.dispatchEvent(new Event('submit', { cancelable: true }))
      fixture.detectChanges()

      const workingHours = fixture.componentInstance.lastSubmit?.['workingHours'] as Record<string, unknown>
      expect(workingHours['monday']).toBeNull()
    })

    it('«Скопировать Пн на будни» копирует расписание понедельника на вторник-пятницу', () => {
      const fixture = TestBed.createComponent(StageDHostComponent)
      fixture.detectChanges()

      const mondayOpenInput = fixture.debugElement.query(By.css('[data-day="monday"] input[type="time"]'))
        .nativeElement as HTMLInputElement
      typeValue(mondayOpenInput, '')
      mondayOpenInput.value = '08:00'
      mondayOpenInput.dispatchEvent(new Event('change'))
      fixture.detectChanges()

      const copyButton = fixture.debugElement.query(By.css('.letar-field__schedule-copy'))
        .nativeElement as HTMLButtonElement
      copyButton.click()
      fixture.detectChanges()

      const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
      form.dispatchEvent(new Event('submit', { cancelable: true }))
      fixture.detectChanges()

      const workingHours = fixture.componentInstance.lastSubmit?.['workingHours'] as Record<
        string,
        { open: string; close: string } | null
      >
      expect(workingHours['friday']?.open).toBe('08:00')
    })
  })
})
