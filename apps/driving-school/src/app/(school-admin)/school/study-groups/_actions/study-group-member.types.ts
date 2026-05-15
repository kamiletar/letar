/**
 * Типы для работы с участниками учебных групп
 */

/**
 * Доступный студент для добавления в группу
 */
export interface AvailableStudent {
  id: string
  name: string
  image: string | null
  email: string
}

/**
 * Детальная информация об участнике группы
 */
export interface GroupMemberDetails {
  id: string
  userId: string
  userName: string
  userImage: string | null
  userEmail: string
  enrolledAt: Date
  leftAt: Date | null
  attendanceStats: {
    total: number
    attended: number
    rate: number | null
  }
}

// === Коды ошибок ===

export type MemberQueryError = 'UNAUTHORIZED' | 'NOT_SCHOOL_ADMIN' | 'GROUP_NOT_FOUND' | 'UNKNOWN_ERROR'

export type AddMemberError =
  | 'UNAUTHORIZED'
  | 'NOT_SCHOOL_ADMIN'
  | 'GROUP_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'ALREADY_MEMBER'
  | 'GROUP_FULL'
  | 'NOT_SCHOOL_STUDENT'
  | 'UNKNOWN_ERROR'

export type RemoveMemberError = 'UNAUTHORIZED' | 'NOT_SCHOOL_ADMIN' | 'MEMBER_NOT_FOUND' | 'UNKNOWN_ERROR'

// === Результаты операций ===

export type GetAvailableStudentsResult =
  | { success: true; students: AvailableStudent[] }
  | { success: false; error: MemberQueryError }

export type GetGroupMembersResult =
  | { success: true; members: GroupMemberDetails[] }
  | { success: false; error: MemberQueryError }

export type AddMemberResult =
  | { success: true; memberId: string }
  | { success: false; error: AddMemberError; message?: string }

export type BulkAddMembersResult =
  | { success: true; addedCount: number; skippedCount: number }
  | { success: false; error: MemberQueryError; message?: string }

export type RemoveMemberResult = { success: true } | { success: false; error: RemoveMemberError }
