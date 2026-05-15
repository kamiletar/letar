// globals: true — describe, expect, it доступны глобально
import { checkAuthorization } from '../auth-utils'

describe('checkAuthorization', () => {
  const createMockRequest = (pathname: string) => ({
    nextUrl: new URL(`http://localhost:3000${pathname}`),
  })

  // Актуальные роли системы
  type UserRole = 'USER' | 'FREELANCE_INSTRUCTOR' | 'MODERATOR' | 'OWNER'

  // Хелпер для создания сессии авторизации
  const createAuth = (roles: UserRole[] = [], isOnboardingComplete = true) =>
    roles.length > 0
      ? {
          user: { roles, isOnboardingComplete },
        }
      : null

  describe('публичные страницы', () => {
    it('должен разрешить доступ к /sign-in без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/sign-in'),
      })
      expect(result).toBe(true)
    })

    it('должен разрешить доступ к /sign-up без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/sign-up'),
      })
      expect(result).toBe(true)
    })

    it('должен редиректить с /sign-in на /dashboard если залогинен и onboarding завершён', () => {
      const result = checkAuthorization({
        auth: createAuth(['USER'], true),
        request: createMockRequest('/sign-in'),
      })
      expect(result).toEqual({ redirect: '/dashboard' })
    })

    it('должен редиректить с /sign-in на /onboarding если залогинен но onboarding не завершён', () => {
      const result = checkAuthorization({
        auth: createAuth(['USER'], false),
        request: createMockRequest('/sign-in'),
      })
      expect(result).toEqual({ redirect: '/onboarding' })
    })

    it('должен редиректить с /sign-up на /dashboard если залогинен и onboarding завершён', () => {
      const result = checkAuthorization({
        auth: createAuth(['FREELANCE_INSTRUCTOR'], true),
        request: createMockRequest('/sign-up'),
      })
      expect(result).toEqual({ redirect: '/dashboard' })
    })

    it('должен разрешить доступ к /join-instructor/ без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/join-instructor/abc123'),
      })
      expect(result).toBe(true)
    })

    it('должен разрешить доступ к /join-school/ без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/join-school/abc123'),
      })
      expect(result).toBe(true)
    })
  })

  describe('страница onboarding', () => {
    it('должен редиректить на /sign-in без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/onboarding'),
      })
      expect(result).toEqual({ redirect: '/sign-in?callbackUrl=%2Fonboarding' })
    })

    it('должен разрешить доступ если залогинен но onboarding не завершён', () => {
      const result = checkAuthorization({
        auth: createAuth(['USER'], false),
        request: createMockRequest('/onboarding'),
      })
      expect(result).toBe(true)
    })

    it('должен редиректить на /dashboard если onboarding уже завершён', () => {
      const result = checkAuthorization({
        auth: createAuth(['USER'], true),
        request: createMockRequest('/onboarding'),
      })
      expect(result).toEqual({ redirect: '/dashboard' })
    })
  })

  describe('страницы владельца (/owner)', () => {
    it('должен редиректить на /sign-in без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/owner'),
      })
      // Редирект с callbackUrl для защищённых страниц
      expect(result).toEqual({ redirect: '/sign-in?callbackUrl=%2Fowner' })
    })

    it('должен редиректить на /onboarding если onboarding не завершён', () => {
      const result = checkAuthorization({
        auth: createAuth(['OWNER'], false),
        request: createMockRequest('/owner'),
      })
      expect(result).toEqual({ redirect: '/onboarding' })
    })

    it('должен редиректить USER на /dashboard', () => {
      const result = checkAuthorization({
        auth: createAuth(['USER'], true),
        request: createMockRequest('/owner'),
      })
      expect(result).toEqual({ redirect: '/dashboard' })
    })

    it('должен редиректить FREELANCE_INSTRUCTOR на /dashboard', () => {
      const result = checkAuthorization({
        auth: createAuth(['FREELANCE_INSTRUCTOR'], true),
        request: createMockRequest('/owner'),
      })
      expect(result).toEqual({ redirect: '/dashboard' })
    })

    it('должен редиректить MODERATOR на /dashboard', () => {
      const result = checkAuthorization({
        auth: createAuth(['MODERATOR'], true),
        request: createMockRequest('/owner'),
      })
      expect(result).toEqual({ redirect: '/dashboard' })
    })

    it('должен разрешить доступ OWNER', () => {
      const result = checkAuthorization({
        auth: createAuth(['OWNER'], true),
        request: createMockRequest('/owner'),
      })
      expect(result).toBe(true)
    })

    it('должен разрешить доступ OWNER к /owner/users', () => {
      const result = checkAuthorization({
        auth: createAuth(['OWNER'], true),
        request: createMockRequest('/owner/users'),
      })
      expect(result).toBe(true)
    })
  })

  describe('страницы модератора (/moderation)', () => {
    it('должен редиректить на /sign-in без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/moderation'),
      })
      expect(result).toEqual({ redirect: '/sign-in?callbackUrl=%2Fmoderation' })
    })

    it('должен редиректить на /onboarding если onboarding не завершён', () => {
      const result = checkAuthorization({
        auth: createAuth(['MODERATOR'], false),
        request: createMockRequest('/moderation'),
      })
      expect(result).toEqual({ redirect: '/onboarding' })
    })

    it('должен редиректить USER на /dashboard', () => {
      const result = checkAuthorization({
        auth: createAuth(['USER'], true),
        request: createMockRequest('/moderation'),
      })
      expect(result).toEqual({ redirect: '/dashboard' })
    })

    it('должен разрешить доступ MODERATOR', () => {
      const result = checkAuthorization({
        auth: createAuth(['MODERATOR'], true),
        request: createMockRequest('/moderation'),
      })
      expect(result).toBe(true)
    })

    it('должен разрешить доступ OWNER', () => {
      const result = checkAuthorization({
        auth: createAuth(['OWNER'], true),
        request: createMockRequest('/moderation'),
      })
      expect(result).toBe(true)
    })
  })

  describe('страницы инструктора (/instructor)', () => {
    it('должен редиректить на /sign-in без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/instructor/schedule'),
      })
      expect(result).toEqual({ redirect: '/sign-in?callbackUrl=%2Finstructor%2Fschedule' })
    })

    it('должен редиректить на /onboarding если onboarding не завершён', () => {
      const result = checkAuthorization({
        auth: createAuth(['FREELANCE_INSTRUCTOR'], false),
        request: createMockRequest('/instructor/schedule'),
      })
      expect(result).toEqual({ redirect: '/onboarding' })
    })

    it('должен разрешить доступ FREELANCE_INSTRUCTOR', () => {
      const result = checkAuthorization({
        auth: createAuth(['FREELANCE_INSTRUCTOR'], true),
        request: createMockRequest('/instructor/schedule'),
      })
      expect(result).toBe(true)
    })

    it('должен редиректить USER на /dashboard', () => {
      const result = checkAuthorization({
        auth: createAuth(['USER'], true),
        request: createMockRequest('/instructor/schedule'),
      })
      expect(result).toEqual({ redirect: '/dashboard' })
    })

    it('должен разрешить доступ OWNER', () => {
      const result = checkAuthorization({
        auth: createAuth(['OWNER'], true),
        request: createMockRequest('/instructor/schedule'),
      })
      expect(result).toBe(true)
    })
  })

  describe('страницы админа школы (/school-admin)', () => {
    it('должен редиректить на /sign-in без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/school-admin/members'),
      })
      expect(result).toEqual({ redirect: '/sign-in?callbackUrl=%2Fschool-admin%2Fmembers' })
    })

    it('должен редиректить на /onboarding если onboarding не завершён', () => {
      const result = checkAuthorization({
        auth: createAuth(['USER'], false),
        request: createMockRequest('/school-admin/members'),
      })
      expect(result).toEqual({ redirect: '/onboarding' })
    })

    // Важно: детальная проверка SchoolMembership выполняется на уровне страниц
    it('должен разрешить доступ любому авторизованному пользователю с завершённым onboarding', () => {
      const result = checkAuthorization({
        auth: createAuth(['USER'], true),
        request: createMockRequest('/school-admin/members'),
      })
      // Middleware пропускает, детальная проверка на уровне страниц
      expect(result).toBe(true)
    })

    it('должен разрешить доступ OWNER', () => {
      const result = checkAuthorization({
        auth: createAuth(['OWNER'], true),
        request: createMockRequest('/school-admin/members'),
      })
      expect(result).toBe(true)
    })
  })

  describe('страницы школы (/school)', () => {
    it('должен редиректить на /sign-in без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/school/123/settings'),
      })
      expect(result).toEqual({ redirect: '/sign-in?callbackUrl=%2Fschool%2F123%2Fsettings' })
    })

    it('должен редиректить на /onboarding если onboarding не завершён', () => {
      const result = checkAuthorization({
        auth: createAuth(['USER'], false),
        request: createMockRequest('/school/123'),
      })
      expect(result).toEqual({ redirect: '/onboarding' })
    })

    it('должен разрешить доступ авторизованному пользователю с завершённым onboarding', () => {
      const result = checkAuthorization({
        auth: createAuth(['USER'], true),
        request: createMockRequest('/school/123'),
      })
      // Middleware пропускает, детальная проверка SchoolMembership на уровне страниц
      expect(result).toBe(true)
    })
  })

  describe('публичные каталоги', () => {
    it('должен разрешить доступ к /instructors без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/instructors'),
      })
      expect(result).toBe(true)
    })

    it('должен разрешить доступ к /instructors/abc123 без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/instructors/abc123'),
      })
      expect(result).toBe(true)
    })

    it('должен разрешить доступ к /schools без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/schools'),
      })
      expect(result).toBe(true)
    })

    it('должен разрешить доступ к /schools/abc123 без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/schools/abc123'),
      })
      expect(result).toBe(true)
    })

    it('должен разрешить доступ к каталогам с авторизацией', () => {
      const result = checkAuthorization({
        auth: createAuth(['USER'], true),
        request: createMockRequest('/instructors'),
      })
      expect(result).toBe(true)
    })
  })

  describe('защищённые страницы (/dashboard, /profile)', () => {
    it('должен редиректить на /sign-in без авторизации для /dashboard', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/dashboard'),
      })
      expect(result).toEqual({ redirect: '/sign-in?callbackUrl=%2Fdashboard' })
    })

    it('должен редиректить на /onboarding если onboarding не завершён для /dashboard', () => {
      const result = checkAuthorization({
        auth: createAuth(['USER'], false),
        request: createMockRequest('/dashboard'),
      })
      expect(result).toEqual({ redirect: '/onboarding' })
    })

    it('должен разрешить доступ авторизованному пользователю с завершённым onboarding для /dashboard', () => {
      const result = checkAuthorization({
        auth: createAuth(['USER'], true),
        request: createMockRequest('/dashboard'),
      })
      expect(result).toBe(true)
    })

    it('должен редиректить на /sign-in без авторизации для /profile', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/profile'),
      })
      expect(result).toEqual({ redirect: '/sign-in?callbackUrl=%2Fprofile' })
    })

    it('должен редиректить на /onboarding если onboarding не завершён для /profile', () => {
      const result = checkAuthorization({
        auth: createAuth(['FREELANCE_INSTRUCTOR'], false),
        request: createMockRequest('/profile'),
      })
      expect(result).toEqual({ redirect: '/onboarding' })
    })

    it('должен разрешить доступ авторизованному пользователю с завершённым onboarding для /profile', () => {
      const result = checkAuthorization({
        auth: createAuth(['FREELANCE_INSTRUCTOR'], true),
        request: createMockRequest('/profile'),
      })
      expect(result).toBe(true)
    })
  })

  describe('множественные роли', () => {
    it('пользователь с FREELANCE_INSTRUCTOR и MODERATOR имеет доступ к обоим разделам', () => {
      const roles: UserRole[] = ['FREELANCE_INSTRUCTOR', 'MODERATOR']

      const instructorResult = checkAuthorization({
        auth: createAuth(roles, true),
        request: createMockRequest('/instructor/schedule'),
      })
      expect(instructorResult).toBe(true)

      const moderatorResult = checkAuthorization({
        auth: createAuth(roles, true),
        request: createMockRequest('/moderation'),
      })
      expect(moderatorResult).toBe(true)
    })

    it('OWNER имеет доступ ко всем защищённым разделам', () => {
      const roles: UserRole[] = ['OWNER']

      expect(
        checkAuthorization({ auth: createAuth(roles, true), request: createMockRequest('/instructor/schedule') })
      ).toBe(true)
      expect(
        checkAuthorization({ auth: createAuth(roles, true), request: createMockRequest('/school-admin/members') })
      ).toBe(true)
      expect(checkAuthorization({ auth: createAuth(roles, true), request: createMockRequest('/owner/users') })).toBe(
        true
      )
      expect(checkAuthorization({ auth: createAuth(roles, true), request: createMockRequest('/moderation') })).toBe(
        true
      )
      expect(checkAuthorization({ auth: createAuth(roles, true), request: createMockRequest('/dashboard') })).toBe(true)
    })
  })

  describe('прочие страницы (публичные)', () => {
    it('должен разрешить доступ к корневому пути без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/'),
      })
      expect(result).toBe(true)
    })

    it('должен разрешить доступ к корневому пути с авторизацией', () => {
      const result = checkAuthorization({
        auth: createAuth(['USER'], true),
        request: createMockRequest('/'),
      })
      expect(result).toBe(true)
    })

    it('должен разрешить доступ к /about без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/about'),
      })
      expect(result).toBe(true)
    })

    it('должен разрешить доступ к /privacy без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/privacy'),
      })
      expect(result).toBe(true)
    })

    it('должен разрешить доступ к /terms без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/terms'),
      })
      expect(result).toBe(true)
    })

    it('должен разрешить доступ к /contacts без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/contacts'),
      })
      expect(result).toBe(true)
    })

    it('должен разрешить доступ к /forgot-password без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/forgot-password'),
      })
      expect(result).toBe(true)
    })

    it('должен разрешить доступ к /reset-password без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/reset-password'),
      })
      expect(result).toBe(true)
    })

    it('должен разрешить доступ к /verify-email без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/verify-email'),
      })
      expect(result).toBe(true)
    })

    it('должен разрешить доступ к публичным страницам с авторизацией', () => {
      const result = checkAuthorization({
        auth: createAuth(['USER'], true),
        request: createMockRequest('/about'),
      })
      expect(result).toBe(true)
    })
  })

  describe('OAuth consent страница', () => {
    it('должен редиректить на /sign-in без авторизации', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/oauth-consent'),
      })
      expect(result).toEqual({ redirect: '/sign-in?callbackUrl=%2Foauth-consent' })
    })

    it('должен разрешить доступ авторизованному пользователю (даже без завершённого onboarding)', () => {
      const result = checkAuthorization({
        auth: createAuth(['USER'], false),
        request: createMockRequest('/oauth-consent'),
      })
      expect(result).toBe(true)
    })
  })

  describe('API и статические файлы', () => {
    it('должен пропускать /api/ роуты', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/api/auth/session'),
      })
      expect(result).toBe(true)
    })

    it('должен пропускать /_next/ роуты', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/_next/static/chunk.js'),
      })
      expect(result).toBe(true)
    })

    it('должен пропускать файлы со расширением', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/favicon.ico'),
      })
      expect(result).toBe(true)
    })
  })

  describe('callbackUrl в редиректах', () => {
    it('должен добавлять callbackUrl для защищённых страниц', () => {
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/instructor/students'),
      })
      expect(result).toEqual({ redirect: '/sign-in?callbackUrl=%2Finstructor%2Fstudents' })
    })

    it('НЕ должен добавлять callbackUrl для / (главная)', () => {
      // Главная страница публичная, так что тут нет редиректа
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/'),
      })
      expect(result).toBe(true)
    })

    it('НЕ должен добавлять callbackUrl для страниц авторизации', () => {
      // Страницы авторизации для неавторизованных возвращают true
      const result = checkAuthorization({
        auth: createAuth(),
        request: createMockRequest('/sign-in'),
      })
      expect(result).toBe(true)
    })
  })
})
