import { Component, effect, Input, signal } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { getZodConstraints } from '@letar/forms-core/schema'
import { coerceValue, getDefaultRow, parseTSV } from '@letar/forms-core/table'
import type { ResolvedColumn, TableColumnDef, TableFooterDef } from '@letar/forms-core/table'
import { computeAggregate, formatCellValue } from '@letar/forms-core/table'
import { FieldBase } from '../core/field-base'
import { resolveTableColumns } from '../core/table-columns'

export type { TableColumnDef, TableFooterDef } from '@letar/forms-core/table'

/**
 * Инлайн-редактируемая таблица для array-полей — Angular-эквивалент `FieldTableEditor`
 * (`@letar/forms-vue`). Значение — единый `FormControl` над `Record<string, unknown>[]`, тот же
 * принцип, что `FieldTags` (`string[]`) уже применяет в этом пакете: add/remove/move строк —
 * `ctrl.setValue([...новый массив])`, отдельного `FormArray` на ячейку не заводится (упрощение
 * относительно React/Vue-версий, где каждая ячейка — свой `form.Field`; здесь редактирование
 * ячейки — локальный `editingCell`-сигнал + `<input>`, коммитящий значение всей строки разом).
 *
 * ⚠️ **DOM-структура — намеренно без `<div>`-обёрток внутри `<tbody>`**: `<tr>` — прямые дети
 * `<tbody>`, ячейка `<td>` содержит либо текст, либо один `<input>`/`<button>` — никаких
 * промежуточных `div` вокруг строки. Известный баг Chakra-версии (см. `libs/forms/PLAN.md`,
 * задача про sortable-строки TableEditor) — именно невалидный HTML из-за div-обёртки строки
 * внутри `tbody`; здесь строка добавляется `draggable` напрямую на `<tr>`, без дублирующего слоя.
 *
 * **Упрощение объёма** (то же, что зафиксировано в Vue CHANGELOG): без мобильного карточного вида,
 * sortable — нативный HTML5 DnD, без keyboard-навигации по ячейкам (Tab/Enter от браузера
 * достаточно для этого стейджа) — авто-колонки из schema, TSV-paste, footer-агрегаты, drag-sort и
 * checkbox-selection перенесены как есть.
 */
