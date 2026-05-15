/**
 * Хелперы для работы с базой данных в E2E тестах
 *
 * ВАЖНО: Используем динамический импорт PrismaClient,
 * чтобы избежать проблем с ESM/CommonJS
 */
import { hash } from 'bcryptjs'
import { config } from 'dotenv'
import { resolve } from 'path'

// Загружаем переменные окружения напрямую через dotenv
// @next/env не работает корректно в контексте Playwright globalSetup
const projectDir = resolve(__dirname, '../../../driving-school')
config({ path: resolve(projectDir, '.env.local') })
config({ path: resolve(projectDir, '.env') })

type PrismaClientType = import('@prisma/client').PrismaClient

type UserRoleType = import('../../../driving-school/src/generated/prisma/index.js').UserRole

let prisma: PrismaClientType | null = null
let UserRole: typeof import('../../../driving-school/src/generated/prisma/index.js').UserRole | null = null

/**
 * Получить инстанс Prisma Client и UserRole enum
 *
 * Prisma 7+ генерирует ESM-only client.ts (import.meta.url),
 * Playwright транспилирует TS в CJS → import.meta.url ломается.
 * Используем CJS wrapper, который обходит client.ts напрямую.
 */
async function getPrisma(): Promise<PrismaClientType> {
  if (!prisma) {
    // CJS wrapper: обходит ESM-only client.ts, создаёт PrismaClient с PrismaPg adapter
    const prismaModule = require('./prisma-cjs-wrapper')
    prisma = prismaModule.createPrismaClient()
    UserRole = prismaModule.UserRole
  }
  return prisma
}

/**
 * Преобразование строковых ролей в enum UserRole
 */
function toUserRoles(roles: string[]): UserRoleType[] {
  if (!UserRole) throw new Error('UserRole enum not loaded')
  return roles.map((role) => UserRole![role as keyof typeof UserRole]) as UserRoleType[]
}

/**
 * Активация email пользователя (установка emailVerified)
 */
export async function activateUser(email: string) {
  const db = await getPrisma()
  await db.user.update({
    where: { email },
    data: { emailVerified: true },
  })
}

/**
 * Создание тестового пользователя напрямую в БД
 *
 * Используется в globalSetup для предсоздания пользователей
 * перед параллельным запуском auth setup тестов.
 *
 * Пароль хешируется через bcrypt (как в register.action.ts).
 */
export async function createTestUser(data: { email: string; password: string; name: string; roles?: string[] }) {
  const db = await getPrisma()

  // Проверяем существование
  const existing = await db.user.findUnique({ where: { email: data.email } })
  const roles = toUserRoles(data.roles || ['USER'])

  if (existing) {
    // Обновляем существующего пользователя (на случай изменения пароля)
    const hashedPassword = await hash(data.password, 12)
    const user = await db.user.update({
      where: { email: data.email },
      data: {
        name: data.name,
        hashedPassword,
        emailVerified: true,
        // Для update используем set для массивов enum
        roles: { set: roles },
        isOnboardingComplete: true,
      },
    })

    // Создаём/обновляем Account для Better Auth credential auth
    // Better Auth использует providerId и accountId (не provider/providerAccountId!)
    // accountId = email для credential auth
    const account = await db.account.upsert({
      where: {
        providerId_accountId: {
          providerId: 'credential',
          accountId: data.email,
        },
      },
      update: { password: hashedPassword },
      create: {
        userId: user.id,
        providerId: 'credential',
        accountId: data.email,
        password: hashedPassword,
      },
    })
    console.log(`  ✓ Account upserted for ${data.email}: ${account.id}`)

    return user
  }

  // Хешируем пароль как в register.action.ts
  const hashedPassword = await hash(data.password, 12)

  // Создаём верифицированного пользователя
  const user = await db.user.create({
    data: {
      email: data.email,
      name: data.name,
      hashedPassword,
      emailVerified: true, // Сразу верифицирован
      roles,
      isOnboardingComplete: true,
    },
  })

  // Создаём Account для Better Auth credential auth
  // Better Auth использует providerId и accountId (не provider/providerAccountId!)
  // accountId = email для credential auth
  const account = await db.account.create({
    data: {
      userId: user.id,
      providerId: 'credential',
      accountId: data.email,
      password: hashedPassword,
    },
  })
  console.log(`  ✓ Account created for ${data.email}: ${account.id}`)

  return user
}

