import { useField } from '@tanstack/vue-form'
import {
  type ColumnDef,
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useVueTable,
} from '@tanstack/vue-table'
import { computed, type ComputedRef, type Ref, ref } from 'vue'

/** Строка `Form.Field.DataGrid` — запись массива без строгой типизации колонок (beta-упрощение). */
export type DataGridRow = Record<string, unknown>

export interface UseDataGridFieldOptions {
  /** Инстанс формы `@tanstack/vue-form` (`AppFormContext.form`) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Form API `@tanstack/vue-form`
  form: any
  /** Полный путь array-поля (с учётом вложенности `FormGroup`, если есть) */
  fullPath: string
}

export interface UseDataGridFieldResult {
  /** Реактивные строки массива (`useField({ mode: 'array' })`, тот же API, что у `FieldTableEditor`) */
  rows: ComputedRef<DataGridRow[]>
  /** Удаляет строки по индексам (сортирует по убыванию сама — вызывающему думать об этом не нужно) */
  removeRows: (indices: number[]) => void
  /** Записывает значение одной ячейки в форму (`${fullPath}[i].col`) */
  setCellValue: (rowIndex: number, colName: string, value: unknown) => void
}

/**
 * Обёртка над `useField({ mode: 'array' })` (`@tanstack/vue-form`) для `Form.Field.DataGrid`.
 *
 * ⚠️ Вызывается напрямую в `setup()` компонента поля, НЕ через слот `form.Field` (в отличие от
 * `FieldTableEditor`) — `useDataGridTable` ниже сама вызывает `useVueTable`, композабл с
 * собственными `ref`/`watchEffect`. Composable-и Vue обязаны запускаться один раз при монтировании
 * компонента; вызов внутри render-prop слота (который переисполняется на каждый ре-рендер)
 * пересоздавал бы внутренний `table`-инстанс и сбрасывал сортировку/пагинацию/фильтры при каждом
 * изменении несвязанного состояния. `useField` (сама библиотека) тоже вызывает `onMounted`/`watch`
 * внутри себя — тот же аргумент.
 *
 * В отличие от `FieldTableEditor` (`add`/`move` строк, TSV-paste) — DataGrid только
 * просматривает и точечно редактирует уже существующий массив: `pushValue`/`moveValue` не нужны,
 * только `removeValue` для bulk-delete выбранных строк.
 */
export function useDataGridField(options: UseDataGridFieldOptions): UseDataGridFieldResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Form array-field API
  const fieldResult = useField({ form: options.form, name: options.fullPath, mode: 'array' }) as any

  // ⚠️ Находка: `useField({ mode: 'array' })` (общий `@tanstack/form-core`, тот же контракт, что
  // и у React `useField`) перевычисляет свой реактивный `state` только по `meta._arrayVersion` —
  // счётчику, который бампается на структурных мутациях (`pushValue`/`removeValue`/`moveValue`),
  // но НЕ на точечной записи вложенного скаляра через `form.setFieldValue('items[i].col', v)`.
  // В React это незаметно: `setEditingCell(null)` (соседний `useState`) форсирует ре-рендер ВСЕГО
  // компонента, и `arrayField.state.value` читается заново при каждом ре-рендере независимо от
  // причины — там это просто проперти без мемоизации. В Vue `computed()` кеширует результат по
  // ГРАФУ зависимостей: несвязанный `ref` (`editingCell.value = null`) не инвалидирует чужой
  // `computed`, сколько бы раз ни перезапускался внешний `render()` — а `fieldResult.state`
  // (обёртка над внутренним `computed` `useField`) остаётся закешированным на старом значении,
  // пока не сработает именно его собственная зависимость (`_arrayVersion`). Без этого счётчика
  // `rows` после инлайн-редактирования ячейки показывал бы старое значение до следующей
  // структурной мутации массива — тот же баг НЕ воспроизводится в React-версии именно по этой
  // причине (framework-специфичная модель ре-рендера, не архитектурная ошибка порта).
  const editVersion = ref(0)

  const rows = computed(() => {
    // Зависимость на структурные изменения (push/remove/move) — держит `rows` актуальным без
    // отдельного форсирования при bulk-delete через `removeRows`.
    void fieldResult.state.value
    // Зависимость на точечные правки ячеек — бампается в `setCellValue` ниже.
    void editVersion.value
    return (options.form.getFieldValue(options.fullPath) as DataGridRow[] | undefined) ?? []
  })

  return {
    rows,
    removeRows: (indices) => {
      // Удаляем начиная с наибольшего индекса — иначе после первого `removeValue` индексы
      // оставшихся выбранных строк съезжают на -1 и попадают не туда.
      for (const idx of [...indices].sort((a, b) => b - a)) {
        fieldResult.api.removeValue(idx)
      }
    },
    setCellValue: (rowIndex, colName, value) => {
      options.form.setFieldValue(`${options.fullPath}[${rowIndex}].${colName}`, value)
      editVersion.value++
    },
  }
}

