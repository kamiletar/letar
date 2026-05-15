/**
 * @file school-service.ts
 * @description Бизнес-логика автошкол
 * @version 0.18.0
 *
 * Функции:
 * - Создание и управление школой (createSchool, updateSchool, getSchoolById, getUserSchools, getSchoolMembers)
 * - Приглашения в школу (createSchoolInvitation, acceptSchoolInvitation, declineSchoolInvitation, cancelSchoolInvitation)
 * - Управление членами (removeMemberFromSchool, updateMemberRole)
 * - Проверка прав (isSchoolAdmin, isSchoolMember, getSchoolRole)
 */

// ============================================================================
// Типы
// ============================================================================

/**
 * Тип роли члена организации (строковые роли Better Auth)
 * - owner: Владелец школы (бывший ADMIN)
 * - super_manager: Супер-менеджер
 * - manager: Менеджер
 * - instructor: Инструктор практики
 * - theory_instructor: Преподаватель теории
 * - member: Ученик (бывший STUDENT)
 */
export type MemberRole = 'owner' | 'super_manager' | 'manager' | 'instructor' | 'theory_instructor' | 'member'

/**
 * Статус приглашения
 */
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'canceled'

export interface SchoolData {
  id: string
  name: string
  logo: string | null
  description: string | null
  address: string | null
  phone: string | null
  email: string | null
  createdAt: Date
  updatedAt: Date
}

export interface SchoolMembershipData {
  id: string
  organizationId: string
  userId: string
  role: MemberRole
  createdAt: Date
}

export interface SchoolInvitationData {
  id: string
  token: string | null // Better Auth использует id как токен
  organizationId: string
  email: string | null
  role: MemberRole
  status: InvitationStatus
  inviterId: string
  expiresAt: Date
  createdAt: Date
}

// ============================================================================
// Репозиторий (интерфейс для абстракции БД)
// ============================================================================

export interface SchoolRepository {
  // Школы (Organizations)
  createSchool(data: {
    name: string
    logo?: string | null
    description?: string | null
    address?: string | null
    phone?: string | null
    email?: string | null
  }): Promise<SchoolData>
  updateSchool(organizationId: string, data: Partial<SchoolData>): Promise<SchoolData>
  getSchoolById(organizationId: string): Promise<SchoolData | null>
  getSchoolsByUserId(userId: string): Promise<SchoolData[]>

  // Членство (Members)
  getSchoolMembers(organizationId: string, role?: MemberRole): Promise<SchoolMembershipData[]>
  getMembership(organizationId: string, userId: string): Promise<SchoolMembershipData | null>
  createMembership(data: { organizationId: string; userId: string; role: MemberRole }): Promise<SchoolMembershipData>
  deleteMembership(membershipId: string): Promise<boolean>
  updateMembershipRole(membershipId: string, role: MemberRole): Promise<SchoolMembershipData>
  countOwners(organizationId: string): Promise<number>

  // Приглашения (Invitations)
  createInvitation(data: {
    organizationId: string
    email?: string | null
    role: MemberRole
    inviterId: string
    expiresAt: Date
  }): Promise<SchoolInvitationData>
  getInvitationById(invitationId: string): Promise<SchoolInvitationData | null>
  updateInvitation(invitationId: string, data: Partial<SchoolInvitationData>): Promise<SchoolInvitationData>
  deleteExpiredInvitations(organizationId: string): Promise<number>
}

// ============================================================================
// Результаты операций
// ============================================================================

type CreateSchoolError = 'EMPTY_NAME'
type UpdateSchoolError = 'SCHOOL_NOT_FOUND' | 'NOT_ADMIN'
type GetSchoolError = 'SCHOOL_NOT_FOUND'
type InvitationError =
  | 'NOT_ADMIN'
  | 'NOT_ADMIN_OR_MANAGER'
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_EXPIRED'
  | 'ALREADY_MEMBER'
  | 'ALREADY_PROCESSED'
  | 'CANNOT_INVITE_MANAGER'
type MemberError =
  | 'NOT_ADMIN'
  | 'NOT_ADMIN_OR_MANAGER'
  | 'MEMBER_NOT_FOUND'
  | 'CANNOT_REMOVE_SELF'
  | 'LAST_ADMIN'
  | 'CANNOT_INVITE_MANAGER'
  | 'CANNOT_REMOVE_MANAGER'
  | 'CANNOT_CHANGE_MANAGER_ROLE'

