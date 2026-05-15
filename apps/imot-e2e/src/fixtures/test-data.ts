/**
 * Тестовые данные для E2E тестов IMOT
 *
 * ⚠️ ВАЖНО: В IMOT включён trailingSlash: true
 * Все URL должны заканчиваться на / (например, /profile/, а не /profile)
 */

// Генератор уникального email для каждого теста
export function generateTestEmail(prefix = 'test'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}-${timestamp}-${random}@e2e-test.local`
}

// Фиксированные тестовые пользователи (создаются в global-setup)
export const testClient = {
  email: 'e2e-client@e2e-test.local',
  password: 'TestPass123!',
  name: 'E2E Клиент',
}

export const testSpecialist = {
  email: 'e2e-specialist@e2e-test.local',
  password: 'TestPass123!',
  name: 'E2E Специалист',
}

export const testAdmin = {
  email: 'e2e-admin@e2e-test.local',
  password: 'TestPass123!',
  name: 'E2E Администратор',
}

// Неверные данные для негативных тестов
export const invalidCredentials = {
  email: 'nonexistent@test.local',
  password: 'WrongPassword123!',
}

// Слабый пароль для проверки валидации
export const weakPassword = '123'

// URL маршруты (все с trailing slash)
export const urls = {
  // Публичные
  home: '/',
  signIn: '/sign-in/',
  signUp: '/sign-up/',

  // Общие защищённые (любая роль)
  dashboard: '/dashboard/',
  profile: '/profile/',
  profileEdit: '/profile/edit/',

  // Клиентские маршруты (роль CLIENT)
  myProfile: '/my-profile/',
  myProfileEdit: '/my-profile/edit/',
  diagnostics: '/diagnostics/',
  plan: '/plan/',
  practices: '/practices/',
  progress: '/progress/',
  draftRequest: '/draft-request/',

  // Специалистские маршруты (роль SPECIALIST/ADMIN)
  clients: '/clients/',
  clientsNew: '/clients/new/',
  sessions: '/sessions/',
  sessionsNew: '/sessions/new/',
  plans: '/plans/',
  plansNew: '/plans/new/',
  analytics: '/analytics/',

  // Админские маршруты (роль ADMIN)
  users: '/users/',
  specialists: '/specialists/',
  settings: '/settings/',
}