export interface UseDataGridTableOptions {
  /** Реактивные строки (см. `useDataGridField().rows`) */
  data: ComputedRef<DataGridRow[]>
  /** Полностью собранные колонки TanStack Table — заголовки/ячейки строит вызывающий UI-кит
   * (headless — нативные элементы, Reka-скин — `rekaUIKit`), сюда приходит готовый массив,
   * тот же принцип разделения, что у `FieldTableEditor` (`resolveTableColumns` в core, разметка
   * строк/ячеек — в каждом скине отдельно). */
  columns: ComputedRef<ColumnDef<DataGridRow>[]>
  /** Строк на страницу */
  pageSize: number
  /** Включает row-selection (чекбоксы) */
  enableRowSelection: boolean
}

export interface UseDataGridTableResult {
  /** Инстанс `@tanstack/vue-table` (`Table<DataGridRow>`) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `@tanstack/vue-table` `Table<TData>`
  table: any
  /** Текущий выбор строк (для bulk-delete снаружи композабла) */
  rowSelectionState: Ref<RowSelectionState>
}

/**
 * Обёртка над `useVueTable` (`@tanstack/vue-table` — официальный Vue-адаптер того же
 * `@tanstack/table-core`, что под React `useReactTable`) — сортировка, текстовый фильтр
 * по колонке, пагинация, row-selection. Разобрана и портирована из
 * `libs/forms-shadcn/src/lib/fields/field-data-grid-impl.tsx`.
 *
 * ⚠️ **Находка про API `@tanstack/vue-table` (отличие от React `useReactTable`):**
 * `TableOptionsWithReactiveData['data']` формально типизирован как `MaybeRef<TData[]>`, и это
 * единственное поле, для которого реактивность документирована типами — `useVueTable` сам
 * оборачивает `data`, если это `Ref`/`ComputedRef` (`isRef(initialOptions.data)`). Но `columns` и
 * `state` таким контрактом не покрыты — по факту `useVueTable` перечитывает **весь** объект
 * опций внутри собственного `watchEffect` на каждое изменение состояния таблицы (сортировка,
 * фильтр, страница), и это чтение отслеживает реактивные зависимости, только если они видны
 * *в момент самого чтения* — то есть через property-геттеры (`get columns() { return
 * columnsRef.value }`), а не через значение, разыменованное заранее при вызове `useVueTable`.
 * Официальные примеры `@tanstack/vue-table` используют именно геттеры для `data`/`columns`/
 * `state.*` — тот же паттерн применён здесь для `state.sorting`/`columnFilters`/`rowSelection`.
 *
 * Второе отличие от React: `onSortingChange`/`onColumnFiltersChange`/`onRowSelectionChange`
 * получают `updater: T | ((old: T) => T)` и не обновляют state сами (в отличие от React, где
 * `useReactTable` под капотом дергает переданный `useState`-сеттер и разворачивает функцию-апдейтер
 * автоматически) — разворачивать `typeof updater === 'function'` нужно вручную в каждом обработчике.
 */
export function useDataGridTable(options: UseDataGridTableOptions): UseDataGridTableResult {
  const sorting = ref<SortingState>([])
  const columnFilters = ref<ColumnFiltersState>([])
  const rowSelectionState = ref<RowSelectionState>({})

  const table = useVueTable<DataGridRow>({
    get data() {
      return options.data.value
    },
    get columns() {
      return options.columns.value
    },
    state: {
      get sorting() {
        return sorting.value
      },
      get columnFilters() {
        return columnFilters.value
      },
      get rowSelection() {
        return rowSelectionState.value
      },
    },
    onSortingChange: (updater) => {
      sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
    },
    onColumnFiltersChange: (updater) => {
      columnFilters.value = typeof updater === 'function' ? updater(columnFilters.value) : updater
    },
    onRowSelectionChange: (updater) => {
      rowSelectionState.value = typeof updater === 'function' ? updater(rowSelectionState.value) : updater
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: options.pageSize } },
    enableRowSelection: options.enableRowSelection,
  })

  return { table, rowSelectionState }
}

/** Приводит `value` к типу поля инлайн-редактирования — идентично React-версии. */
export function inferDataGridFieldType(value: unknown): 'number' | 'string' {
  return typeof value === 'number' ? 'number' : 'string'
}

/**
 * CSV-экспорт (`Blob` + `URL.createObjectURL`, без доп. либы) — чистая функция без UI-кита,
 * идентична обеим Vue-реализациям и React-версии.
 */
export function exportDataGridCsv(
  rows: DataGridRow[],
  columns: Pick<DataGridColumnDefLike, 'name' | 'label'>[],
  filenamePrefix: string,
): void {
  const headers = columns.map((c) => c.label ?? c.name).join(',')
  const csvRows = rows.map((row) =>
    columns.map((c) => {
      const str = String(row[c.name] ?? '')
      return str.includes(',') ? `"${str}"` : str
    }).join(',')
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

/** Минимальный контракт колонки, нужный `exportDataGridCsv` — избегаем циклического импорта типов. */
interface DataGridColumnDefLike {
  name: string
  label?: string
}