export interface CreateSchoolResult {
  success: boolean
  school?: SchoolData
  error?: CreateSchoolError
}

export interface UpdateSchoolResult {
  success: boolean
  school?: SchoolData
  error?: UpdateSchoolError
}

export interface GetSchoolResult {
  success: boolean
  school?: SchoolData
  error?: GetSchoolError
}

export interface GetSchoolsResult {
  success: boolean
  schools: SchoolData[]
}

export interface GetMembersResult {
  success: boolean
  members: SchoolMembershipData[]
}

export interface InvitationResult {
  success: boolean
  invitation?: SchoolInvitationData
  error?: InvitationError
}

export interface AcceptInvitationResult {
  success: boolean
  membership?: SchoolMembershipData
  error?: InvitationError
}

export interface MemberOperationResult {
  success: boolean
  error?: MemberError
}

// ============================================================================
// Создание и управление школой
// ============================================================================

/**
 * Создаёт новую автошколу
 * Создатель автоматически становится владельцем (owner)
 */
export async function createSchool(params: {
  repo: SchoolRepository
  name: string
  creatorId: string
  logo?: string | null
  description?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
}): Promise<CreateSchoolResult> {
  const { repo, name, creatorId, ...rest } = params

  // Валидация названия
  if (!name || name.trim() === '') {
    return { success: false, error: 'EMPTY_NAME' }
  }

  // Создаём школу
  const school = await repo.createSchool({ name: name.trim(), ...rest })

  // Добавляем создателя как владельца
  await repo.createMembership({
    organizationId: school.id,
    userId: creatorId,
    role: 'owner',
  })

  return { success: true, school }
}

/**
 * Обновляет профиль автошколы
 * Только владелец (owner) может обновлять
 */
export async function updateSchool(params: {
  repo: SchoolRepository
  organizationId: string
  userId: string
  data: Partial<Omit<SchoolData, 'id' | 'createdAt' | 'updatedAt'>>
}): Promise<UpdateSchoolResult> {
  const { repo, organizationId, userId, data } = params

  // Проверяем существование школы
  const school = await repo.getSchoolById(organizationId)
  if (!school) {
    return { success: false, error: 'SCHOOL_NOT_FOUND' }
  }

  // Проверяем права
  const membership = await repo.getMembership(organizationId, userId)
  if (!membership || membership.role !== 'owner') {
    return { success: false, error: 'NOT_ADMIN' }
  }

  // Обновляем
  const updatedSchool = await repo.updateSchool(organizationId, data)
  return { success: true, school: updatedSchool }
}

/**
 * Получает школу по ID
 */
export async function getSchoolById(params: {
  repo: SchoolRepository
  organizationId: string
}): Promise<GetSchoolResult> {
  const { repo, organizationId } = params

  const school = await repo.getSchoolById(organizationId)
  if (!school) {
    return { success: false, error: 'SCHOOL_NOT_FOUND' }
  }

  return { success: true, school }
}

/**
 * Получает все школы пользователя
 */
export async function getUserSchools(params: { repo: SchoolRepository; userId: string }): Promise<GetSchoolsResult> {
  const { repo, userId } = params

  const schools = await repo.getSchoolsByUserId(userId)
  return { success: true, schools }
}

/**
 * Получает всех членов школы
 * Опционально фильтрует по роли
 */
export async function getSchoolMembers(params: {
  repo: SchoolRepository
  organizationId: string
  role?: MemberRole
}): Promise<GetMembersResult> {
  const { repo, organizationId, role } = params

  const members = await repo.getSchoolMembers(organizationId, role)
  return { success: true, members }
}

// ============================================================================
// Приглашения в школу
// ============================================================================

/**
 * Создаёт приглашение в школу
 * Owner и manager могут приглашать (manager не может приглашать managers и выше)
 */
