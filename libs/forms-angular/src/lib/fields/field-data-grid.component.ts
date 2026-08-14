import { Component, computed, effect, Input, signal } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import {
  type ColumnDef,
  type ColumnFiltersState,
  createTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type Table,
} from '@tanstack/table-core'
import { FieldBase } from '../core/field-base'

/** Определение колонки `FieldDataGrid` — то же API, что у Vue/React-версий (`DataGridColumnDef`). */
export interface DataGridColumnDef {
  /** Имя поля в объекте строки */
  name: string
  /** Заголовок (по умолчанию — camelCase → Title Case от `name`) */
  label?: string
  /** Ширина (px или CSS-значение) */
  width?: string
  /** Редактируемая (по умолчанию true) */
  editable?: boolean
  /** Показать текстовый фильтр над колонкой */
  filter?: boolean
  /** Выравнивание */
  align?: 'left' | 'center' | 'right'
}

type GridRow = Record<string, unknown>

function camelToTitle(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

/**
 * CSV-экспорт (`Blob` + `URL.createObjectURL`, без доп. либы) — порт `exportDataGridCsv`
 * (`@letar/forms-vue`, `use-data-grid.ts`), идентична и React-версии.
 */
function exportCsv(rows: GridRow[], columns: DataGridColumnDef[], filenamePrefix: string): void {
  const headers = columns.map((c) => c.label ?? camelToTitle(c.name)).join(',')
  const csvRows = rows.map((row) =>
    columns
      .map((c) => {
        const str = String(row[c.name] ?? '')
        return str.includes(',') ? `"${str}"` : str
      })
      .join(',')
  )
  const csv = [headers, ...csvRows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filenamePrefix}-export.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Большая таблица на `@tanstack/table-core` — Angular-эквивалент `FieldDataGrid`
 * (`@letar/forms-vue`). Значение — единый `FormControl` над `Record<string, unknown>[]` (тот же
 * принцип, что `FieldTableEditor` в этом стейдже), только не строит массив сам (нет `add`/`move`) —
 * DataGrid просматривает и точечно редактирует уже существующий массив, `removeRows` только для
 * bulk-delete выбранных строк — тот же контракт, что `useDataGridField` (`@letar/forms-vue`).
 *
 * ## Архитектурное решение: без lazy-loading, в отличие от `FieldRichTextComponent` (Tiptap)
 *
 * `@tiptap/*` (Stage H) тянет ProseMirror — многомодульный WYSIWYG-движок, объективно тяжёлый
 * peer-dep, не нужный большинству форм. `@tanstack/table-core` — framework-agnostic ядро без
 * собственных runtime-зависимостей (в `package.json` пакета нет `dependencies`, только `devDependencies`
 * для сборки самого пакета), на порядок легче: тот же движок, что уже используется в
 * `@tanstack/vue-table`/`@tanstack/react-table` (Vue/React-скины `@letar/forms` его не лениво
 * грузят — `field-data-grid-impl.ts`/`.tsx` подключены статически). Раз оригиналы в двух других
 * фреймворках этой же библиотеки не считают нужным лениво грузить именно эту зависимость — нет
 * причины вводить асимметрию здесь. Обёрточный компонент (`ViewContainerRef.createComponent` +
 * `import()`, как у RichText) появится, если `DataGrid` обрастёт собственным тяжёлым рендерером
 * (виртуализация и т.п.) — вне скоупа Stage I (см. `libs/forms/PLAN.md`).
 *
 * ## Упрощение относительно React/Vue-версий (тот же уровень, что и `FieldTableEditor` здесь)
 *
 * Заголовки/фильтры/пагинация рендерятся напрямую из `resolvedColumns()`, не через
 * `table.getHeaderGroups()` — `@tanstack/table-core` используется только как чистый движок
 * сортировки/фильтрации/пагинации (`table.getRowModel().rows`), без `flexRender`-подобного слоя
 * (в Angular таких общепринятых адаптеров для table-core нет, в отличие от `@tanstack/vue-table`/
 * `@tanstack/react-table`). Инлайн-редактирование ячейки — тот же приём, что в
 * `FieldTableEditorComponent` (клик → `<input>` → commit на blur/Enter), без виртуализации,
 * resize/drag-reorder колонок — те же beta-упрощения, что и в Vue/React DataGrid.
 */
@Component({
  selector: 'letar-field-data-grid',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field letar-field__data-grid-root" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        @if (rowSelection && selectedCount() > 0) {
          <div class="letar-field__data-grid-bulk-actions">
            <span>{{ selectedCount() }} выбрано</span>
            <button type="button" (click)="deleteSelected(ctrl)">Удалить выбранные</button>
          </div>
        }
        <table class="letar-field__data-grid-table" [attr.data-field-name]="name">
          <thead>
            <tr>
              @if (rowSelection) {
                <th>
                  <input type="checkbox" [checked]="allSelected()" (change)="toggleSelectAll()" />
                </th>
              }
              @for (col of resolvedColumns(); track col.name) {
                <th [style.width]="col.width" [style.textAlign]="col.align">
                  <button type="button" class="letar-field__data-grid-sort-btn" (click)="toggleSort(col.name)">
                    {{ col.label ?? col.name }}
                    @if (sortDirection(col.name); as dir) {
                      <span class="letar-field__data-grid-sort-icon">{{ dir === 'asc' ? '▲' : '▼' }}</span>
                    }
                  </button>
                </th>
              }
            </tr>
            @if (hasAnyFilter()) {
              <tr class="letar-field__data-grid-filter-row">
                @if (rowSelection) {
                  <th></th>
                }
                @for (col of resolvedColumns(); track col.name) {
                  <th>
                    @if (col.filter) {
                      <input
                        class="letar-field__data-grid-filter-input"
                        [placeholder]="'Фильтр: ' + (col.label ?? col.name)"
                        [value]="filterValue(col.name)"
                        (input)="setFilter(col.name, $event)"
                      />
                    }
                  </th>
                }
              </tr>
            }
          </thead>
          <tbody>
            @if (pageRows().length === 0) {
              <tr>
                <td [attr.colspan]="resolvedColumns().length + (rowSelection ? 1 : 0)" class="letar-field__data-grid-empty">
                  Нет данных
                </td>
              </tr>
            }
            @for (row of pageRows(); track row.rowIndex) {
              <tr [attr.data-selected]="isSelected(row.rowIndex)">
                @if (rowSelection) {
                  <td>
                    <input type="checkbox" [checked]="isSelected(row.rowIndex)" (change)="toggleRowSelection(row.rowIndex)" />
                  </td>
                }
                @for (col of resolvedColumns(); track col.name) {
                  <td [style.textAlign]="col.align">
                    @if (isEditing(row.rowIndex, col.name) && (col.editable ?? true)) {
                      <input
                        class="letar-field__data-grid-cell-input"
                        [value]="row.data[col.name]"
                        (blur)="commitCell(ctrl, row.rowIndex, col.name, $event); setEditing(null)"
                        (keydown.enter)="commitCell(ctrl, row.rowIndex, col.name, $event); setEditing(null)"
                      />
                    } @else {
                      <span
                        class="letar-field__data-grid-cell"
                        (click)="(col.editable ?? true) && setEditing(row.rowIndex, col.name)"
                      >{{ row.data[col.name] }}</span>
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
        <div class="letar-field__data-grid-footer">
          <div class="letar-field__data-grid-pagination">
            <button type="button" [disabled]="pageIndex() === 0" (click)="prevPage()">←</button>
            <span>{{ pageIndex() + 1 }} / {{ pageCount() }}</span>
            <button type="button" [disabled]="pageIndex() >= pageCount() - 1" (click)="nextPage()">→</button>
          </div>
          <button type="button" class="letar-field__data-grid-export" (click)="exportCsv()">Экспорт CSV</button>
        </div>
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
export class FieldDataGridComponent extends FieldBase {
  @Input({ required: true })
  columns: DataGridColumnDef[] = []
  @Input()
  pageSize = 20
  @Input()
  rowSelection = false
  @Input()
  onRowSave?: (row: GridRow, index: number) => void
  @Input()
  helperText?: string
  @Input()
  disabled = false

  protected readonly rows = signal<GridRow[]>([])
  protected readonly sorting = signal<SortingState>([])
  protected readonly columnFilters = signal<ColumnFiltersState>([])
  protected readonly rowSelectionState = signal<RowSelectionState>({})
  protected readonly pagination = signal<PaginationState>({ pageIndex: 0, pageSize: 20 })
  private editingCell: { row: number; col: string } | null = null

  protected readonly resolvedColumns = computed<DataGridColumnDef[]>(() => this.columns)

  private readonly tableColumns = computed<ColumnDef<GridRow>[]>(() =>
    this.resolvedColumns().map((col) => ({
      id: col.name,
      accessorKey: col.name,
      header: col.label ?? camelToTitle(col.name),
      filterFn: 'includesString',
    }))
  )

  protected readonly table = computed<Table<GridRow>>(() =>
    createTable<GridRow>({
      data: this.rows(),
      columns: this.tableColumns(),
      state: {
        sorting: this.sorting(),
        columnFilters: this.columnFilters(),
        rowSelection: this.rowSelectionState(),
        pagination: this.pagination(),
      },
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- состояние держат наши сигналы (on*Change ниже), table-core требует это поле в TableOptionsResolved
      onStateChange: () => {},
      renderFallbackValue: null,
      onSortingChange: (updater) => {
        this.sorting.set(typeof updater === 'function' ? updater(this.sorting()) : updater)
      },
      onColumnFiltersChange: (updater) => {
        this.columnFilters.set(typeof updater === 'function' ? updater(this.columnFilters()) : updater)
      },
      onRowSelectionChange: (updater) => {
        this.rowSelectionState.set(typeof updater === 'function' ? updater(this.rowSelectionState()) : updater)
      },
      onPaginationChange: (updater) => {
        this.pagination.set(typeof updater === 'function' ? updater(this.pagination()) : updater)
      },
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      enableRowSelection: this.rowSelection,
    })
  )

  /** Строки текущей страницы с исходным индексом (для записи ячейки/selection обратно в `rows()`). */
  protected readonly pageRows = computed(() =>
    this.table().getRowModel().rows.map((row) => ({
      rowIndex: Number(row.id),
      data: row.original,
    }))
  )

  protected readonly pageCount = computed(() => Math.max(1, this.table().getPageCount()))
  protected readonly pageIndex = computed(() => this.pagination().pageIndex)
  protected readonly selectedCount = computed(() => Object.keys(this.rowSelectionState()).length)

  constructor() {
    super()
    this.pagination.set({ pageIndex: 0, pageSize: this.pageSize })
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => this.rows.set((ctrl.value as GridRow[] | undefined) ?? [])
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  protected hasAnyFilter(): boolean {
    return this.resolvedColumns().some((c) => c.filter)
  }

  protected filterValue(colName: string): string {
    const entry = this.columnFilters().find((f) => f.id === colName)
    return typeof entry?.value === 'string' ? entry.value : ''
  }

  protected setFilter(colName: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value
    const next = this.columnFilters().filter((f) => f.id !== colName)
    if (value) {
      next.push({ id: colName, value })
    }
    this.columnFilters.set(next)
    this.pagination.set({ ...this.pagination(), pageIndex: 0 })
  }

  protected toggleSort(colName: string): void {
    const current = this.sorting().find((s) => s.id === colName)
    if (!current) {
      this.sorting.set([{ id: colName, desc: false }])
    } else if (!current.desc) {
      this.sorting.set([{ id: colName, desc: true }])
    } else {
      this.sorting.set([])
    }
  }

  protected sortDirection(colName: string): 'asc' | 'desc' | undefined {
    const entry = this.sorting().find((s) => s.id === colName)
    return entry ? (entry.desc ? 'desc' : 'asc') : undefined
  }

  protected isSelected(rowIndex: number): boolean {
    return Boolean(this.rowSelectionState()[String(rowIndex)])
  }

  protected allSelected(): boolean {
    const rows = this.rows()
    return rows.length > 0 && this.selectedCount() === rows.length
  }

  protected toggleSelectAll(): void {
    if (this.allSelected()) {
      this.rowSelectionState.set({})
      return
    }
    const next: RowSelectionState = {}
    for (let i = 0; i < this.rows().length; i++) {
      next[String(i)] = true
    }
    this.rowSelectionState.set(next)
  }

  protected toggleRowSelection(rowIndex: number): void {
    const next = { ...this.rowSelectionState() }
    if (next[String(rowIndex)]) {
      delete next[String(rowIndex)]
    } else {
      next[String(rowIndex)] = true
    }
    this.rowSelectionState.set(next)
  }

  protected deleteSelected(ctrl: { setValue: (v: GridRow[]) => void; markAsTouched: () => void }): void {
    const selectedIndices = Object.keys(this.rowSelectionState()).map(Number)
    const next = this.rows().filter((_, i) => !selectedIndices.includes(i))
    ctrl.setValue(next)
    ctrl.markAsTouched()
    this.rowSelectionState.set({})
  }

  protected isEditing(rowIndex: number, colName: string): boolean {
    return this.editingCell?.row === rowIndex && this.editingCell?.col === colName
  }

  protected setEditing(rowIndex: number | null, colName?: string): void {
    this.editingCell = rowIndex === null || colName === undefined ? null : { row: rowIndex, col: colName }
  }

  protected commitCell(
    ctrl: { setValue: (v: GridRow[]) => void; markAsTouched: () => void },
    rowIndex: number,
    colName: string,
    event: Event,
  ): void {
    const raw = (event.target as HTMLInputElement).value
    const current = this.rows()[rowIndex]
    const originalValue = current?.[colName]
    const value = typeof originalValue === 'number' ? Number(raw) : raw
    const nextRow = { ...current, [colName]: value }
    const next = this.rows().map((row, i) => (i === rowIndex ? nextRow : row))
    ctrl.setValue(next)
    ctrl.markAsTouched()
    this.onRowSave?.(nextRow, rowIndex)
  }

  protected prevPage(): void {
    this.pagination.set({ ...this.pagination(), pageIndex: Math.max(0, this.pageIndex() - 1) })
  }

  protected nextPage(): void {
    this.pagination.set({ ...this.pagination(), pageIndex: Math.min(this.pageCount() - 1, this.pageIndex() + 1) })
  }

  protected exportCsv(): void {
    exportCsv(this.rows(), this.resolvedColumns(), this.name)
  }
}
