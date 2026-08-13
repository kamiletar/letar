import { provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { beforeEach, describe, expect, it } from 'vitest'
import { StageFHostComponent } from './testing/stage-f-host.component'

describe('Stage F — CheckboxCard/Tags (Angular)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    })
  })

  it('FieldCheckboxCardComponent — множественный выбор карточками, role="checkbox"', () => {
    const fixture = TestBed.createComponent(StageFHostComponent)
    fixture.detectChanges()

    const cards = fixture.debugElement.queryAll(By.css('[data-field-name="interests"] .letar-field__card'))
    expect(cards.length).toBe(3)
    ;(cards[0].nativeElement as HTMLButtonElement).click()
    fixture.detectChanges()
    ;(cards[2].nativeElement as HTMLButtonElement).click()
    fixture.detectChanges()

    expect(cards[0].nativeElement.getAttribute('aria-checked')).toBe('true')
    expect(cards[1].nativeElement.getAttribute('aria-checked')).toBe('false')
    expect(cards[2].nativeElement.getAttribute('aria-checked')).toBe('true') // повторный клик снимает выбор
    ;(cards[0].nativeElement as HTMLButtonElement).click()
    fixture.detectChanges()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['interests']).toEqual(['art'])
  })

  it('FieldTagsComponent — Enter добавляет тег, Backspace на пустом черновике удаляет последний', () => {
    const fixture = TestBed.createComponent(StageFHostComponent)
    fixture.detectChanges()

    const input = fixture.debugElement.query(By.css('[data-field-name="skills"] input'))
      .nativeElement as HTMLInputElement

    input.value = 'TypeScript'
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }))
    fixture.detectChanges()

    input.value = 'Angular'
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }))
    fixture.detectChanges()

    let tags = fixture.debugElement.queryAll(By.css('[data-field-name="skills"] .letar-field__tag'))
    expect(tags.map((t) => t.nativeElement.textContent.trim().replace('×', '').trim())).toEqual([
      'TypeScript',
      'Angular',
    ])

    // Backspace на пустом черновике удаляет последний тег
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true }))
    fixture.detectChanges()

    tags = fixture.debugElement.queryAll(By.css('[data-field-name="skills"] .letar-field__tag'))
    expect(tags.length).toBe(1)

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['skills']).toEqual(['TypeScript'])
  })
})
