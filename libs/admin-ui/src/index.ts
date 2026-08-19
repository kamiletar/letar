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
  type DataTableFeatures,
  type DataTableProps,
  GenericAdminTable,
  type GenericAdminTableProps,
  InlineEditableTable,
  type InlineEditableTableColumn,
  type InlineEditableTableProps,
  TableSkeleton,
} from './table'

// Filter components
export { Pagination, SearchFilter, StatusFilter } from './filters'

// Feedback components
export { createStatusBadge, DeleteConfirmation, EmptyState, StatusBadge } from './feedback'

// Photo components
export { SinglePhotoUpload, type SinglePhotoUploadProps } from './photo'
export { SortablePhotoGrid, type SortablePhotoGridProps, type SortablePhotoItem } from './photo'

// Form fields
export { SeoField, SlugField } from './form-fields'

// Hooks
export { useInlineCrudList, type UseInlineCrudListOptions, useSelection } from './hooks'

// Jobs (крон-задачи, PLAN-INFRA §75)
export { JobsTable, type JobsTableProps, type JobStatusItem } from './jobs'

// Tree components (древовидные CRUD-списки с drag&drop-перевложением)
export {
  buildFlattenedTree,
  computeMoveResult,
  type FlattenedTreeNode,
  getChildDepth,
  getDepth,
  getDescendantIds,
  getSubtreeHeight,
  type OrderedTreeItem,
  SortableTree,
  type SortableTreeMoveResult,
  type SortableTreeProps,
  type TreeItemLike,
  type TreeMoveErrorCode,
  type TreeMoveResult,
  validateTreeMove,
} from './tree'

// Utils
export { slugify } from './utils'