/**
 * Проверка существования пользователя
 */
export async function userExists(email: string): Promise<boolean> {
  const db = await getPrisma()
  const user = await db.user.findUnique({ where: { email } })
  return user !== null
}

/**
 * Получение пользователя по email
 */
export async function getUser(email: string) {
  const db = await getPrisma()
  return db.user.findUnique({ where: { email } })
}

/**
 * Удаление тестовых пользователей (с email @e2e-test.local или @test.local)
 */
export async function deleteTestUsers() {
  const db = await getPrisma()
  await db.user.deleteMany({
    where: {
      OR: [{ email: { contains: '@e2e-test.local' } }, { email: { contains: '@test.local' } }],
    },
  })
}

/**
 * Создание профиля ученика (если его нет)
 */
export async function ensureStudentProfile(email: string) {
  const db = await getPrisma()
  const user = await db.user.findUnique({
    where: { email },
    include: { studentProfile: true },
  })

  if (!user) {
    throw new Error(`User not found: ${email}`)
  }

  if (user.studentProfile) {
    return user.studentProfile
  }

  // Создаём профиль ученика
  return db.studentProfile.create({
    data: {
      userId: user.id,
      preferredAreas: ['Центр', 'Запад'],
      noteForInstructor: 'E2E тестовый ученик',
    },
  })
}

/**
 * Создание профиля инструктора (если его нет)
 */
export async function ensureInstructorProfile(email: string) {
  const db = await getPrisma()
  const user = await db.user.findUnique({
    where: { email },
    include: { instructorProfile: true },
  })

  if (!user) {
    throw new Error(`User not found: ${email}`)
  }

  if (user.instructorProfile) {
    return user.instructorProfile
  }

  // Создаём профиль инструктора
  // Имя берётся из User.name, не дублируется в InstructorProfile
  return db.instructorProfile.create({
    data: {
      userId: user.id,
      bio: 'E2E Test Instructor',
      experienceStartDate: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000), // 5 лет назад
      licenseCategories: ['B'],
    },
  })
}

/**
 * Создание организации (школы) и назначение пользователя владельцем
 *
 * В новой схеме:
 * - School переименован в Organization
 * - SchoolMembership переименован в Member
 * - Роль владельца: 'owner'
 */
export async function ensureSchoolAdmin(email: string) {
  const db = await getPrisma()
  const user = await db.user.findUnique({
    where: { email },
    include: { organizationMembers: true },
  })

  if (!user) {
    throw new Error(`User not found: ${email}`)
  }

  // Проверяем, есть ли уже организация
  if (user.organizationMembers.length > 0) {
    const existingMember = user.organizationMembers[0]

    // Если роль уже 'owner' - ничего не делаем
    if (existingMember.role === 'owner') {
      return existingMember
    }

    // Обновляем роль до 'owner' для school admin тестов
    return db.member.update({
      where: {
        organizationId_userId: {
          organizationId: existingMember.organizationId,
          userId: user.id,
        },
      },
      data: { role: 'owner' },
    })
  }

  // Создаём организацию (школу)
  const organization = await db.organization.create({
    data: {
      name: 'E2E Тестовая Автошкола',
      slug: `e2e-test-school-${Date.now()}`,
      description: 'Автошкола для E2E тестов',
      isPublic: true,
    },
  })

  // Создаём членство с ролью owner
  return db.member.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      role: 'owner',
    },
  })
}

/**
 * Назначение пользователя владельцем платформы (роль OWNER)
 */
export async function ensureOwnerRole(email: string) {
  const db = await getPrisma()
  const user = await db.user.findUnique({
    where: { email },
  })

  if (!user) {
    throw new Error(`User not found: ${email}`)
  }

  // Проверяем, есть ли уже роль OWNER
  if (user.roles.includes('OWNER')) {
    return user
  }

  // Добавляем роль OWNER
  return db.user.update({
    where: { email },
    data: {
      roles: { push: 'OWNER' },
    },
  })
}

/**
 * Получение organizationId для школьного администратора по email
 * Возвращает ID первой организации, где пользователь является членом
 */
