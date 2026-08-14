import { Component } from '@angular/core'
import { z } from 'zod'
import { AppFormComponent } from '../core/app-form.component'
import { type DataGridColumnDef, FieldDataGridComponent } from '../fields/field-data-grid.component'
import { FieldLikertComponent } from '../fields/field-likert.component'
import { FieldMatrixChoiceComponent, type MatrixColumn, type MatrixRow } from '../fields/field-matrix-choice.component'
import { FieldTableEditorComponent, type TableColumnDef } from '../fields/field-table-editor.component'

/**
 * Host для Stage I — 4 поля: `FieldLikertComponent`, `FieldMatrixChoiceComponent`,
 * `FieldTableEditorComponent`, `FieldDataGridComponent`. Тот же приём выноса Angular-декоратора
 * в обычный `.ts` (не `.spec.ts`), что и предыдущие stage-host компоненты. Array/составные поля —
 * `z.any()` в схеме (как `stage-f-host.component.ts` для `FieldTagsComponent`), колонки таблиц
 * заданы явно через `@Input()`, не выведены из schema.
 */
export const stageISchema = z.object({
  satisfaction: z.any().meta({ ui: { title: 'Удовлетворённость' } }),
  survey: z.any().meta({ ui: { title: 'Опрос' } }),
  items: z.any().meta({ ui: { title: 'Позиции' } }),
  grid: z.any().meta({ ui: { title: 'Таблица' } }),
})

const matrixRows: MatrixRow[] = [
  { value: 'q1', label: 'Скорость ответа' },
  { value: 'q2', label: 'Качество поддержки' },
]

const matrixColumns: MatrixColumn[] = [
  { value: 'bad', label: 'Плохо' },
  { value: 'ok', label: 'Нормально' },
  { value: 'good', label: 'Хорошо' },
]

const tableColumns: TableColumnDef[] = [
  { name: 'name', label: 'Название' },
  { name: 'qty', label: 'Кол-во' },
]

const gridColumns: DataGridColumnDef[] = [
  { name: 'name', label: 'Название', filter: true },
  { name: 'qty', label: 'Кол-во' },
]

@Component({
  standalone: true,
  imports: [
    AppFormComponent,
    FieldLikertComponent,
    FieldMatrixChoiceComponent,
    FieldTableEditorComponent,
    FieldDataGridComponent,
  ],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="initialValue" (formSubmit)="lastSubmit = $event">
      <letar-field-likert name="satisfaction" [anchors]="anchors" [showNumbers]="true" />
      <letar-field-matrix-choice name="survey" [rows]="matrixRows" [columns]="matrixColumns" />
      <letar-field-table-editor name="items" [columns]="tableColumns" [sortable]="true" />
      <letar-field-data-grid name="grid" [columns]="gridColumns" [rowSelection]="true" />
    </letar-app-form>
  `,
})
export class StageIHostComponent {
  schema = stageISchema
  initialValue = {
    satisfaction: undefined,
    survey: {},
    items: [{ name: 'Стул', qty: 2 }, { name: 'Стол', qty: 1 }],
    grid: [{ name: 'Стул', qty: 2 }, { name: 'Стол', qty: 1 }],
  }
  lastSubmit: Record<string, unknown> | undefined

  anchors = ['Не согласен', 'Нейтрально', 'Согласен']
  matrixRows = matrixRows
  matrixColumns = matrixColumns
  tableColumns = tableColumns
  gridColumns = gridColumns
}
