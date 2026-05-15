import { describe, expect, it } from 'vitest'

import { createMembershipChecker, createRoleChecker, hasAllRoles, hasAnyRole, hasRole } from './role-utils'

describe('hasRole', () => {
  it('возвращает true если роль есть', () => {
    expect(hasRole(['ADMIN', 'USER'], 'ADMIN')).toBe(true)
  })

  it('возвращает false если роли нет', () => {
    expect(hasRole(['USER'], 'ADMIN')).toBe(false)
  })

  it('возвращает false для пустого массива', () => {
    expect(hasRole([], 'ADMIN')).toBe(false)
  })

  it('возвращает false для null', () => {
    expect(hasRole(null, 'ADMIN')).toBe(false)
  })

  it('возвращает false для undefined', () => {
    expect(hasRole(undefined, 'ADMIN')).toBe(false)
  })
})

describe('hasAnyRole', () => {
  it('возвращает true если есть хотя бы одна роль', () => {
    expect(hasAnyRole(['USER'], ['ADMIN', 'USER'])).toBe(true)
  })

  it('возвращает false если нет ни одной роли', () => {
    expect(hasAnyRole(['GUEST'], ['ADMIN', 'USER'])).toBe(false)
  })

  it('возвращает false для пустого массива ролей', () => {
    expect(hasAnyRole([], ['ADMIN'])).toBe(false)
  })

  it('возвращает false для null', () => {
    expect(hasAnyRole(null, ['ADMIN'])).toBe(false)
  })

  it('возвращает true если все требуемые роли есть', () => {
    expect(hasAnyRole(['ADMIN', 'USER', 'MODERATOR'], ['ADMIN', 'USER'])).toBe(true)
  })
})

describe('hasAllRoles', () => {
  it('возвращает true если есть все роли', () => {
    expect(hasAllRoles(['ADMIN', 'USER', 'MODERATOR'], ['ADMIN', 'USER'])).toBe(true)
  })

  it('возвращает false если нет всех ролей', () => {
    expect(hasAllRoles(['ADMIN'], ['ADMIN', 'USER'])).toBe(false)
  })

  it('возвращает false для пустого массива ролей', () => {
    expect(hasAllRoles([], ['ADMIN'])).toBe(false)
  })

  it('возвращает false для null', () => {
    expect(hasAllRoles(null, ['ADMIN'])).toBe(false)
  })

  it('возвращает true для пустого списка требуемых ролей', () => {
    expect(hasAllRoles(['USER'], [])).toBe(true)
  })
})

describe('createRoleChecker', () => {
  it('создаёт функцию проверки роли', () => {
    const isAdmin = createRoleChecker('ADMIN')

    expect(isAdmin(['ADMIN', 'USER'])).toBe(true)
    expect(isAdmin(['USER'])).toBe(false)
    expect(isAdmin(null)).toBe(false)
  })
})

describe('createMembershipChecker', () => {
  type TestMembership = { schoolId: string; role: 'ADMIN' | 'USER' | 'GUEST' }

  const memberships: TestMembership[] = [
    { schoolId: 'school-1', role: 'ADMIN' },
    { schoolId: 'school-2', role: 'USER' },
  ]

  const checker = createMembershipChecker<TestMembership>('schoolId')

  describe('isMember', () => {
    it('возвращает true если есть membership', () => {
      expect(checker.isMember(memberships, 'school-1')).toBe(true)
    })

    it('возвращает false если нет membership', () => {
      expect(checker.isMember(memberships, 'school-3')).toBe(false)
    })

    it('возвращает false для null', () => {
      expect(checker.isMember(null, 'school-1')).toBe(false)
    })
  })

  describe('hasRole', () => {
    it('возвращает true если есть роль в указанном контексте', () => {
      expect(checker.hasRole(memberships, 'school-1', 'ADMIN')).toBe(true)
    })

    it('возвращает false если нет нужной роли', () => {
      expect(checker.hasRole(memberships, 'school-1', 'USER')).toBe(false)
    })

    it('возвращает false для несуществующего контекста', () => {
      expect(checker.hasRole(memberships, 'school-3', 'ADMIN')).toBe(false)
    })
  })

  describe('hasAnyRole', () => {
    it('возвращает true если есть любая из ролей', () => {
      expect(checker.hasAnyRole(memberships, 'school-1', ['ADMIN', 'USER'])).toBe(true)
    })

    it('возвращает false если нет ни одной роли', () => {
      expect(checker.hasAnyRole(memberships, 'school-1', ['USER', 'GUEST'])).toBe(false)
    })
  })

  describe('getRole', () => {
    it('возвращает роль для контекста', () => {
      expect(checker.getRole(memberships, 'school-1')).toBe('ADMIN')
      expect(checker.getRole(memberships, 'school-2')).toBe('USER')
    })

    it('возвращает null для несуществующего контекста', () => {
      expect(checker.getRole(memberships, 'school-3')).toBeNull()
    })

    it('возвращает null для null', () => {
      expect(checker.getRole(null, 'school-1')).toBeNull()
    })
  })
})
