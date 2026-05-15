/**
 * Реэкспорт хелперов для Server Actions.
 */

export {
  assertAdminAuth,
  requireAdminAuth,
  type AdminAuthResult,
  type AdminContext,
  type MutationResult,
} from './with-admin-auth'

export { handleUniqueConstraintError } from './error-helpers'

export { createBulkActions, type BulkActions, type BulkableModel } from './bulk-actions-factory'

export { createDeleteAction, type DeletableModel } from './delete-action-factory'

export { createCreateAction, type CreatableModel, type CreateActionConfig } from './create-action-factory'

export { createUpdateAction, type UpdatableModel, type UpdateActionConfig } from './update-action-factory'