@Component({
  selector: 'letar-field-table-editor',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field letar-field__table-editor-root" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div class="letar-field__table-editor" (paste)="onPaste($event, ctrl)">
          <table class="letar-field__table-editor-table">
            <thead>
              <tr>
                @if (selectable && !readOnly) {
                  <th>
                    <input
                      type="checkbox"
                      [checked]="allSelected()"
                      (change)="toggleSelectAll()"
                    />
                  </th>
                }
                @if (sortable && !readOnly) {
                  <th></th>
                }
                @for (col of resolvedColumns(); track col.name) {
                  <th [style.width]="col.width">{{ col.label }}</th>
                }
                @if (!readOnly) {
                  <th></th>
                }
              </tr>
            </thead>
            <tbody>
              @if (rows().length === 0) {
                <tr>
                  <td [attr.colspan]="emptyColspan()" class="letar-field__table-editor-empty">{{ emptyText }}</td>
                </tr>
              }
              @for (row of rows(); track $index; let rowIndex = $index) {
                <tr
                  [attr.draggable]="sortable && !readOnly ? true : null"
                  [attr.data-drag-over]="dragOverRow() === rowIndex"
                  (dragstart)="onRowDragStart(rowIndex)"
                  (dragover)="onRowDragOver($event, rowIndex)"
                  (drop)="onRowDrop(ctrl, rowIndex)"
                >
                  @if (selectable && !readOnly) {
                    <td>
                      <input
                        type="checkbox"
                        [checked]="selectedRows().has(rowIndex)"
                        (change)="toggleRowSelection(rowIndex)"
                      />
                    </td>
                  }
                  @if (sortable && !readOnly) {
                    <td class="letar-field__table-editor-drag-handle">⠿</td>
                  }
                  @for (col of resolvedColumns(); track col.name) {
                    <td [style.textAlign]="col.align">
                      @if (col.computed) {
                        {{ formatComputed(col, row) }}
                      } @else if (isEditing(rowIndex, col.name) && !readOnly && !col.readOnly) {
                        <input
                          class="letar-field__table-editor-cell-input"
                          [value]="row[col.name]"
                          (blur)="commitCell(ctrl, rowIndex, col.name, $event); setEditing(null)"
                          (keydown.enter)="commitCell(ctrl, rowIndex, col.name, $event); setEditing(null)"
                        />
                      } @else {
                        <span
                          class="letar-field__table-editor-cell"
                          (click)="!readOnly && !col.readOnly && setEditing(rowIndex, col.name)"
                        >{{ formatCell(col, row) }}</span>
                      }
                    </td>
                  }
                  @if (!readOnly) {
                    <td>
                      <button type="button" [attr.aria-label]="'Удалить строку'" (click)="removeRow(ctrl, rowIndex)">✕</button>
                    </td>
                  }
                </tr>
              }
            </tbody>
            @if (footer && footer.length > 0) {
              <tfoot>
                <tr>
                  @if (selectable && !readOnly) {
                    <td></td>
                  }
                  @if (sortable && !readOnly) {
                    <td></td>
                  }
                  @for (col of resolvedColumns(); track col.name) {
                    <td>{{ footerValue(col.name) }}</td>
                  }
                  @if (!readOnly) {
                    <td></td>
                  }
                </tr>
              </tfoot>
            }
          </table>
        </div>
        @if (!readOnly) {
          <button type="button" class="letar-field__table-editor-add" [disabled]="!canAdd()" (click)="addRow(ctrl)">
            {{ addLabel }}
          </button>
        }
        @if (helperText) {
          <p class="letar-field__helper">{{ helperText }}</p>
        }
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldTableEditorComponent extends FieldBase {
  @Input()
  columns?: TableColumnDef[]
  @Input()
  addLabel = 'Добавить строку'
  @Input()
  sortable = false
  @Input()
  selectable = false
  @Input()
  footer?: TableFooterDef[]
  @Input()
  maxRows?: number
  @Input()
  minRows?: number
  @Input()
  clipboard = true
  @Input()
  emptyText = 'Нет данных. Нажмите «Добавить строку»'
  @Input()
  helperText?: string
  @Input()
  disabled = false
  @Input()
  readOnly = false

  protected readonly rows = signal<Record<string, unknown>[]>([])
  protected readonly resolvedColumns = signal<ResolvedColumn[]>([])
  protected readonly selectedRows = signal<Set<number>>(new Set())
  protected readonly dragOverRow = signal<number | null>(null)
  private editingCell: { row: number; col: string } | null = null
  private dragRowIndex: number | null = null
  private maxRowsResolved?: number
  private minRowsResolved?: number

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      const schema = this.formRoot.schema()
      if (!ctrl) {
        return
      }
      this.resolvedColumns.set(resolveTableColumns(schema, this.name, this.columns))
      const constraints = getZodConstraints(schema, this.name)
      this.maxRowsResolved = this.maxRows ?? constraints.array?.maxItems
      this.minRowsResolved = this.minRows ?? constraints.array?.minItems

      const sync = () => this.rows.set((ctrl.value as Record<string, unknown>[] | undefined) ?? [])
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  protected canAdd(): boolean {
    return this.maxRowsResolved === undefined || this.rows().length < this.maxRowsResolved
  }

  private canRemove(): boolean {
    return this.minRowsResolved === undefined || this.rows().length > this.minRowsResolved
  }

  protected emptyColspan(): number {
    return this.resolvedColumns().length
      + (this.selectable && !this.readOnly ? 1 : 0)
      + (this.sortable && !this.readOnly ? 1 : 0)
      + (!this.readOnly ? 1 : 0)
  }

  protected formatCell(col: ResolvedColumn, row: Record<string, unknown>): string {
    return formatCellValue(row[col.name], col)
  }

  protected formatComputed(col: ResolvedColumn, row: Record<string, unknown>): string {
    return formatCellValue(col.computed?.(row), col)
  }

  protected footerValue(columnName: string): string {
    const def = this.footer?.find((f) => f.column === columnName)
    if (!def) {
      return ''
    }
    const col = this.resolvedColumns().find((c) => c.name === columnName)
    const value = computeAggregate(this.rows(), columnName, def.aggregate, col?.computed)
    const prefix = def.label ? `${def.label} ` : ''
    return prefix + (def.format ? def.format(value) : String(value))
  }

  protected isEditing(rowIndex: number, colName: string): boolean {
    return this.editingCell?.row === rowIndex && this.editingCell?.col === colName
  }

  protected setEditing(rowIndex: number | null, colName?: string): void {
    this.editingCell = rowIndex === null || colName === undefined ? null : { row: rowIndex, col: colName }
  }

  protected commitCell(
    ctrl: { setValue: (v: Record<string, unknown>[]) => void; markAsTouched: () => void },
    rowIndex: number,
    colName: string,
    event: Event,
  ): void {
    const raw = (event.target as HTMLInputElement).value
    const col = this.resolvedColumns().find((c) => c.name === colName)
    const value = col ? coerceValue(raw, col) : raw
    const next = this.rows().map((row, i) => (i === rowIndex ? { ...row, [colName]: value } : row))
    ctrl.setValue(next)
    ctrl.markAsTouched()
  }

  protected addRow(ctrl: { setValue: (v: Record<string, unknown>[]) => void; markAsTouched: () => void }): void {
    if (!this.canAdd()) {
      return
    }
    ctrl.setValue([...this.rows(), getDefaultRow(this.resolvedColumns())])
    ctrl.markAsTouched()
  }

  protected removeRow(
    ctrl: { setValue: (v: Record<string, unknown>[]) => void; markAsTouched: () => void },
    index: number,
  ): void {
    if (!this.canRemove()) {
      return
    }
    ctrl.setValue(this.rows().filter((_, i) => i !== index))
    ctrl.markAsTouched()
    const next = new Set<number>()
    for (const i of this.selectedRows()) {
      if (i < index) {
        next.add(i)
      } else if (i > index) {
        next.add(i - 1)
      }
    }
    this.selectedRows.set(next)
  }

  private moveRow(
    ctrl: { setValue: (v: Record<string, unknown>[]) => void; markAsTouched: () => void },
    from: number,
    to: number,
  ): void {
    const next = [...this.rows()]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    ctrl.setValue(next)
    ctrl.markAsTouched()
  }

  protected toggleRowSelection(index: number): void {
    const next = new Set(this.selectedRows())
    if (next.has(index)) {
      next.delete(index)
    } else {
      next.add(index)
    }
    this.selectedRows.set(next)
  }

  protected allSelected(): boolean {
    return this.rows().length > 0 && this.selectedRows().size === this.rows().length
  }

  protected toggleSelectAll(): void {
    this.selectedRows.set(this.allSelected() ? new Set() : new Set(this.rows().map((_, i) => i)))
  }

  protected onRowDragStart(rowIndex: number): void {
    this.dragRowIndex = rowIndex
  }

  protected onRowDragOver(event: DragEvent, rowIndex: number): void {
    event.preventDefault()
    this.dragOverRow.set(rowIndex)
  }

  protected onRowDrop(
    ctrl: { setValue: (v: Record<string, unknown>[]) => void; markAsTouched: () => void },
    rowIndex: number,
  ): void {
    const from = this.dragRowIndex
    this.dragOverRow.set(null)
    this.dragRowIndex = null
    if (from !== null && from !== rowIndex) {
      this.moveRow(ctrl, from, rowIndex)
    }
  }

  protected onPaste(
    event: ClipboardEvent,
    ctrl: { setValue: (v: Record<string, unknown>[]) => void; markAsTouched: () => void },
  ): void {
    if (!this.clipboard || this.disabled || this.readOnly || !this.canAdd()) {
      return
    }
    const target = event.target as HTMLElement
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
      return
    }
    const text = event.clipboardData?.getData('text/plain')
    if (!text) {
      return
    }
    const parsed = parseTSV(text)
    if (parsed.length === 0) {
      return
    }
    event.preventDefault()
    const columns = this.resolvedColumns()
    const editableCols = columns.filter((col) => !col.computed && !col.readOnly)
    const nextRows = [...this.rows()]
    for (const rawRow of parsed) {
      if (this.maxRowsResolved !== undefined && nextRows.length >= this.maxRowsResolved) {
        break
      }
      const row: Record<string, unknown> = {}
      for (let i = 0; i < editableCols.length && i < rawRow.length; i++) {
        row[editableCols[i].name] = coerceValue(rawRow[i], editableCols[i])
      }
      nextRows.push(row)
    }
    ctrl.setValue(nextRows)
    ctrl.markAsTouched()
  }
}
