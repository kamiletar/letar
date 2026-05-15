/**
 * Глобальный setup для E2E тестов
 *
 * Выполняется один раз перед всеми тестами.
 * 1. Создаёт тестовых пользователей напрямую в БД
 * 2. Логинит пользователей и сохраняет storage state
 */
import { chromium, type FullConfig } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { testInstructor, testOwner, testSchoolAdmin, testStudent, urls } from './fixtures/test-data'
import {
  createTestUser,
  disconnectDb,
  ensureExamSession,
  ensureInstructorProfile,
  ensureOwnerRole,
  ensureSchoolAdmin,
  ensureSearchableInstructor,
  ensureStudentProfile,
  ensureStudentProgress,
  ensureTrainingCourse,
  getSchoolIdForAdmin,
} from './helpers/db.helpers'

// Пути к storage state файлам
// ВАЖНО: Playwright разрешает test.use({ storageState }) относительно CWD,
// а config.use({ storageState }) — относительно configDir.
// При запуске через Nx CWD = workspace root, а configDir = apps/driving-school-e2e/.
// Пишем в ОБЕ локации чтобы оба механизма работали.
const E2E_ROOT = resolve(__dirname, '..')

/**
 * Возвращает массив путей для записи storageState:
 * - configDir (для проектов с storageState в config)
 * - CWD (для test.use({ storageState: 'playwright/.auth/...' }))
 */
function storagePaths(filename: string): string[] {
  const configDirPath = resolve(E2E_ROOT, `playwright/.auth/${filename}`)
  const cwdPath = resolve(process.cwd(), `playwright/.auth/${filename}`)
  // Если CWD совпадает с configDir, не дублируем
  if (configDirPath === cwdPath) return [configDirPath]
  return [configDirPath, cwdPath]
}

const INSTRUCTOR_PATHS = storagePaths('instructor.json')
const STUDENT_PATHS = storagePaths('student.json')
const SCHOOL_ADMIN_PATHS = storagePaths('school-admin.json')
const OWNER_PATHS = storagePaths('owner.json')

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3003'

/**
 * Логин пользователя и сохранение storage state
 *
 * Увеличенные таймауты для стабильности:
 * - goto: 45s (cold start dev server)
 * - waitForSelector: 25s (React hydration)
 * - waitForURL: 45s (auth redirect)
 */
async function loginAndSaveState(
  email: string,
  password: string,
  storagePaths: string[],
  label: string,
  setActiveOrganization = false
) {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Переход на страницу входа (увеличен таймаут для cold start)
    await page.goto(`${BASE_URL}${urls.signIn}`, { timeout: 45_000 })

    // Ждём загрузки формы (увеличен таймаут для React hydration)
    await page.waitForSelector('text=Вход', { timeout: 25_000 })

    // Заполняем форму
    await page.getByPlaceholder('example@mail.com').fill(email)
    await page.getByPlaceholder('Введите пароль').fill(password)

    // Отправляем форму
    await page.getByRole('button', { name: /войти/i }).click()

    // Ждём успешного входа (редирект на dashboard или onboarding)
    await page.waitForURL(/dashboard|onboarding/, { timeout: 45_000 })

    // Для school admin устанавливаем активную организацию
    if (setActiveOrganization) {
      // Получаем organizationId через Better Auth API
      const schoolId = await getSchoolIdForAdmin(email)
      if (schoolId) {
        // Вызываем Better Auth API для установки активной организации
        const status = await page.evaluate(async (orgId) => {
          const res = await fetch('/api/auth/organization/set-active', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ organizationId: orgId }),
            credentials: 'include',
          })
          return res.status
        }, schoolId)
        console.log(`  ✓ Active organization set: ${schoolId} (status: ${status})`)

        // Перезагружаем чтобы cookie от set-active обновились в контексте
        await page.reload({ waitUntil: 'domcontentloaded' })
      }
    }

    // Сохраняем storage state во все целевые пути
    for (const sp of storagePaths) {
      const dir = resolve(sp, '..')
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      await context.storageState({ path: sp })

      // Продлеваем HTTP expiry session_data cookie.
      // Better Auth устанавливает короткий TTL, и cookie может истечь к запуску тестов.
      // ВАЖНО: НЕ модифицируем payload (value) — это инвалидирует signature.
      const state = JSON.parse(readFileSync(sp, 'utf8'))
      const sessionTokenCookie = state.cookies.find((c: { name: string }) => c.name === 'better-auth.session_token')
      const sessionDataCookie = state.cookies.find((c: { name: string }) => c.name === 'better-auth.session_data')
      if (sessionDataCookie && sessionTokenCookie) {
        sessionDataCookie.expires = sessionTokenCookie.expires
        writeFileSync(sp, JSON.stringify(state))
      }
    }
    console.log(`  ✓ ${label} logged in (${storagePaths.length} paths)`)
  } catch (error) {
    console.error(`  ✗ ${label} login failed:`, error)
    throw error
  } finally {
    await browser.close()
  }
}

