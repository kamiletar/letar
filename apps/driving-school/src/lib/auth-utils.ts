type UserRole = 'USER' | 'FREELANCE_INSTRUCTOR' | 'MODERATOR' | 'OWNER'

interface AuthSession {
  user?: {
    roles?: UserRole[]
    isOnboardingComplete?: boolean
  }
}

interface AuthorizedParams {
  auth: AuthSession | null
  request: { nextUrl: URL }
}

// Тип для результата авторизации (для тестирования)
export type AuthResult = true | { redirect: string }

/**
 * Чистая логика авторизации для middleware (без зависимости от NextResponse)
 * Вынесена в отдельную функцию для тестирования
 *
 * ВАЖНО: В middleware нет доступа к БД, поэтому проверка SchoolMembership
 * должна выполняться на уровне страниц/серверных действий, не здесь.
 *
 * @returns true - разрешить доступ, { redirect: string } - редирект
 */
export function checkAuthorization({ auth, request: { nextUrl } }: AuthorizedParams): AuthResult {
  const isLoggedIn = !!auth?.user
  const userRoles = auth?.user?.roles || []
  const isOnboardingComplete = auth?.user?.isOnboardingComplete ?? false

  // Хелпер для проверки наличия роли
  const hasRole = (role: UserRole) => userRoles.includes(role)

  // Хелпер для создания редиректа на sign-in с callbackUrl
  const signInRedirect = (): { redirect: string } => {
    const currentPath = nextUrl.pathname + nextUrl.search
    // Не добавляем callbackUrl для главной и страниц авторизации
    const excludedPrefixes = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password']
    if (currentPath === '/' || excludedPrefixes.some((prefix) => currentPath.startsWith(prefix))) {
      return { redirect: '/sign-in' }
    }
    return { redirect: `/sign-in?callbackUrl=${encodeURIComponent(currentPath)}` }
  }

  // Публичные страницы
  const isOnAuthPage = nextUrl.pathname.startsWith('/sign-in') || nextUrl.pathname.startsWith('/sign-up')
  const isOnInvitePage =
    nextUrl.pathname.startsWith('/join-instructor/') || nextUrl.pathname.startsWith('/join-school/')
  const isOnOnboardingPage = nextUrl.pathname.startsWith('/onboarding')
  const isOnOAuthConsentPage = nextUrl.pathname.startsWith('/oauth-consent')

  // Публичные каталоги (НЕ защищённые)
  const isOnPublicCatalog = nextUrl.pathname.startsWith('/instructors') || nextUrl.pathname.startsWith('/schools')

  // Защищённые зоны по ролям
  const isOnInstructorPage =
    (nextUrl.pathname.startsWith('/instructor') && !nextUrl.pathname.startsWith('/instructors')) ||
    nextUrl.pathname.startsWith('/students/') // Страницы управления учениками для инструктора
  const isOnSchoolAdminPage = nextUrl.pathname.startsWith('/school-admin')
  const isOnSchoolPage = nextUrl.pathname.startsWith('/school') && !nextUrl.pathname.startsWith('/schools')
  const isOnOwnerPage = nextUrl.pathname.startsWith('/owner')
  const isOnDashboard = nextUrl.pathname === '/dashboard'
  const isOnProfile = nextUrl.pathname === '/profile'
  const isOnModeratorPage = nextUrl.pathname.startsWith('/moderation')

  // Если на странице авторизации и уже залогинен - редирект на onboarding или dashboard
  if (isOnAuthPage) {
    if (isLoggedIn) {
      return { redirect: isOnboardingComplete ? '/dashboard' : '/onboarding' }
    }
    return true
  }

  // Страница приглашения - публичная
  if (isOnInvitePage) {
    return true
  }

  // Страница onboarding
  if (isOnOnboardingPage) {
    if (!isLoggedIn) {
      return signInRedirect()
    }
    // Если onboarding уже завершён - на dashboard
    if (isOnboardingComplete) {
      return { redirect: '/dashboard' }
    }
    return true
  }

  // Страница принятия оферты для OAuth (не требует завершённого onboarding)
  if (isOnOAuthConsentPage) {
    if (!isLoggedIn) {
      return signInRedirect()
    }
    return true
  }

  // Публичные каталоги инструкторов и школ - доступны всем
  if (isOnPublicCatalog) {
    return true
  }

  // Страницы для владельца платформы
  if (isOnOwnerPage) {
    if (!isLoggedIn) {
      return signInRedirect()
    }
    if (!isOnboardingComplete) {
      return { redirect: '/onboarding' }
    }
    if (!hasRole('OWNER')) {
      return { redirect: '/dashboard' }
    }
    return true
  }

  // Страницы для модераторов
  if (isOnModeratorPage) {
    if (!isLoggedIn) {
      return signInRedirect()
    }
    if (!isOnboardingComplete) {
      return { redirect: '/onboarding' }
    }
    if (!hasRole('MODERATOR') && !hasRole('OWNER')) {
      return { redirect: '/dashboard' }
    }
    return true
  }

  // Страницы для инструкторов (только FREELANCE_INSTRUCTOR)
  // Инструкторы школы проверяются через SchoolMembership на уровне страниц
  if (isOnInstructorPage) {
    if (!isLoggedIn) {
      return signInRedirect()
    }
    if (!isOnboardingComplete) {
      return { redirect: '/onboarding' }
    }
    if (!hasRole('FREELANCE_INSTRUCTOR') && !hasRole('OWNER')) {
      return { redirect: '/dashboard' }
    }
    return true
  }

  // Страницы для администраторов автошкол (/school-admin/*)
  // ВАЖНО: Детальная проверка SchoolMembership выполняется на уровне страниц
  // Здесь только проверяем, что пользователь залогинен
  if (isOnSchoolAdminPage) {
    if (!isLoggedIn) {
      return signInRedirect()
    }
    if (!isOnboardingComplete) {
      return { redirect: '/onboarding' }
    }
    // Владелец имеет доступ ко всем школам
    // Для остальных - проверка SchoolMembership на уровне страниц
    return true
  }

  // Страницы управления школой (/school/* но не /schools/*)
  if (isOnSchoolPage) {
    if (!isLoggedIn) {
      return signInRedirect()
    }
    if (!isOnboardingComplete) {
      return { redirect: '/onboarding' }
    }
    // Детальная проверка SchoolMembership на уровне страниц
    return true
  }

  // Dashboard и Profile - требуют авторизации и завершённого onboarding
  if (isOnDashboard || isOnProfile) {
    if (!isLoggedIn) {
      return signInRedirect()
    }
    // Если onboarding не завершён - перенаправляем
    if (!isOnboardingComplete) {
      return { redirect: '/onboarding' }
    }
    return true
  }

  // Главная страница - доступна всем (авторизованным и неавторизованным)
  if (nextUrl.pathname === '/') {
    return true
  }

  // Публичные страницы, доступные без авторизации и онбординга
  const publicPaths = [
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/privacy',
    '/terms',
    '/about',
    '/contacts',
  ]
  const isOnPublicPage = publicPaths.some(
    (path) => nextUrl.pathname === path || nextUrl.pathname.startsWith(`${path}/`)
  )

  // API роуты и статические файлы - пропускаем
  const isApiOrStatic =
    nextUrl.pathname.startsWith('/api/') || nextUrl.pathname.startsWith('/_next/') || nextUrl.pathname.includes('.')

  if (isOnPublicPage || isApiOrStatic) {
    return true
  }

  // Все остальные маршруты (включая несуществующие):
  // Пропускаем, чтобы Next.js показал 404 для несуществующих страниц
  // Защита конкретных маршрутов должна быть явно описана выше
  return true
}
