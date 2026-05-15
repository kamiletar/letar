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
  GenericAdminTable,
  TableSkeleton,
  commonBulkActions,
  type GenericAdminTableProps,
} from './table'

// Filter components
export { Pagination, SearchFilter, StatusFilter } from './filters'

// Feedback components
export { DeleteConfirmation, EmptyState, StatusBadge, createStatusBadge } from './feedback'

// Form fields
export { SeoField, SlugField } from './form-fields'

// Hooks
export { useSelection } from './hooks'

// Utils
export { slugify } from './utils'
