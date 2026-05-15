/**
 * @file school-service.invitations.spec.ts
 * @description Unit-тесты для приглашений в школу
 * @version 0.162.0
 *
 * Тестируемые функции:
 * - createSchoolInvitation — создание приглашения
 * - acceptSchoolInvitation — принятие приглашения
 * - declineSchoolInvitation — отклонение приглашения
 * - cancelSchoolInvitation — отмена приглашения
 */

import {
  acceptSchoolInvitation,
  cancelSchoolInvitation,
  createSchoolInvitation,
  declineSchoolInvitation,
} from './school-service'
import { createMockRepo, mockInvitation, mockMembership } from './school-service.mocks'

// ============================================================================
// Тесты: createSchoolInvitation
// ============================================================================

describe('createSchoolInvitation', () => {
  it('должен создать приглашение по email', async () => {
    const repo = createMockRepo({
      getMembership: vi.fn().mockResolvedValue(mockMembership),
      createInvitation: vi.fn().mockResolvedValue(mockInvitation),
    })

    const result = await createSchoolInvitation({
      repo,
      organizationId: 'school-1',
      invitedById: 'user-1',
      email: 'new@example.com',
      role: 'instructor',
    })

    expect(result.success).toBe(true)
    expect(result.invitation?.email).toBe('new@example.com')
  })

  it('должен создать ссылку-приглашение без email', async () => {
    const invitationWithoutEmail = { ...mockInvitation, email: null }
    const repo = createMockRepo({
      getMembership: vi.fn().mockResolvedValue(mockMembership),
      createInvitation: vi.fn().mockResolvedValue(invitationWithoutEmail),
    })

    const result = await createSchoolInvitation({
      repo,
      organizationId: 'school-1',
      invitedById: 'user-1',
      role: 'member',
    })

    expect(result.success).toBe(true)
    expect(result.invitation?.email).toBeNull()
  })

  it('должен установить срок действия (7 дней)', async () => {
    const repo = createMockRepo({
      getMembership: vi.fn().mockResolvedValue(mockMembership),
      createInvitation: vi.fn().mockImplementation((data) => Promise.resolve({ ...mockInvitation, ...data })),
    })

    const now = Date.now()
    const result = await createSchoolInvitation({
      repo,
      organizationId: 'school-1',
      invitedById: 'user-1',
      role: 'instructor',
    })

    expect(result.success).toBe(true)
    const expiresAt = vi.mocked(repo.createInvitation).mock.calls[0][0].expiresAt as Date
    const diff = expiresAt.getTime() - now
    // Должно быть ~7 дней (с погрешностью в 1 минуту)
    expect(diff).toBeGreaterThan(6.99 * 24 * 60 * 60 * 1000)
    expect(diff).toBeLessThan(7.01 * 24 * 60 * 60 * 1000)
  })

  it('должен вернуть ошибку если не админ или менеджер', async () => {
    const repo = createMockRepo({
      getMembership: vi.fn().mockResolvedValue({ ...mockMembership, role: 'member' }),
    })

    const result = await createSchoolInvitation({
      repo,
      organizationId: 'school-1',
      invitedById: 'user-1',
      role: 'instructor',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ADMIN_OR_MANAGER')
  })

  it('должен указать роль для приглашённого', async () => {
    const repo = createMockRepo({
      getMembership: vi.fn().mockResolvedValue(mockMembership),
      createInvitation: vi.fn().mockImplementation((data) => Promise.resolve({ ...mockInvitation, ...data })),
    })

    await createSchoolInvitation({
      repo,
      organizationId: 'school-1',
      invitedById: 'user-1',
      role: 'member',
    })

    expect(repo.createInvitation).toHaveBeenCalledWith(expect.objectContaining({ role: 'member' }))
  })
})

// ============================================================================
// Тесты: acceptSchoolInvitation
// ============================================================================

describe('acceptSchoolInvitation', () => {
  it('должен создать членство по приглашению', async () => {
    const repo = createMockRepo({
      getInvitationById: vi.fn().mockResolvedValue(mockInvitation),
      getMembership: vi.fn().mockResolvedValue(null),
      createMembership: vi.fn().mockResolvedValue(mockMembership),
      updateInvitation: vi.fn().mockResolvedValue({ ...mockInvitation, status: 'accepted' }),
    })

    const result = await acceptSchoolInvitation({
      repo,
      invitationId: 'invitation-1',
      userId: 'user-2',
    })

    expect(result.success).toBe(true)
    expect(repo.createMembership).toHaveBeenCalled()
  })

  it('должен присвоить роль из приглашения', async () => {
    const repo = createMockRepo({
      getInvitationById: vi.fn().mockResolvedValue({ ...mockInvitation, role: 'member' }),
      getMembership: vi.fn().mockResolvedValue(null),
      createMembership: vi.fn().mockResolvedValue({ ...mockMembership, role: 'member' }),
      updateInvitation: vi.fn().mockResolvedValue({ ...mockInvitation, status: 'accepted' }),
    })

    await acceptSchoolInvitation({
      repo,
      invitationId: 'invitation-1',
      userId: 'user-2',
    })

    expect(repo.createMembership).toHaveBeenCalledWith(expect.objectContaining({ role: 'member' }))
  })

  it('должен пометить приглашение как принятое', async () => {
    const repo = createMockRepo({
      getInvitationById: vi.fn().mockResolvedValue(mockInvitation),
      getMembership: vi.fn().mockResolvedValue(null),
      createMembership: vi.fn().mockResolvedValue(mockMembership),
      updateInvitation: vi.fn().mockResolvedValue({ ...mockInvitation, status: 'accepted' }),
    })

    await acceptSchoolInvitation({
      repo,
      invitationId: 'invitation-1',
      userId: 'user-2',
    })

    expect(repo.updateInvitation).toHaveBeenCalledWith(
      mockInvitation.id,
      expect.objectContaining({ status: 'accepted' })
    )
  })

  it('должен вернуть ошибку если приглашение не найдено', async () => {
    const repo = createMockRepo({
      getInvitationById: vi.fn().mockResolvedValue(null),
    })

    const result = await acceptSchoolInvitation({
      repo,
      invitationId: 'nonexistent',
      userId: 'user-2',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('INVITATION_NOT_FOUND')
  })

  it('должен вернуть ошибку если приглашение истекло', async () => {
    const expiredInvitation = {
      ...mockInvitation,
      expiresAt: new Date(Date.now() - 1000), // 1 секунда назад
    }
    const repo = createMockRepo({
      getInvitationById: vi.fn().mockResolvedValue(expiredInvitation),
    })

    const result = await acceptSchoolInvitation({
      repo,
      invitationId: 'invitation-1',
      userId: 'user-2',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('INVITATION_EXPIRED')
  })

  it('должен вернуть ошибку если уже член школы', async () => {
    const repo = createMockRepo({
      getInvitationById: vi.fn().mockResolvedValue(mockInvitation),
      getMembership: vi.fn().mockResolvedValue(mockMembership),
    })

    const result = await acceptSchoolInvitation({
      repo,
      invitationId: 'invitation-1',
      userId: 'user-1', // Уже член школы
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('ALREADY_MEMBER')
  })
})

// ============================================================================
// Тесты: declineSchoolInvitation
// ============================================================================

describe('declineSchoolInvitation', () => {
  it('должен отклонить приглашение', async () => {
    const repo = createMockRepo({
      getInvitationById: vi.fn().mockResolvedValue(mockInvitation),
      updateInvitation: vi.fn().mockResolvedValue({ ...mockInvitation, status: 'rejected' }),
    })

    const result = await declineSchoolInvitation({
      repo,
      invitationId: 'invitation-1',
    })

    expect(result.success).toBe(true)
    expect(repo.updateInvitation).toHaveBeenCalledWith(
      mockInvitation.id,
      expect.objectContaining({ status: 'rejected' })
    )
  })

  it('должен вернуть ошибку если приглашение не найдено', async () => {
    const repo = createMockRepo({
      getInvitationById: vi.fn().mockResolvedValue(null),
    })

    const result = await declineSchoolInvitation({
      repo,
      invitationId: 'nonexistent',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('INVITATION_NOT_FOUND')
  })
})

// ============================================================================
// Тесты: cancelSchoolInvitation
// ============================================================================

describe('cancelSchoolInvitation', () => {
  it('должен отменить приглашение админом', async () => {
    const repo = createMockRepo({
      getInvitationById: vi.fn().mockResolvedValue(mockInvitation),
      getMembership: vi.fn().mockResolvedValue(mockMembership),
      updateInvitation: vi.fn().mockResolvedValue({ ...mockInvitation, status: 'canceled' }),
    })

    const result = await cancelSchoolInvitation({
      repo,
      invitationId: 'invitation-1',
      userId: 'user-1',
    })

    expect(result.success).toBe(true)
  })

  it('должен вернуть ошибку если не админ или менеджер', async () => {
    const repo = createMockRepo({
      getInvitationById: vi.fn().mockResolvedValue(mockInvitation),
      getMembership: vi.fn().mockResolvedValue({ ...mockMembership, role: 'member' }),
    })

    const result = await cancelSchoolInvitation({
      repo,
      invitationId: 'invitation-1',
      userId: 'user-2',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ADMIN_OR_MANAGER')
  })
})
