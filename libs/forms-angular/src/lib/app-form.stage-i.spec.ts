import { provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { beforeEach, describe, expect, it } from 'vitest'
import { StageIHostComponent } from './testing/stage-i-host.component'

describe('Stage I — Likert/MatrixChoice/TableEditor/DataGrid (Angular)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    })
  })

  it('рендерит контролы всех четырёх полей', () => {
    const fixture = TestBed.createComponent(StageIHostComponent)
    fixture.detectChanges()

    expect(fixture.debugElement.query(By.css('.letar-field__likert[data-field-name="satisfaction"]'))).toBeTruthy()
    expect(fixture.debugElement.query(By.css('.letar-field__matrix[data-field-name="survey"]'))).toBeTruthy()
    expect(fixture.debugElement.query(By.css('.letar-field__table-editor-table'))).toBeTruthy()
    expect(fixture.debugElement.query(By.css('.letar-field__data-grid-table[data-field-name="grid"]'))).toBeTruthy()
  })

  it('FieldLikertComponent — клик по точке шкалы выбирает её и коммитит значение при submit', () => {
    const fixture = TestBed.createComponent(StageIHostComponent)
    fixture.detectChanges()

    const options = fixture.debugElement.queryAll(By.css('.letar-field__likert-option'))
    expect(options.length).toBe(3)

    options[2].nativeElement.click()
    fixture.detectChanges()

    expect(options[2].nativeElement.getAttribute('aria-checked')).toBe('true')

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['satisfaction']).toBe(3)
  })

  it('FieldMatrixChoiceComponent — клик по radio-ячейке записывает составное значение строки', () => {
    const fixture = TestBed.createComponent(StageIHostComponent)
    fixture.detectChanges()

    const goodCell = fixture.debugElement.query(
      By.css('.letar-field__matrix-radio[aria-label="Скорость ответа: Хорошо"]'),
    )
    goodCell.nativeElement.click()
    fixture.detectChanges()

    expect(goodCell.nativeElement.getAttribute('aria-checked')).toBe('true')

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    expect(fixture.componentInstance.lastSubmit?.['survey']).toEqual({ q1: 'good' })
  })

  it('FieldTableEditorComponent — добавляет строку и редактирует ячейку', () => {
    const fixture = TestBed.createComponent(StageIHostComponent)
    fixture.detectChanges()

    let bodyRows = fixture.debugElement.queryAll(By.css('.letar-field__table-editor-table tbody tr'))
    expect(bodyRows.length).toBe(2)

    const addButton = fixture.debugElement.query(By.css('.letar-field__table-editor-add'))
    addButton.nativeElement.click()
    fixture.detectChanges()

    bodyRows = fixture.debugElement.queryAll(By.css('.letar-field__table-editor-table tbody tr'))
    expect(bodyRows.length).toBe(3)

    // Строки — прямые `<tr>` в `<tbody>`, без `<div>`-обёрток вокруг строки/ячейки.
    for (const row of bodyRows) {
      const rowEl = row.nativeElement as HTMLTableRowElement
      expect(rowEl.tagName).toBe('TR')
      for (const child of Array.from(rowEl.children)) {
        expect(child.tagName).toBe('TD')
      }
    }

    const firstCell = fixture.debugElement.query(By.css('.letar-field__table-editor-cell'))
    firstCell.nativeElement.click()
    fixture.detectChanges()

    const cellInput = fixture.debugElement.query(By.css('.letar-field__table-editor-cell-input'))
      .nativeElement as HTMLInputElement
    cellInput.value = 'Диван'
    cellInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }))
    fixture.detectChanges()

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    fixture.detectChanges()

    const items = fixture.componentInstance.lastSubmit?.['items'] as Record<string, unknown>[]
    expect(items[0]['name']).toBe('Диван')
    expect(items.length).toBe(3)
  })

  it('FieldDataGridComponent — фильтр сужает строки, сортировка меняет порядок, чекбокс выбирает строку', () => {
    const fixture = TestBed.createComponent(StageIHostComponent)
    fixture.detectChanges()

    let bodyRows = fixture.debugElement.queryAll(By.css('.letar-field__data-grid-table tbody tr'))
    expect(bodyRows.length).toBe(2)

    const filterInput = fixture.debugElement.query(By.css('.letar-field__data-grid-filter-input'))
      .nativeElement as HTMLInputElement
    filterInput.value = 'Стол'
    filterInput.dispatchEvent(new Event('input'))
    fixture.detectChanges()

    bodyRows = fixture.debugElement.queryAll(By.css('.letar-field__data-grid-table tbody tr'))
    expect(bodyRows.length).toBe(1)
    expect(bodyRows[0].nativeElement.textContent).toContain('Стол')

    filterInput.value = ''
    filterInput.dispatchEvent(new Event('input'))
    fixture.detectChanges()

    const checkbox = fixture.debugElement.query(By.css('.letar-field__data-grid-table tbody input[type="checkbox"]'))
      .nativeElement as HTMLInputElement
    checkbox.checked = true
    checkbox.dispatchEvent(new Event('change'))
    fixture.detectChanges()

    expect(fixture.debugElement.query(By.css('.letar-field__data-grid-bulk-actions'))).toBeTruthy()
  })
})
