import type { UserRole } from '@letar/driving-school-db/prisma'
// globals: true — describe, expect, it доступны глобально
import {
  canActAsInstructor,
  canManageSchedule,
  canModerate,
  hasAllRoles,
  hasAnyRole,
  hasRole,
  isFreelanceInstructor,
  isModerator,
  isOwner,
  isSchoolAdmin,
  isSchoolInstructor,
  isSchoolManager,
  isSchoolMember,
  isSchoolStudent,
  isUser,
} from '../roles'

describe('roles хелперы', () => {
  describe('hasRole', () => {
    it('должен вернуть true если роль есть в массиве', () => {
      const roles: UserRole[] = ['USER', 'FREELANCE_INSTRUCTOR']
      expect(hasRole(roles, 'USER')).toBe(true)
      expect(hasRole(roles, 'FREELANCE_INSTRUCTOR')).toBe(true)
    })

    it('должен вернуть false если роли нет в массиве', () => {
      const roles: UserRole[] = ['USER']
      expect(hasRole(roles, 'FREELANCE_INSTRUCTOR')).toBe(false)
      expect(hasRole(roles, 'OWNER')).toBe(false)
    })

    it('должен вернуть false для undefined', () => {
      expect(hasRole(undefined, 'USER')).toBe(false)
    })

    it('должен вернуть false для null', () => {
      expect(hasRole(null, 'USER')).toBe(false)
    })

    it('должен вернуть false для пустого массива', () => {
      expect(hasRole([], 'USER')).toBe(false)
    })
  })

  describe('hasAnyRole', () => {
    it('должен вернуть true если есть хотя бы одна роль', () => {
      const roles: UserRole[] = ['USER']
      expect(hasAnyRole(roles, ['USER', 'FREELANCE_INSTRUCTOR'])).toBe(true)
    })

    it('должен вернуть true если есть несколько ролей из требуемых', () => {
      const roles: UserRole[] = ['USER', 'FREELANCE_INSTRUCTOR']
      expect(hasAnyRole(roles, ['USER', 'FREELANCE_INSTRUCTOR'])).toBe(true)
    })

    it('должен вернуть false если нет ни одной роли', () => {
      const roles: UserRole[] = ['USER']
      expect(hasAnyRole(roles, ['FREELANCE_INSTRUCTOR', 'MODERATOR'])).toBe(false)
    })

    it('должен вернуть false для undefined', () => {
      expect(hasAnyRole(undefined, ['USER'])).toBe(false)
    })

    it('должен вернуть false для null', () => {
      expect(hasAnyRole(null, ['USER'])).toBe(false)
    })

    it('должен вернуть false для пустого массива ролей', () => {
      expect(hasAnyRole([], ['USER'])).toBe(false)
    })

    it('должен вернуть false для пустого массива требуемых ролей', () => {
      const roles: UserRole[] = ['USER']
      expect(hasAnyRole(roles, [])).toBe(false)
    })
  })

  describe('hasAllRoles', () => {
    it('должен вернуть true если есть все роли', () => {
      const roles: UserRole[] = ['USER', 'FREELANCE_INSTRUCTOR', 'MODERATOR']
      expect(hasAllRoles(roles, ['USER', 'FREELANCE_INSTRUCTOR'])).toBe(true)
    })

    it('должен вернуть false если не хватает ролей', () => {
      const roles: UserRole[] = ['USER']
      expect(hasAllRoles(roles, ['USER', 'FREELANCE_INSTRUCTOR'])).toBe(false)
    })

    it('должен вернуть true для пустого массива требуемых ролей', () => {
      const roles: UserRole[] = ['USER']
      expect(hasAllRoles(roles, [])).toBe(true)
    })

    it('должен вернуть false для undefined', () => {
      expect(hasAllRoles(undefined, ['USER'])).toBe(false)
    })

    it('должен вернуть false для null', () => {
      expect(hasAllRoles(null, ['USER'])).toBe(false)
    })
  })

  describe('isOwner', () => {
    it('должен вернуть true для владельца', () => {
      const roles: UserRole[] = ['OWNER']
      expect(isOwner(roles)).toBe(true)
    })

    it('должен вернуть true для владельца с другими ролями', () => {
      const roles: UserRole[] = ['OWNER', 'FREELANCE_INSTRUCTOR']
      expect(isOwner(roles)).toBe(true)
    })

    it('должен вернуть false для не-владельца', () => {
      const roles: UserRole[] = ['USER', 'FREELANCE_INSTRUCTOR']
      expect(isOwner(roles)).toBe(false)
    })

    it('должен вернуть false для undefined', () => {
      expect(isOwner(undefined)).toBe(false)
    })
  })

  describe('isUser', () => {
    it('должен вернуть true для пользователя с ролью USER', () => {
      const roles: UserRole[] = ['USER']
      expect(isUser(roles)).toBe(true)
    })

    it('должен вернуть false для пользователя без роли USER', () => {
      const roles: UserRole[] = ['FREELANCE_INSTRUCTOR']
      expect(isUser(roles)).toBe(false)
    })

    it('должен вернуть false для undefined', () => {
      expect(isUser(undefined)).toBe(false)
    })
  })

  describe('isFreelanceInstructor', () => {
    it('должен вернуть true для фрилансера', () => {
      const roles: UserRole[] = ['FREELANCE_INSTRUCTOR']
      expect(isFreelanceInstructor(roles)).toBe(true)
    })

    it('должен вернуть false для не-фрилансера', () => {
      const roles: UserRole[] = ['USER']
      expect(isFreelanceInstructor(roles)).toBe(false)
    })

    it('должен вернуть false для undefined', () => {
      expect(isFreelanceInstructor(undefined)).toBe(false)
    })
  })

  describe('isModerator', () => {
    it('должен вернуть true для модератора', () => {
      const roles: UserRole[] = ['MODERATOR']
      expect(isModerator(roles)).toBe(true)
    })

    it('должен вернуть false для не-модератора', () => {
      const roles: UserRole[] = ['USER']
      expect(isModerator(roles)).toBe(false)
    })

    it('должен вернуть false для undefined', () => {
      expect(isModerator(undefined)).toBe(false)
    })
  })

  describe('школьные роли', () => {
    const adminMembership = [{ organizationId: 'school-1', role: 'owner' }]
    const managerMembership = [{ organizationId: 'school-1', role: 'manager' }]
    const instructorMembership = [{ organizationId: 'school-1', role: 'instructor' }]
    const studentMembership = [{ organizationId: 'school-1', role: 'member' }]

    describe('isSchoolAdmin', () => {
      it('должен вернуть true для админа школы', () => {
        expect(isSchoolAdmin(adminMembership, 'school-1')).toBe(true)
      })

      it('должен вернуть false для менеджера школы', () => {
        expect(isSchoolAdmin(managerMembership, 'school-1')).toBe(false)
      })

      it('должен вернуть false для другой школы', () => {
        expect(isSchoolAdmin(adminMembership, 'school-2')).toBe(false)
      })
    })

    describe('isSchoolManager', () => {
      it('должен вернуть true для админа', () => {
        expect(isSchoolManager(adminMembership, 'school-1')).toBe(true)
      })

      it('должен вернуть true для менеджера', () => {
        expect(isSchoolManager(managerMembership, 'school-1')).toBe(true)
      })

      it('должен вернуть false для инструктора', () => {
        expect(isSchoolManager(instructorMembership, 'school-1')).toBe(false)
      })
    })

    describe('isSchoolInstructor', () => {
      it('должен вернуть true для инструктора школы', () => {
        expect(isSchoolInstructor(instructorMembership, 'school-1')).toBe(true)
      })

      it('должен вернуть false для ученика школы', () => {
        expect(isSchoolInstructor(studentMembership, 'school-1')).toBe(false)
      })
    })

    describe('isSchoolStudent', () => {
      it('должен вернуть true для ученика школы', () => {
        expect(isSchoolStudent(studentMembership, 'school-1')).toBe(true)
      })

      it('должен вернуть false для инструктора школы', () => {
        expect(isSchoolStudent(instructorMembership, 'school-1')).toBe(false)
      })
    })

    describe('isSchoolMember', () => {
      it('должен вернуть true для любого члена школы', () => {
        expect(isSchoolMember(adminMembership, 'school-1')).toBe(true)
        expect(isSchoolMember(studentMembership, 'school-1')).toBe(true)
      })

      it('должен вернуть false для другой школы', () => {
        expect(isSchoolMember(adminMembership, 'school-2')).toBe(false)
      })
    })
  })

  describe('комбинированные проверки', () => {
    describe('canManageSchedule', () => {
      it('должен вернуть true для фрилансера', () => {
        const roles: UserRole[] = ['FREELANCE_INSTRUCTOR']
        expect(canManageSchedule(roles)).toBe(true)
      })

      it('должен вернуть true для владельца', () => {
        const roles: UserRole[] = ['OWNER']
        expect(canManageSchedule(roles)).toBe(true)
      })

      it('должен вернуть false для обычного пользователя', () => {
        const roles: UserRole[] = ['USER']
        expect(canManageSchedule(roles)).toBe(false)
      })
    })

    describe('canModerate', () => {
      it('должен вернуть true для модератора', () => {
        const roles: UserRole[] = ['MODERATOR']
        expect(canModerate(roles)).toBe(true)
      })

      it('должен вернуть true для владельца', () => {
        const roles: UserRole[] = ['OWNER']
        expect(canModerate(roles)).toBe(true)
      })

      it('должен вернуть false для обычного пользователя', () => {
        const roles: UserRole[] = ['USER']
        expect(canModerate(roles)).toBe(false)
      })
    })

    describe('canActAsInstructor', () => {
      it('должен вернуть true для фрилансера', () => {
        const roles: UserRole[] = ['FREELANCE_INSTRUCTOR']
        expect(canActAsInstructor(roles)).toBe(true)
      })

      it('должен вернуть true для владельца', () => {
        const roles: UserRole[] = ['OWNER']
        expect(canActAsInstructor(roles)).toBe(true)
      })

      it('должен вернуть false для обычного пользователя', () => {
        const roles: UserRole[] = ['USER']
        expect(canActAsInstructor(roles)).toBe(false)
      })
    })
  })

  describe('комбинированные роли', () => {
    it('пользователь может быть и фрилансером, и модератором', () => {
      const roles: UserRole[] = ['USER', 'FREELANCE_INSTRUCTOR', 'MODERATOR']
      expect(isUser(roles)).toBe(true)
      expect(isFreelanceInstructor(roles)).toBe(true)
      expect(isModerator(roles)).toBe(true)
    })

    it('владелец имеет доступ ко всем функциям', () => {
      const roles: UserRole[] = ['OWNER']
      expect(isOwner(roles)).toBe(true)
      expect(canManageSchedule(roles)).toBe(true)
      expect(canModerate(roles)).toBe(true)
      expect(canActAsInstructor(roles)).toBe(true)
    })
  })
})
