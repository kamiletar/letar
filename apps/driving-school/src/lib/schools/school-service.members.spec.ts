/**
 * @file school-service.members.spec.ts
 * @description Unit-тесты для управления членами школы и проверки прав
 * @version 0.162.0
 *
 * Тестируемые функции:
 * - removeMemberFromSchool — удаление члена из школы
 * - updateMemberRole — изменение роли члена
 * - isSchoolAdmin — проверка, является ли пользователь админом
 * - isSchoolMember — проверка членства в школе
 * - getSchoolRole — получение роли пользователя в школе
 */

import {
  getSchoolRole,
  isSchoolAdmin,
  isSchoolMember,
  removeMemberFromSchool,
  updateMemberRole,
} from './school-service'
import { createMockRepo, mockMembership } from './school-service.mocks'

// ============================================================================
// Тесты: removeMemberFromSchool
// ============================================================================

describe('removeMemberFromSchool', () => {
  it('должен удалить члена из школы', async () => {
    const repo = createMockRepo({
      getMembership: vi
        .fn()
        .mockResolvedValueOnce(mockMembership) // Проверяющий пользователь (админ)
        .mockResolvedValueOnce({ ...mockMembership, id: 'membership-2', userId: 'user-2', role: 'member' }), // Удаляемый пользователь
      deleteMembership: vi.fn().mockResolvedValue(true),
      countOwners: vi.fn().mockResolvedValue(2),
    })

    const result = await removeMemberFromSchool({
      repo,
      schoolId: 'school-1',
      userId: 'user-1',
      targetUserId: 'user-2',
    })

    expect(result.success).toBe(true)
  })

  it('должен вернуть ошибку если не админ или менеджер', async () => {
    const repo = createMockRepo({
      getMembership: vi.fn().mockResolvedValue({ ...mockMembership, role: 'member' }),
    })

    const result = await removeMemberFromSchool({
      repo,
      schoolId: 'school-1',
      userId: 'user-1',
      targetUserId: 'user-2',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ADMIN_OR_MANAGER')
  })

  it('должен вернуть ошибку при удалении себя', async () => {
    const repo = createMockRepo({
      getMembership: vi.fn().mockResolvedValue(mockMembership),
    })

    const result = await removeMemberFromSchool({
      repo,
      schoolId: 'school-1',
      userId: 'user-1',
      targetUserId: 'user-1', // Удаляем себя
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('CANNOT_REMOVE_SELF')
  })

  it('должен вернуть ошибку при удалении последнего админа', async () => {
    const repo = createMockRepo({
      getMembership: vi
        .fn()
        .mockResolvedValueOnce(mockMembership) // Проверяющий пользователь
        .mockResolvedValueOnce({ ...mockMembership, id: 'membership-2', userId: 'user-2' }), // Удаляемый пользователь (тоже owner)
      countOwners: vi.fn().mockResolvedValue(1), // Только 1 owner
    })

    const result = await removeMemberFromSchool({
      repo,
      schoolId: 'school-1',
      userId: 'user-1',
      targetUserId: 'user-2',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('LAST_ADMIN')
  })
})

// ============================================================================
// Тесты: updateMemberRole
// ============================================================================

describe('updateMemberRole', () => {
  it('должен изменить роль члена', async () => {
    const repo = createMockRepo({
      getMembership: vi
        .fn()
        .mockResolvedValueOnce(mockMembership) // Проверяющий пользователь (админ)
        .mockResolvedValueOnce({ ...mockMembership, id: 'membership-2', userId: 'user-2', role: 'member' }), // Целевой пользователь
      updateMembershipRole: vi.fn().mockResolvedValue({ ...mockMembership, role: 'instructor' }),
      countOwners: vi.fn().mockResolvedValue(2),
    })

    const result = await updateMemberRole({
      repo,
      schoolId: 'school-1',
      userId: 'user-1',
      targetUserId: 'user-2',
      newRole: 'instructor',
    })

    expect(result.success).toBe(true)
    expect(repo.updateMembershipRole).toHaveBeenCalledWith('membership-2', 'instructor')
  })

  it('должен вернуть ошибку если не админ или менеджер', async () => {
    const repo = createMockRepo({
      getMembership: vi.fn().mockResolvedValue({ ...mockMembership, role: 'instructor' }),
    })

    const result = await updateMemberRole({
      repo,
      schoolId: 'school-1',
      userId: 'user-1',
      targetUserId: 'user-2',
      newRole: 'owner',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ADMIN_OR_MANAGER')
  })

  it('должен вернуть ошибку при понижении последнего админа', async () => {
    const repo = createMockRepo({
      getMembership: vi
        .fn()
        .mockResolvedValueOnce(mockMembership) // Проверяющий (админ)
        .mockResolvedValueOnce({ ...mockMembership, id: 'membership-2', userId: 'user-2' }), // Целевой (тоже owner)
      countOwners: vi.fn().mockResolvedValue(1),
    })

    const result = await updateMemberRole({
      repo,
      schoolId: 'school-1',
      userId: 'user-1',
      targetUserId: 'user-2',
      newRole: 'member', // Понижение
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('LAST_ADMIN')
  })
})

// ============================================================================
// Тесты: isSchoolAdmin
// ============================================================================

describe('isSchoolAdmin', () => {
  it('должен вернуть true если админ школы', async () => {
    const repo = createMockRepo({
      getMembership: vi.fn().mockResolvedValue(mockMembership),
    })

    const result = await isSchoolAdmin({
      repo,
      organizationId: 'school-1',
      userId: 'user-1',
    })

    expect(result).toBe(true)
  })

  it('должен вернуть false если не админ', async () => {
    const repo = createMockRepo({
      getMembership: vi.fn().mockResolvedValue({ ...mockMembership, role: 'instructor' }),
    })

    const result = await isSchoolAdmin({
      repo,
      organizationId: 'school-1',
      userId: 'user-1',
    })

    expect(result).toBe(false)
  })

  it('должен вернуть false если не член школы', async () => {
    const repo = createMockRepo({
      getMembership: vi.fn().mockResolvedValue(null),
    })

    const result = await isSchoolAdmin({
      repo,
      organizationId: 'school-1',
      userId: 'user-1',
    })

    expect(result).toBe(false)
  })
})

// ============================================================================
// Тесты: isSchoolMember
// ============================================================================

describe('isSchoolMember', () => {
  it('должен вернуть true если член школы', async () => {
    const repo = createMockRepo({
      getMembership: vi.fn().mockResolvedValue(mockMembership),
    })

    const result = await isSchoolMember({
      repo,
      organizationId: 'school-1',
      userId: 'user-1',
    })

    expect(result).toBe(true)
  })

  it('должен вернуть false если не член', async () => {
    const repo = createMockRepo({
      getMembership: vi.fn().mockResolvedValue(null),
    })

    const result = await isSchoolMember({
      repo,
      organizationId: 'school-1',
      userId: 'user-1',
    })

    expect(result).toBe(false)
  })
})

// ============================================================================
// Тесты: getSchoolRole
// ============================================================================

describe('getSchoolRole', () => {
  it('должен вернуть роль пользователя в школе', async () => {
    const repo = createMockRepo({
      getMembership: vi.fn().mockResolvedValue(mockMembership),
    })

    const result = await getSchoolRole({
      repo,
      organizationId: 'school-1',
      userId: 'user-1',
    })

    expect(result).toBe('owner')
  })

  it('должен вернуть null если не член школы', async () => {
    const repo = createMockRepo({
      getMembership: vi.fn().mockResolvedValue(null),
    })

    const result = await getSchoolRole({
      repo,
      organizationId: 'school-1',
      userId: 'user-1',
    })

    expect(result).toBeNull()
  })
})
