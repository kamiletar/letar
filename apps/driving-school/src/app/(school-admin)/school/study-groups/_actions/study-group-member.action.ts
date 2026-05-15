/**
 * Server Actions для работы с участниками учебных групп
 *
 * @module study-group-member
 *
 * Структура модуля:
 * - study-group-member.types.ts — типы данных (можно импортировать везде)
 * - study-group-member-queries.action.ts — получение данных (серверные)
 * - study-group-member-mutations.action.ts — добавление/удаление участников (серверные)
 * - study-group-member-utils.ts — вспомогательные функции (серверные)
 *
 * ВАЖНО: Этот файл НЕ содержит 'use server', так как он только делает re-export.
 * Директива 'use server' находится в каждом отдельном файле с реализацией.
 *
 * @example
 * ```ts
 * // В Client Component — только типы
 * import type { GroupMemberDetails } from '../_actions/study-group-member.types'
 *
 * // В Server Component или Server Action — функции
 * import { getGroupMembersAction } from '../_actions/study-group-member.action'
 * ```
 */

// === Queries (получение данных) ===
export { getAvailableStudentsAction, getGroupMembersAction } from './study-group-member-queries.action'

// === Mutations (изменение данных) ===
export {
  addMemberToGroupAction,
  bulkAddMembersAction,
  removeMemberFromGroupAction,
  restoreMemberAction,
} from './study-group-member-mutations.action'

// === Utils (вспомогательные функции) ===
export { canManageGroup } from './study-group-member-utils'