export default async function globalSetup(config: FullConfig) {
  console.log('🔧 [globalSetup] Creating test users...')

  try {
    // === Шаг 1: Создаём пользователей в БД ===
    await Promise.all([
      createTestUser({
        email: testInstructor.email,
        password: testInstructor.password,
        name: testInstructor.name,
        roles: ['USER', 'FREELANCE_INSTRUCTOR'],
      }),
      createTestUser({
        email: testStudent.email,
        password: testStudent.password,
        name: testStudent.name,
        roles: ['USER'],
      }),
      createTestUser({
        email: testSchoolAdmin.email,
        password: testSchoolAdmin.password,
        name: testSchoolAdmin.name,
        roles: ['USER', 'FREELANCE_INSTRUCTOR'],
      }),
      createTestUser({
        email: testOwner.email,
        password: testOwner.password,
        name: testOwner.name,
        roles: ['USER', 'FREELANCE_INSTRUCTOR', 'OWNER'],
      }),
    ])

    console.log('✅ [globalSetup] Users created')

    // Создаём профили и роли
    await ensureInstructorProfile(testInstructor.email)
    console.log('✅ [globalSetup] Instructor profile created')

    await ensureStudentProfile(testStudent.email)
    console.log('✅ [globalSetup] Student profile created')

    await ensureSchoolAdmin(testSchoolAdmin.email)
    console.log('✅ [globalSetup] School admin setup complete')

    // Создаём тестовую экзаменационную сессию для тестов экзаменов
    await ensureExamSession(testSchoolAdmin.email)
    console.log('✅ [globalSetup] Exam session created')

    // Создаём курс обучения для тестов journeys (школьные курсы, зачисления)
    await ensureTrainingCourse(testSchoolAdmin.email)
    console.log('✅ [globalSetup] Training course created')

    // Зачисляем ученика в школу для тестов journeys (прогресс, полный цикл)
    await ensureStudentProgress(testStudent.email, testSchoolAdmin.email)
    console.log('✅ [globalSetup] Student enrolled in school')

    // Делаем инструктора публичным для поиска в каталоге
    await ensureSearchableInstructor(testInstructor.email)
    console.log('✅ [globalSetup] Instructor made searchable')

    await ensureOwnerRole(testOwner.email)
    console.log('✅ [globalSetup] Owner role assigned')

    // Сохраняем schoolId в файл для тестов, которым нужны динамические URL
    const schoolId = await getSchoolIdForAdmin(testSchoolAdmin.email)
    if (schoolId) {
      const schoolDataPaths = storagePaths('school-data.json')
      for (const sp of schoolDataPaths) {
        const dir = resolve(sp, '..')
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
        writeFileSync(sp, JSON.stringify({ schoolId }))
      }
      console.log(`✅ [globalSetup] School data saved: ${schoolId}`)
    }

    // Закрываем соединение с БД перед логином
    await disconnectDb()

    // === Шаг 2: Логин и сохранение storage state ===
    console.log('🔑 [globalSetup] Logging in users...')

    // Логинимся последовательно чтобы не перегружать dev сервер
    await loginAndSaveState(testInstructor.email, testInstructor.password, INSTRUCTOR_PATHS, 'Instructor')

    await loginAndSaveState(testStudent.email, testStudent.password, STUDENT_PATHS, 'Student')

    await loginAndSaveState(testSchoolAdmin.email, testSchoolAdmin.password, SCHOOL_ADMIN_PATHS, 'School Admin', true)

    await loginAndSaveState(testOwner.email, testOwner.password, OWNER_PATHS, 'Owner')

    console.log('✅ [globalSetup] All users logged in and storage state saved')
  } catch (error) {
    console.error('❌ [globalSetup] Error:', error)
    throw error
  }
}
