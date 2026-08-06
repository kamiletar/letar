/**
 * Реэкспорт хелперов для Server Actions.
 */

export {
  type AdminAuthResult,
  type AdminContext,
  assertAdminAuth,
  type MutationResult,
  requireAdminAuth,
} from './with-admin-auth'

export { handleUniqueConstraintError } from './error-helpers'

export { type BulkableModel, type BulkActions, createBulkActions } from './bulk-actions-factory'

export { createDeleteAction, type DeletableModel } from './delete-action-factory'

export { type CreatableModel, type CreateActionConfig, createCreateAction } from './create-action-factory'

export { createUpdateAction, type UpdatableModel, type UpdateActionConfig } from './update-action-factory'
