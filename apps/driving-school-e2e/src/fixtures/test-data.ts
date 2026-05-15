/**
 * Тестовые данные для E2E тестов
 *
 * ⚠️ ВАЖНО: В driving-school включён trailingSlash: true
 * Все URL должны заканчиваться на / (например, /profile/, а не /profile)
 * Иначе будет редирект 308 и тесты могут работать некорректно
 */

// Генератор уникального email для каждого теста
export function generateTestEmail(prefix = 'test'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}-${timestamp}-${random}@e2e-test.local`
}

// Данные для регистрации ученика
export const studentData = {
  name: 'Тест Ученик',
  email: generateTestEmail('student'),
  password: 'TestPass123!',
  role: 'STUDENT' as const,
}

// Данные для регистрации инструктора
export const instructorData = {
  name: 'Тест Инструктор',
  email: generateTestEmail('instructor'),
  password: 'TestPass123!',
  role: 'INSTRUCTOR' as const,
}

// Неверные данные для негативных тестов
export const invalidCredentials = {
  email: 'nonexistent@test.local',
  password: 'WrongPassword123!',
}

// Слабый пароль для проверки валидации
export const weakPassword = '123'

// Фиксированные тестовые учётные данные для авторизации (должны совпадать с auth.setup.ts)
export const testInstructor = {
  email: 'e2e-instructor@e2e-test.local',
  password: 'TestPass123!',
  name: 'E2E Инструктор',
}

export const testStudent = {
  email: 'e2e-student@e2e-test.local',
  password: 'TestPass123!',
  name: 'E2E Ученик',
}

export const testSchoolAdmin = {
  email: 'e2e-school-admin@e2e-test.local',
  password: 'TestPass123!',
  name: 'E2E Админ Школы',
}

export const testOwner = {
  email: 'e2e-owner@e2e-test.local',
  password: 'TestPass123!',
  name: 'E2E Владелец',
}

// URL страниц (trailingSlash: true в next.config.js)
export const urls = {
  home: '/',
  signIn: '/sign-in/',
  signUp: '/sign-up/',
  dashboard: '/dashboard/',
  forgotPassword: '/forgot-password/',
  // Страницы инструктора
  instructorProfile: '/instructor-profile/',
  instructorLessons: '/lessons/',
  instructorSchedule: '/schedule/',
  instructorScheduleSettings: '/schedule/settings/',
  instructorStudents: '/students/',
  instructorLessonTypes: '/lesson-types/',
  instructorStats: '/stats/',
  instructorReviews: '/reviews/',
  // Страницы ученика
  studentProfile: '/my-profile/',
  studentDriverLicense: '/my-profile/', // Водительское удостоверение — секция в профиле
  studentLessons: '/my-lessons/',
  studentSchedule: '/my-schedule/',
  studentReviews: '/reviews/',
  // Страницы теоретических занятий
  theoryLessons: '/theory-lessons/',
  // Страницы экзаменов
  exams: '/exams/',
  // Отзывы
  myReviews: '/my-reviews/',
  // Поиск
  searchInstructors: '/instructors/',
  searchSchools: '/schools/',
  // Поддержка
  support: '/support/',
  supportNew: '/support/new/',
  // Чаты
  chats: '/chats/',
  // Панель владельца
  owner: '/owner/',
  ownerUsers: '/owner/users/',
  ownerSchools: '/owner/schools/',
  ownerTickets: '/owner/tickets/',
  ownerAudit: '/owner/audit/',
  ownerLegal: '/owner/legal/',
  // Юридические документы
  legalOffer: '/legal/offer/',
  legalPrivacy: '/legal/privacy/',
  // Школьный администратор
  schoolStudyGroups: '/school/study-groups/',
  schoolStudyGroupsNew: '/school/study-groups/new/',
  schoolTheoryTopics: '/school/theory-topics/',
  schoolTheoryTopicsNew: '/school/theory-topics/new/',
  schoolTheoryLessons: '/school/theory-lessons/',
  schoolTheoryLessonsNew: '/school/theory-lessons/new/',
  schoolStats: '/school/stats/',
  schoolReviews: '/school/reviews/',
  schoolSettings: '/school/settings/',
  schoolCourses: '/school/courses/',
  schoolProgress: '/school/progress/',
  // Связи ученик-инструктор (instructorStudents уже объявлен выше)
  instructorInvite: '/students/invite/',
  // Баланс
  studentBalance: '/balance/',
  // Настройки уведомлений
  settings: '/settings/',
  settingsNotifications: '/settings/notifications/',
  settingsProfile: '/settings/profile/',
  settingsSecurity: '/settings/security/',
  settingsCalendar: '/settings/calendar/',
  settingsConnectedAccounts: '/settings/connected-accounts/',
  // Транспортные средства инструктора
  vehicles: '/vehicles/',
  vehiclesCreate: '/vehicles/create/',
  // Заявки на зачисление
  enrollmentRequests: '/enrollment-requests/',
  myEnrollmentRequests: '/my-enrollment-requests/',
  // Дополнительные страницы ученика
  studentInstructors: '/my-instructors/',
  // Алиасы для мобильных тестов (используют общие страницы)
  lessons: '/my-lessons/',
  profile: '/my-profile/',
  schedule: '/my-schedule/',
  chat: '/chats/',
  // Phase 8: Интеграции для школ
  // URL с динамическим schoolId — используй schoolImport(id) и schoolSettingsById(id)
  // Auth flows (Iteration 3)
  resetPassword: '/reset-password/',
  onboarding: '/onboarding/',
  instructorOnboarding: '/instructor-onboarding/',
  // Owner Admin (Iteration 3)
  ownerPlans: '/owner/plans/',
  // Offline
  offline: '/offline/',
  // Owner Admin — API логи и Rate Limits (Iteration 4)
  ownerApiLogs: '/owner/api-logs/',
  ownerRateLimits: '/owner/rate-limits/',
  // Public Docs (Iteration 4)
  apiDocs: '/api-docs/',
  developers: '/developers/',
}

/**
 * Генератор URL для страницы импорта школы
 */
export function schoolImport(schoolId: string): string {
  return `/school/${schoolId}/import/`
}

/**
 * Генератор URL для страницы экспорта школы
 */
export function schoolExport(schoolId: string): string {
  return `/school/${schoolId}/export/`
}

/**
 * Генератор URL для страницы настроек школы
 */
export function schoolSettingsById(schoolId: string): string {
  return `/school/${schoolId}/settings/`
}

/**
 * Генератор URL для страницы филиалов школы
 */
export function schoolLocations(schoolId: string): string {
  return `/school/locations/${schoolId}/`
}

/**
 * Генератор URL для страницы курсов школы
 */
export function schoolCourses(schoolId: string): string {
  return `/school/courses/${schoolId}/`
}

/**
 * Генератор URL для страницы прогресса учеников школы
 */
export function schoolProgress(schoolId: string): string {
  return `/school/progress/${schoolId}/`
}

/**
 * Генератор URL для страницы статистики школы
 */
export function schoolStatsById(schoolId: string): string {
  return `/school/stats/${schoolId}/`
}

/**
 * Генератор URL для страницы тем теоретических занятий
 */
export function schoolTheoryTopicsById(schoolId: string): string {
  return `/school/theory-topics/${schoolId}/`
}

/**
 * Генератор URL для страницы учебных групп школы
 */
export function schoolStudyGroupsById(schoolId: string): string {
  return `/school/study-groups/${schoolId}/`
}

/**
 * Генератор URL для страницы расписания теории школы
 */
export function schoolTheoryLessonsById(schoolId: string): string {
  return `/school/theory-lessons/${schoolId}/`
}

/**
 * Генератор URL для страницы отзывов школы
 */
export function schoolReviewsById(schoolId: string): string {
  return `/school/reviews/${schoolId}/`
}

/**
 * Генератор URL для страницы партнёрств школы
 */
export function schoolPartnerships(schoolId: string): string {
  return `/school/partnerships/${schoolId}/`
}

/**
 * Генератор URL для страницы создания партнёрства
 */
export function schoolPartnershipsNew(schoolId: string): string {
  return `/school/partnerships/${schoolId}/new/`
}

/**
 * Генератор URL для страницы шаблонов договоров
 */
export function schoolContractTemplates(schoolId: string): string {
  return `/school/contracts/templates/${schoolId}/`
}

/**
 * Генератор URL для страницы создания шаблона договора
 */
export function schoolContractTemplatesNew(schoolId: string): string {
  return `/school/contracts/templates/${schoolId}/new/`
}

/**
 * Генератор URL для страницы редактирования шаблона договора
 */
export function schoolContractTemplateEdit(schoolId: string, templateId: string): string {
  return `/school/contracts/templates/${schoolId}/${templateId}/edit/`
}

/**
 * Генератор URL для страницы детализации шаблона договора
 */
export function schoolContractTemplateDetail(schoolId: string, templateId: string): string {
  return `/school/contracts/templates/${schoolId}/${templateId}/`
}

/**
 * Генератор URL для страницы цен типа занятия
 */
export function lessonTypePricing(lessonTypeId: string): string {
  return `/lesson-types/${lessonTypeId}/pricing/`
}

/**
 * Генератор URL для страницы посещаемости теоретического занятия
 */
export function theoryLessonAttendance(lessonId: string): string {
  return `/theory-lessons/${lessonId}/attendance/`
}

// === Iteration 5: Генераторы динамических URL ===

/**
 * Генераторы динамических URL для маршрутов с параметрами
 */
export const dynamicUrls = {
  /** Чат по ID */
  chatById: (id: string) => `/chats/${id}/`,
  /** Тикет поддержки по ID */
  supportById: (id: string) => `/support/${id}/`,
  /** Публичный профиль инструктора */
  instructorById: (id: string) => `/instructors/${id}/`,
  /** Публичная страница школы */
  schoolById: (id: string) => `/schools/${id}/`,
  /** Приглашение ученика к инструктору */
  joinInstructor: (token: string) => `/join-instructor/${token}/`,
  /** Присоединение к школе */
  joinSchool: (token: string) => `/join-school/${token}/`,
  /** Редактирование транспортного средства */
  vehicleEdit: (id: string) => `/vehicles/${id}/edit/`,
  /** Страница создания цены для типа занятия */
  lessonTypePricingNew: (lessonTypeId: string) => `/lesson-types/${lessonTypeId}/pricing/new/`,
}

/** Дополнительные статические URL (Iteration 5) */
export const urlsExtended = {
  /** Страница успеха приглашения */
  studentsInviteSuccess: '/students/invite/success/',
  /** Создание школы */
  schoolCreate: '/school/create/',
  /** Редактирование типа занятия (шаблон) */
  lessonTypesEdit: '/lesson-types/edit/',
}