export async function getSchoolIdForAdmin(email: string): Promise<string | null> {
  const db = await getPrisma()
  const user = await db.user.findUnique({
    where: { email },
    include: { organizationMembers: { include: { organization: true } } },
  })

  if (!user || user.organizationMembers.length === 0) {
    return null
  }

  // Возвращаем ID первой организации
  return user.organizationMembers[0].organizationId
}

/**
 * Создание тестовой экзаменационной сессии для школы
 *
 * Создаёт ExamSession для тестирования страницы экзаменов.
 * Возвращает ID созданной сессии.
 */
export async function ensureExamSession(adminEmail: string): Promise<string | null> {
  const db = await getPrisma()

  // Получаем организацию через администратора
  const user = await db.user.findUnique({
    where: { email: adminEmail },
    include: { organizationMembers: true },
  })

  if (!user || user.organizationMembers.length === 0) {
    console.error(`  ✗ No organization found for ${adminEmail}`)
    return null
  }

  const organizationId = user.organizationMembers[0].organizationId

  // Проверяем существующую сессию
  const existing = await db.examSession.findFirst({
    where: {
      organizationId,
      type: 'INTERNAL_PRACTICE',
    },
  })

  if (existing) {
    console.log(`  ✓ ExamSession already exists: ${existing.id}`)
    return existing.id
  }

  // Создаём новую сессию — через неделю от текущей даты
  const scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const session = await db.examSession.create({
    data: {
      organizationId,
      type: 'INTERNAL_PRACTICE',
      category: 'B',
      scheduledAt,
      location: 'Тестовый полигон',
      maxStudents: 10,
      status: 'SCHEDULED',
    },
  })

  console.log(`  ✓ ExamSession created: ${session.id}`)
  return session.id
}

/**
 * Создание публичного инструктора для поиска
 *
 * Обновляет профиль инструктора, делая его публичным и доступным
 * для поиска в каталоге инструкторов.
 */
export async function ensureSearchableInstructor(email: string) {
  const db = await getPrisma()
  const user = await db.user.findUnique({
    where: { email },
    include: { instructorProfile: true },
  })

  if (!user) {
    throw new Error(`User not found: ${email}`)
  }

  if (!user.instructorProfile) {
    throw new Error(`Instructor profile not found for ${email}`)
  }

  // Обновляем профиль для публичного поиска
  const profile = await db.instructorProfile.update({
    where: { id: user.instructorProfile.id },
    data: {
      isPublic: true,
      bio: 'Опытный инструктор для E2E тестов поиска',
      experienceStartDate: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000), // 5 лет опыта
      licenseCategories: ['B', 'A'],
      workingAreas: [{ cityId: 'moscow', cityName: 'Москва', districts: ['*'] }],
    },
  })

  console.log(`  ✓ Instructor ${email} is now searchable (isPublic: true)`)
  return profile
}

/**
 * Создание тестового курса обучения для школы
 *
 * Создаёт TrainingCourse для тестирования страницы курсов,
 * зачислений и полного цикла обучения.
 */
export async function ensureTrainingCourse(adminEmail: string) {
  const db = await getPrisma()
  const schoolId = await getSchoolIdForAdmin(adminEmail)
  if (!schoolId) throw new Error(`School not found for ${adminEmail}`)

  const existing = await db.trainingCourse.findFirst({
    where: { organizationId: schoolId },
  })
  if (existing) {
    console.log(`  ✓ TrainingCourse already exists: ${existing.id}`)
    return existing
  }

  const course = await db.trainingCourse.create({
    data: {
      organizationId: schoolId,
      name: 'Категория B — Стандарт',
      category: 'B',
      transmissionType: 'MANUAL',
      practiceLessons: 28,
      lessonDuration: 90,
      theoryFormat: 'CLASSROOM',
      theoryHours: 130,
      price: 45000,
      isActive: true,
    },
  })

  console.log(`  ✓ TrainingCourse created: ${course.id}`)
  return course
}

/**
 * Зачисление тестового ученика в школу
 *
 * Создаёт StudentProgress для тестирования страницы прогресса,
 * зачислений и полного цикла обучения.
 */