export async function createSchoolInvitation(params: {
  repo: SchoolRepository
  organizationId: string
  inviterId: string
  role: MemberRole
  email?: string | null
}): Promise<InvitationResult> {
  const { repo, organizationId, inviterId, role, email } = params

  // Проверяем права (owner, super_manager или manager)
  const membership = await repo.getMembership(organizationId, inviterId)
  const managerRoles: MemberRole[] = ['owner', 'super_manager', 'manager']
  if (!membership || !managerRoles.includes(membership.role)) {
    return { success: false, error: 'NOT_ADMIN_OR_MANAGER' }
  }

  // Manager не может приглашать менеджеров и выше
  if (membership.role === 'manager' && ['owner', 'super_manager', 'manager'].includes(role)) {
    return { success: false, error: 'CANNOT_INVITE_MANAGER' }
  }

  // Срок действия +7 дней
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  // Создаём приглашение
  const invitation = await repo.createInvitation({
    organizationId,
    email: email || null,
    role,
    inviterId,
    expiresAt,
  })

  return { success: true, invitation }
}

/**
 * Принимает приглашение в школу по ID
 */
export async function acceptSchoolInvitation(params: {
  repo: SchoolRepository
  invitationId: string
  userId: string
}): Promise<AcceptInvitationResult> {
  const { repo, invitationId, userId } = params

  // Находим приглашение
  const invitation = await repo.getInvitationById(invitationId)
  if (!invitation) {
    return { success: false, error: 'INVITATION_NOT_FOUND' }
  }

  // Проверяем срок действия
  if (invitation.expiresAt < new Date()) {
    return { success: false, error: 'INVITATION_EXPIRED' }
  }

  // Проверяем статус
  if (invitation.status !== 'pending') {
    return { success: false, error: 'ALREADY_PROCESSED' }
  }

  // Проверяем, не член ли уже
  const existingMembership = await repo.getMembership(invitation.organizationId, userId)
  if (existingMembership) {
    return { success: false, error: 'ALREADY_MEMBER' }
  }

  // Создаём членство
  const membership = await repo.createMembership({
    organizationId: invitation.organizationId,
    userId,
    role: invitation.role,
  })

  // Обновляем приглашение
  await repo.updateInvitation(invitation.id, {
    status: 'accepted',
  })

  return { success: true, membership }
}

/**
 * Отклоняет приглашение в школу
 */
export async function declineSchoolInvitation(params: {
  repo: SchoolRepository
  invitationId: string
}): Promise<InvitationResult> {
  const { repo, invitationId } = params

  // Находим приглашение
  const invitation = await repo.getInvitationById(invitationId)
  if (!invitation) {
    return { success: false, error: 'INVITATION_NOT_FOUND' }
  }

  // Обновляем статус
  const updated = await repo.updateInvitation(invitation.id, {
    status: 'rejected',
  })

  return { success: true, invitation: updated }
}

/**
 * Отменяет приглашение (owner, super_manager или manager)
 */
export async function cancelSchoolInvitation(params: {
  repo: SchoolRepository
  invitationId: string
  userId: string
}): Promise<InvitationResult> {
  const { repo, invitationId, userId } = params

  // Находим приглашение
  const invitation = await repo.getInvitationById(invitationId)
  if (!invitation) {
    return { success: false, error: 'INVITATION_NOT_FOUND' }
  }

  // Проверяем права (owner, super_manager или manager)
  const membership = await repo.getMembership(invitation.organizationId, userId)
  const managerRoles: MemberRole[] = ['owner', 'super_manager', 'manager']
  if (!membership || !managerRoles.includes(membership.role)) {
    return { success: false, error: 'NOT_ADMIN_OR_MANAGER' }
  }

  // Обновляем статус
  const updated = await repo.updateInvitation(invitationId, {
    status: 'canceled',
  })

  return { success: true, invitation: updated }
}

// ============================================================================
// Управление членами
// ============================================================================

/**
 * Удаляет члена из школы
 * Нельзя удалить себя или последнего владельца
 * Manager не может удалять managers и выше
 */
