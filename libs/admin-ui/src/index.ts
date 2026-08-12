// Types
export type {
  AdminLayoutConfig,
  AdminNavItem,
  BulkAction,
  ColumnDef,
  FilterOption,
  StatusType,
  TableItem,
} from './types'

// Layout components
export { AdminBreadcrumbs, AdminNav, AdminSidebar, MobileAdminDrawer } from './layout'

// Table components
export {
  BulkActionsBar,
  commonBulkActions,
  DataTable,
  type DataTableProps,
  GenericAdminTable,
  type GenericAdminTableProps,
  TableSkeleton,
} from './table'

// Filter components
export { Pagination, SearchFilter, StatusFilter } from './filters'

// Feedback components
export { createStatusBadge, DeleteConfirmation, EmptyState, StatusBadge } from './feedback'

// Photo components
export { SortablePhotoGrid, type SortablePhotoGridProps, type SortablePhotoItem } from './photo'

// Form fields
export { SeoField, SlugField } from './form-fields'

// Hooks
export { useSelection } from './hooks'

// Utils
export { slugify } from './utils'
