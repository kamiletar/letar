import { Component, effect, Input, signal } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

/** Строка матрицы (вопрос) для `FieldMatrixChoice`. */
export interface MatrixRow {
  value: string
  label: string
}

/** Колонка матрицы (вариант ответа) для `FieldMatrixChoice`. */
export interface MatrixColumn {
  value: string
  label: string
}

/**
 * Таблица «вопрос × вариант ответа» — Angular-эквивалент `FieldMatrixChoice` (`@letar/forms-vue`).
 * Значение — составное: один `FormControl` на весь `Record<string, string | string[]>` (тот же
 * принцип, что `FieldSchedule`/`FieldCreditCard` уже применяли в Stage D/E — не отдельный
 * `FormControl` на строку). Три варианта (`radio`/`checkbox`/`rating`), per-row required-подсветка
 * атрибутом `data-row-error` — портировано из Vue-версии без изменений логики.
 *
 * DOM: `<tr>` — прямые дети `<tbody>`, без `<div>`-обёрток внутри строки/ячейки — тот же паттерн,
 * который `FieldTableEditor` обязан соблюдать (см. комментарий там про баг Chakra-версии).
 */
@Component({
  selector: 'letar-field-matrix-choice',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <table class="letar-field__matrix" [attr.data-field-name]="name">
          <thead>
            <tr>
              <th></th>
              @for (col of columns; track col.value) {
                <th>{{ col.label }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rows; track row.value) {
              <tr [attr.data-row-error]="isRequired() && hasError() && isRowEmpty(row.value)">
                <td class="letar-field__matrix-row-label">{{ row.label }}</td>
                @for (col of columns; track col.value) {
                  <td>
                    @switch (variant) {
                      @case ('checkbox') {
                        <input
                          type="checkbox"
                          class="letar-field__matrix-checkbox"
                          [attr.aria-label]="row.label + ': ' + col.label"
                          [checked]="isSelected(row.value, col.value)"
                          [disabled]="disabled"
                          (change)="toggle(ctrl, row.value, col.value)"
                        />
                      }
                      @case ('rating') {
                        <button
                          type="button"
                          class="letar-field__matrix-rating"
                          [attr.aria-label]="row.label + ': ' + col.label"
                          [attr.aria-pressed]="isSelected(row.value, col.value)"
                          [attr.data-selected]="isSelected(row.value, col.value)"
                          [disabled]="disabled"
                          (click)="toggle(ctrl, row.value, col.value)"
                        >★</button>
                      }
                      @default {
                        <button
                          type="button"
                          role="radio"
                          class="letar-field__matrix-radio"
                          [attr.aria-label]="row.label + ': ' + col.label"
                          [attr.aria-checked]="isSelected(row.value, col.value)"
                          [attr.data-selected]="isSelected(row.value, col.value)"
                          [disabled]="disabled"
                          (click)="toggle(ctrl, row.value, col.value)"
                        >
                          @if (isSelected(row.value, col.value)) {
                            <span class="letar-field__matrix-radio-dot"></span>
                          }
                        </button>
                      }
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldMatrixChoiceComponent extends FieldBase {
  @Input({ required: true })
  rows: MatrixRow[] = []
  @Input({ required: true })
  columns: MatrixColumn[] = []
  @Input()
  variant: 'radio' | 'checkbox' | 'rating' = 'radio'
  @Input()
  disabled = false

  protected readonly matrixValue = signal<Record<string, string | string[]>>({})

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => this.matrixValue.set((ctrl.value as Record<string, string | string[]> | undefined) ?? {})
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  protected isSelected(rowValue: string, colValue: string): boolean {
    const rowVal = this.matrixValue()[rowValue]
    if (this.variant === 'checkbox') {
      return Array.isArray(rowVal) && rowVal.includes(colValue)
    }
    return rowVal === colValue
  }

  protected isRowEmpty(rowValue: string): boolean {
    const rowVal = this.matrixValue()[rowValue]
    return this.variant === 'checkbox' ? !Array.isArray(rowVal) || rowVal.length === 0 : !rowVal
  }

  protected toggle(
    ctrl: { setValue: (value: Record<string, string | string[]>) => void; markAsTouched: () => void },
    rowValue: string,
    colValue: string,
  ): void {
    if (this.disabled) {
      return
    }
    const value = this.matrixValue()
    if (this.variant === 'checkbox') {
      const current = (value[rowValue] as string[] | undefined) ?? []
      const next = current.includes(colValue) ? current.filter((v) => v !== colValue) : [...current, colValue]
      ctrl.setValue({ ...value, [rowValue]: next })
    } else {
      ctrl.setValue({ ...value, [rowValue]: colValue })
    }
    ctrl.markAsTouched()
  }
}
