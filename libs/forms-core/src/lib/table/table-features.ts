import {
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFns,
  stockFeatures,
  tableFeatures,
} from '@tanstack/table-core'

/**
 * Набор фич `@tanstack/table-core` v9 для `Form.Field.DataGrid` — общий для React-скина
 * (`@letar/forms`, `@letar/forms-shadcn`, через реэкспорт `@tanstack/react-table`) и headless
 * Angular-слоя (`@letar/forms-angular`, напрямую через `@tanstack/table-core`).
 *
 * `stockFeatures` (все стоковые фичи, как в v8) — сознательный выбор вместо точечного набора:
 * часть методов, которые в v8 считались «core», в v9 распределены по фичам не всегда очевидным
 * образом (пример — `row.getVisibleCells()` висит на `columnVisibilityFeature`, не на core), а
 * `columnResizingFeature` требует `columnSizingFeature` рядом — обе есть в `stockFeatures`. Row
 * model factories и `filterFns` (полный реестр, deprecated но рабочий — колонки полагаются на
 * `'auto'`-резолв по типу значения, без реестра `'auto'` ничего не находит) регистрируются явно.
 *
 * @param overrides дополнительные/переопределяющие фичи — например
 *   `coreReactivityFeature: storeReactivityBindings()`, обязательный для headless
 *   `constructTable` в `@letar/forms-angular` (React/Vue получают реактивность через хуки
 *   обёртки, этот параметр не задают).
 */
export function createDataGridTableFeatures<TOverrides extends Record<string, unknown> = Record<string, never>>(
  overrides?: TOverrides,
) {
  return tableFeatures({
    ...stockFeatures,
    sortedRowModel: createSortedRowModel(),
    filteredRowModel: createFilteredRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
    filterFns,
    ...overrides,
  })
}