export async function ensureStudentProgress(studentEmail: string, adminEmail: string) {
  const db = await getPrisma()
  const schoolId = await getSchoolIdForAdmin(adminEmail)
  const student = await db.user.findUnique({ where: { email: studentEmail } })
  if (!schoolId || !student) throw new Error(`Missing school or student for ${studentEmail}/${adminEmail}`)

  const existing = await db.studentProgress.findFirst({
    where: { userId: student.id, organizationId: schoolId },
  })
  if (existing) {
    console.log(`  ✓ StudentProgress already exists: ${existing.id}`)
    return existing
  }

  const progress = await db.studentProgress.create({
    data: {
      userId: student.id,
      organizationId: schoolId,
      status: 'ACTIVE',
      documentsStatus: 'NOT_STARTED',
    },
  })

  console.log(`  ✓ StudentProgress created: ${progress.id}`)
  return progress
}

/**
 * Удалить все API-ключи для организации (для очистки перед тестами)
 */
export async function deleteAllApiKeys(organizationId: string) {
  const db = await getPrisma()
  const result = await db.apiKey.deleteMany({
    where: { organizationId },
  })
  console.log(`  ✓ Deleted ${result.count} API keys for organization ${organizationId}`)
  return result.count
}

/**
 * Создание второй тестовой школы для тестов партнёрств
 * Возвращает ID созданной/существующей школы
 */
export async function ensureSecondSchool(): Promise<string> {
  const db = await getPrisma()

  // Проверяем существующую школу
  const existing = await db.organization.findFirst({
    where: { slug: 'e2e-partner-school' },
  })

  if (existing) {
    console.log(`  ✓ Second school already exists: ${existing.id}`)
    return existing.id
  }

  // Создаём вторую тестовую школу
  const school = await db.organization.create({
    data: {
      name: 'E2E Партнёрская Автошкола',
      slug: 'e2e-partner-school',
      description: 'Вторая автошкола для тестирования партнёрств',
      isPublic: true,
    },
  })

  console.log(`  ✓ Second school created: ${school.id}`)
  return school.id
}

/**
 * Создание партнёрства между двумя школами
 * Возвращает ID созданного партнёрства
 */
export async function createPartnership(data: {
  initiatorOrgId: string
  partnerOrgId: string
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED'
  terms?: string
}): Promise<string> {
  const db = await getPrisma()

  // Проверяем существующее партнёрство
  const existing = await db.schoolPartnership.findFirst({
    where: {
      OR: [
        {
          initiatorOrganizationId: data.initiatorOrgId,
          partnerOrganizationId: data.partnerOrgId,
        },
        {
          initiatorOrganizationId: data.partnerOrgId,
          partnerOrganizationId: data.initiatorOrgId,
        },
      ],
    },
  })

  if (existing) {
    console.log(`  ✓ Partnership already exists: ${existing.id}`)
    return existing.id
  }

  // Создаём партнёрство
  const partnership = await db.schoolPartnership.create({
    data: {
      initiatorOrganizationId: data.initiatorOrgId,
      partnerOrganizationId: data.partnerOrgId,
      status: data.status,
      terms: data.terms || 'Тестовые условия партнёрства для E2E тестов',
    },
  })

  console.log(`  ✓ Partnership created: ${partnership.id} (status: ${data.status})`)
  return partnership.id
}

/**
 * Создание партнёрства в конкретном статусе для тестов
 */
export async function ensurePartnershipInState(
  initiatorEmail: string,
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED'
): Promise<string> {
  // Получаем ID школ
  const initiatorSchoolId = await getSchoolIdForAdmin(initiatorEmail)
  if (!initiatorSchoolId) {
    throw new Error(`School not found for ${initiatorEmail}`)
  }

  // Создаём вторую школу
  const partnerSchoolId = await ensureSecondSchool()

  // Создаём партнёрство
  return createPartnership({
    initiatorOrgId: initiatorSchoolId,
    partnerOrgId: partnerSchoolId,
    status,
    terms: `Тестовое партнёрство в статусе ${status}`,
  })
}

/**
 * Удаление всех тестовых партнёрств
 */
export async function deleteTestPartnerships() {
  const db = await getPrisma()

  // Удаляем все партнёрства тестовых школ
  const result = await db.schoolPartnership.deleteMany({
    where: {
      OR: [
        { initiatorOrganization: { slug: { contains: 'e2e-' } } },
        { partnerOrganization: { slug: { contains: 'e2e-' } } },
      ],
    },
  })

  console.log(`  ✓ Deleted ${result.count} test partnerships`)
  return result.count
}

/**
 * Закрытие соединения с БД
 */
export async function disconnectDb() {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}
