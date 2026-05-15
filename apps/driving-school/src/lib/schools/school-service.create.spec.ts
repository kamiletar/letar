/**
 * @file school-service.create.spec.ts
 * @description Unit-тесты для создания и управления школой
 * @version 0.162.0
 *
 * Тестируемые функции:
 * - createSchool — создание новой школы
 * - updateSchool — обновление профиля школы
 * - getSchoolById — получение школы по ID
 * - getUserSchools — получение списка школ пользователя
 * - getSchoolMembers — получение членов школы
 */

import { createSchool, getSchoolById, getSchoolMembers, getUserSchools, updateSchool } from './school-service'
import { createMockRepo, mockMembership, mockSchool } from './school-service.mocks'

// ============================================================================
// Тесты: createSchool
// ============================================================================

describe('createSchool', () => {
  it('должен создать школу с названием', async () => {
    const repo = createMockRepo({
      createSchool: vi.fn().mockResolvedValue(mockSchool),
      createMembership: vi.fn().mockResolvedValue(mockMembership),
    })

    const result = await createSchool({
      repo,
      name: 'Автошкола "Успех"',
      creatorId: 'user-1',
    })

    expect(result.success).toBe(true)
    expect(result.school).toEqual(mockSchool)
    expect(repo.createSchool).toHaveBeenCalledWith(expect.objectContaining({ name: 'Автошкола "Успех"' }))
  })

  it('должен сделать создателя админом', async () => {
    const repo = createMockRepo({
      createSchool: vi.fn().mockResolvedValue(mockSchool),
      createMembership: vi.fn().mockResolvedValue(mockMembership),
    })

    await createSchool({
      repo,
      name: 'Автошкола',
      creatorId: 'user-1',
    })

    expect(repo.createMembership).toHaveBeenCalledWith({
      organizationId: mockSchool.id,
      userId: 'user-1',
      role: 'owner',
    })
  })

  it('должен вернуть ошибку если название пустое', async () => {
    const repo = createMockRepo()

    const result = await createSchool({
      repo,
      name: '',
      creatorId: 'user-1',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('EMPTY_NAME')
  })
})

// ============================================================================
// Тесты: updateSchool
// ============================================================================

describe('updateSchool', () => {
  it('должен обновить профиль школы', async () => {
    const updatedSchool = { ...mockSchool, description: 'Новое описание' }
    const repo = createMockRepo({
      getSchoolById: vi.fn().mockResolvedValue(mockSchool),
      getMembership: vi.fn().mockResolvedValue(mockMembership),
      updateSchool: vi.fn().mockResolvedValue(updatedSchool),
    })

    const result = await updateSchool({
      repo,
      schoolId: 'school-1',
      userId: 'user-1',
      data: { description: 'Новое описание' },
    })

    expect(result.success).toBe(true)
    expect(result.school?.description).toBe('Новое описание')
  })

  it('должен вернуть ошибку если школа не найдена', async () => {
    const repo = createMockRepo({
      getSchoolById: vi.fn().mockResolvedValue(null),
    })

    const result = await updateSchool({
      repo,
      schoolId: 'nonexistent',
      userId: 'user-1',
      data: { description: 'Тест' },
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('SCHOOL_NOT_FOUND')
  })

  it('должен вернуть ошибку если не админ', async () => {
    const repo = createMockRepo({
      getSchoolById: vi.fn().mockResolvedValue(mockSchool),
      getMembership: vi.fn().mockResolvedValue({ ...mockMembership, role: 'INSTRUCTOR' }),
    })

    const result = await updateSchool({
      repo,
      schoolId: 'school-1',
      userId: 'user-1',
      data: { description: 'Тест' },
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ADMIN')
  })
})

// ============================================================================
// Тесты: getSchoolById
// ============================================================================

describe('getSchoolById', () => {
  it('должен вернуть школу по ID', async () => {
    const repo = createMockRepo({
      getSchoolById: vi.fn().mockResolvedValue(mockSchool),
    })

    const result = await getSchoolById({
      repo,
      schoolId: 'school-1',
    })

    expect(result.success).toBe(true)
    expect(result.school).toEqual(mockSchool)
  })

  it('должен вернуть ошибку если школа не найдена', async () => {
    const repo = createMockRepo({
      getSchoolById: vi.fn().mockResolvedValue(null),
    })

    const result = await getSchoolById({
      repo,
      schoolId: 'nonexistent',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('SCHOOL_NOT_FOUND')
  })
})

// ============================================================================
// Тесты: getUserSchools
// ============================================================================

describe('getUserSchools', () => {
  it('должен вернуть все школы пользователя', async () => {
    const schools = [mockSchool, { ...mockSchool, id: 'school-2', name: 'Вторая школа' }]
    const repo = createMockRepo({
      getSchoolsByUserId: vi.fn().mockResolvedValue(schools),
    })

    const result = await getUserSchools({
      repo,
      userId: 'user-1',
    })

    expect(result.success).toBe(true)
    expect(result.schools).toHaveLength(2)
  })

  it('должен вернуть пустой массив если нет школ', async () => {
    const repo = createMockRepo({
      getSchoolsByUserId: vi.fn().mockResolvedValue([]),
    })

    const result = await getUserSchools({
      repo,
      userId: 'user-1',
    })

    expect(result.success).toBe(true)
    expect(result.schools).toHaveLength(0)
  })
})

// ============================================================================
// Тесты: getSchoolMembers
// ============================================================================

describe('getSchoolMembers', () => {
  it('должен вернуть всех членов школы', async () => {
    const members = [mockMembership, { ...mockMembership, id: 'membership-2', userId: 'user-2', role: 'INSTRUCTOR' }]
    const repo = createMockRepo({
      getSchoolMembers: vi.fn().mockResolvedValue(members),
    })

    const result = await getSchoolMembers({
      repo,
      organizationId: 'school-1',
    })

    expect(result.success).toBe(true)
    expect(result.members).toHaveLength(2)
  })

  it('должен фильтровать по роли', async () => {
    const instructors = [{ ...mockMembership, id: 'membership-2', userId: 'user-2', role: 'instructor' }]
    const repo = createMockRepo({
      getSchoolMembers: vi.fn().mockResolvedValue(instructors),
    })

    const result = await getSchoolMembers({
      repo,
      organizationId: 'school-1',
      role: 'instructor',
    })

    expect(result.success).toBe(true)
    expect(result.members).toHaveLength(1)
    expect(repo.getSchoolMembers).toHaveBeenCalledWith('school-1', 'instructor')
  })
})