export async function removeMemberFromSchool(params: {
  repo: SchoolRepository
  organizationId: string
  userId: string
  targetUserId: string
}): Promise<MemberOperationResult> {
  const { repo, organizationId, userId, targetUserId } = params

  // Проверяем права (owner, super_manager или manager)
  const membership = await repo.getMembership(organizationId, userId)
  const managerRoles: MemberRole[] = ['owner', 'super_manager', 'manager']
  if (!membership || !managerRoles.includes(membership.role)) {
    return { success: false, error: 'NOT_ADMIN_OR_MANAGER' }
  }

  // Нельзя удалить себя
  if (userId === targetUserId) {
    return { success: false, error: 'CANNOT_REMOVE_SELF' }
  }

  // Находим целевого пользователя
  const targetMembership = await repo.getMembership(organizationId, targetUserId)
  if (!targetMembership) {
    return { success: false, error: 'MEMBER_NOT_FOUND' }
  }

  // Manager не может удалять managers и выше
  if (membership.role === 'manager' && ['owner', 'super_manager', 'manager'].includes(targetMembership.role)) {
    return { success: false, error: 'CANNOT_REMOVE_MANAGER' }
  }

  // Проверяем, не последний ли это владелец
  if (targetMembership.role === 'owner') {
    const ownerCount = await repo.countOwners(organizationId)
    if (ownerCount <= 1) {
      return { success: false, error: 'LAST_ADMIN' }
    }
  }

  // Удаляем
  await repo.deleteMembership(targetMembership.id)

  return { success: true }
}

/**
 * Изменяет роль члена школы
 * Нельзя понизить последнего владельца
 * Manager не может назначать/снимать managers и выше
 */
export async function updateMemberRole(params: {
  repo: SchoolRepository
  organizationId: string
  userId: string
  targetUserId: string
  newRole: MemberRole
}): Promise<MemberOperationResult> {
  const { repo, organizationId, userId, targetUserId, newRole } = params

  // Проверяем права (owner, super_manager или manager)
  const membership = await repo.getMembership(organizationId, userId)
  const managerRoles: MemberRole[] = ['owner', 'super_manager', 'manager']
  if (!membership || !managerRoles.includes(membership.role)) {
    return { success: false, error: 'NOT_ADMIN_OR_MANAGER' }
  }

  // Находим целевого пользователя
  const targetMembership = await repo.getMembership(organizationId, targetUserId)
  if (!targetMembership) {
    return { success: false, error: 'MEMBER_NOT_FOUND' }
  }

  // Manager не может:
  // 1. Менять роль managers и выше
  // 2. Назначать роль manager и выше
  if (membership.role === 'manager') {
    if (['owner', 'super_manager', 'manager'].includes(targetMembership.role)) {
      return { success: false, error: 'CANNOT_CHANGE_MANAGER_ROLE' }
    }
    if (['owner', 'super_manager', 'manager'].includes(newRole)) {
      return { success: false, error: 'CANNOT_CHANGE_MANAGER_ROLE' }
    }
  }

  // Если понижаем владельца, проверяем что не последний
  if (targetMembership.role === 'owner' && newRole !== 'owner') {
    const ownerCount = await repo.countOwners(organizationId)
    if (ownerCount <= 1) {
      return { success: false, error: 'LAST_ADMIN' }
    }
  }

  // Обновляем роль
  await repo.updateMembershipRole(targetMembership.id, newRole)

  return { success: true }
}

// ============================================================================
// Проверка прав
// ============================================================================

/**
 * Проверяет, является ли пользователь владельцем школы
 */
export async function isSchoolAdmin(params: {
  repo: SchoolRepository
  organizationId: string
  userId: string
}): Promise<boolean> {
  const { repo, organizationId, userId } = params

  const membership = await repo.getMembership(organizationId, userId)
  return membership?.role === 'owner'
}

/**
 * Проверяет, является ли пользователь владельцем или менеджером школы
 */
export async function isSchoolAdminOrManager(params: {
  repo: SchoolRepository
  organizationId: string
  userId: string
}): Promise<boolean> {
  const { repo, organizationId, userId } = params

  const membership = await repo.getMembership(organizationId, userId)
  return ['owner', 'super_manager', 'manager'].includes(membership?.role ?? '')
}

/**
 * Проверяет, является ли пользователь членом школы
 */
export async function isSchoolMember(params: {
  repo: SchoolRepository
  organizationId: string
  userId: string
}): Promise<boolean> {
  const { repo, organizationId, userId } = params

  const membership = await repo.getMembership(organizationId, userId)
  return membership !== null
}

/**
 * Получает роль пользователя в школе
 */
export async function getSchoolRole(params: {
  repo: SchoolRepository
  organizationId: string
  userId: string
}): Promise<MemberRole | null> {
  const { repo, organizationId, userId } = params

  const membership = await repo.getMembership(organizationId, userId)
  return membership?.role ?? null
}
