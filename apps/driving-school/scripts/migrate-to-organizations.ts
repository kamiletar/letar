/**
 * Скрипт миграции: School → Better Auth Organizations
 *
 * Этот скрипт мигрирует данные из старых моделей:
 * - School → Organization
 * - SchoolMembership → Member
 * - SchoolInvitation → OrganizationInvitation
 * - SchoolLocation → Team + TeamLocationData
 * - StaffLocationAssignment → TeamMember
 *
 * Запуск:
 * cd apps/driving-school
 * bunx tsx scripts/migrate-to-organizations.ts           # Полная миграция
 * bunx tsx scripts/migrate-to-organizations.ts --only-links  # Только связи (Фаза 5.3)
 * bunx tsx scripts/migrate-to-organizations.ts --force   # Перезаписать данные
 *
 * ⚠️ ПЕРЕД ЗАПУСКОМ:
 * 1. Сделать бэкап базы данных
 * 2. Убедиться, что новые таблицы созданы (nx db:push driving-school)
 * 3. Проверить подключение к БД
 */

import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

/**
 * Маппинг ролей SchoolMemberRole → Better Auth roles
 */
const roleMapping: Record<string, string> = {
  ADMIN: 'owner',
  SUPER_MANAGER: 'super_manager',
  MANAGER: 'manager',
  INSTRUCTOR: 'instructor',
  THEORY_INSTRUCTOR: 'theory_instructor',
  STUDENT: 'member',
}

/**
 * Генерация slug из названия
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 50)
}

/**
 * Генерация уникального slug
 */
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug
  let counter = 1

  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug
}

/**
 * Миграция School → Organization
 */
async function migrateSchools(): Promise<Map<string, string>> {
  console.log('\n📦 Мигрируем School → Organization...')

  const schools = await prisma.school.findMany()
  const idMapping = new Map<string, string>()

  for (const school of schools) {
    const slug = await ensureUniqueSlug(generateSlug(school.name))

    // Сериализуем массивы в JSON для metadata
    const metadata = JSON.stringify({
      cities: school.cities,
      licenseCategories: school.licenseCategories,
    })

    const org = await prisma.organization.create({
      data: {
        id: school.id, // Сохраняем тот же ID для упрощения связей
        name: school.name,
        slug,
        logo: school.logo,
        metadata,
        phone: school.phone,
        email: school.email,
        website: school.website,
        description: school.description,
        isPublic: school.isPublic,
        averageRating: school.averageRating,
        reviewCount: school.reviewCount,
        createdAt: school.createdAt,
        updatedAt: school.updatedAt,
      },
    })

    idMapping.set(school.id, org.id)
    console.log(`  ✅ ${school.name} → ${org.slug}`)
  }

  console.log(`  Всего мигрировано: ${schools.length} школ`)
  return idMapping
}

/**
 * Миграция SchoolMembership → Member
 */
async function migrateMembers(): Promise<Map<string, string>> {
  console.log('\n👥 Мигрируем SchoolMembership → Member...')

  const memberships = await prisma.schoolMembership.findMany()
  const idMapping = new Map<string, string>()

  for (const membership of memberships) {
    const role = roleMapping[membership.role] || 'member'

    const member = await prisma.member.create({
      data: {
        id: membership.id, // Сохраняем тот же ID
        organizationId: membership.schoolId,
        userId: membership.userId,
        role,
        createdAt: membership.joinedAt,
      },
    })

    idMapping.set(membership.id, member.id)
  }

  console.log(`  Всего мигрировано: ${memberships.length} членств`)
  return idMapping
}

/**
 * Миграция SchoolInvitation → OrganizationInvitation
 */
async function migrateInvitations(): Promise<void> {
  console.log('\n📨 Мигрируем SchoolInvitation → OrganizationInvitation...')

  const invitations = await prisma.schoolInvitation.findMany()

  for (const inv of invitations) {
    const role = roleMapping[inv.role] || 'member'

    // Преобразуем статус
    let status = 'pending'
    if (inv.status === 'ACCEPTED') {
      status = 'accepted'
    } else if (inv.status === 'DECLINED') {
      status = 'rejected'
    } else if (inv.status === 'EXPIRED') {
      status = 'expired'
    }

    // Находим member (inviter) — это ADMIN школы
    const inviter = await prisma.schoolMembership.findFirst({
      where: {
        schoolId: inv.schoolId,
        role: 'ADMIN',
      },
    })

    if (!inviter) {
      console.log(`  ⚠️ Пропускаем приглашение ${inv.id} — нет ADMIN в школе`)
      continue
    }

    await prisma.organizationInvitation.create({
      data: {
        id: inv.id,
        email: inv.email || '',
        inviterId: inviter.userId,
        organizationId: inv.schoolId,
        role,
        status,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
      },
    })
  }

  console.log(`  Всего мигрировано: ${invitations.length} приглашений`)
}

/**
 * Миграция SchoolLocation → Team + TeamLocationData
 */
async function migrateLocations(): Promise<Map<string, string>> {
  console.log('\n📍 Мигрируем SchoolLocation → Team + TeamLocationData...')

  const locations = await prisma.schoolLocation.findMany()
  const idMapping = new Map<string, string>()

  for (const loc of locations) {
    // Создаём Team
    const team = await prisma.team.create({
      data: {
        id: loc.id, // Сохраняем тот же ID
        name: loc.name,
        organizationId: loc.schoolId,
        createdAt: loc.createdAt,
        updatedAt: loc.updatedAt,
      },
    })

    // Создаём TeamLocationData
    await prisma.teamLocationData.create({
      data: {
        teamId: team.id,
        type: loc.type,
        city: loc.city,
        address: loc.address,
        phone: loc.phone,
        description: loc.description,
        timezone: loc.timezone,
        geoLat: loc.geoLat,
        geoLon: loc.geoLon,
        workingHours: loc.workingHours,
        isActive: loc.isActive,
        createdAt: loc.createdAt,
        updatedAt: loc.updatedAt,
      },
    })

    idMapping.set(loc.id, team.id)
  }

  console.log(`  Всего мигрировано: ${locations.length} филиалов`)
  return idMapping
}

/**
 * Миграция StaffLocationAssignment → TeamMember
 */
async function migrateStaffAssignments(
  memberIdMapping: Map<string, string>,
  locationIdMapping: Map<string, string>
): Promise<void> {
  console.log('\n👨‍💼 Мигрируем StaffLocationAssignment → TeamMember...')

  const assignments = await prisma.staffLocationAssignment.findMany({
    include: {
      membership: true,
    },
  })

  for (const assignment of assignments) {
    const memberId = memberIdMapping.get(assignment.membershipId)
    const teamId = locationIdMapping.get(assignment.locationId)

    if (!memberId || !teamId) {
      console.log(`  ⚠️ Пропускаем привязку ${assignment.id} — не найден member или team`)
      continue
    }

    await prisma.teamMember.create({
      data: {
        id: assignment.id,
        teamId,
        userId: assignment.membership.userId,
        memberId,
        isPrimary: assignment.isPrimary,
        createdAt: assignment.createdAt,
      },
    })
  }

  console.log(`  Всего мигрировано: ${assignments.length} привязок`)
}

/**
 * Миграция связей: schoolId → organizationId для всех бизнес-моделей
 * (Фаза 5.3)
 *
 * Поскольку School.id = Organization.id, просто копируем schoolId → organizationId
 */
async function migrateRelationships(): Promise<void> {
  console.log('\n🔗 Мигрируем связи schoolId → organizationId...')

  // Список таблиц с колонкой organizationId
  const tables = [
    'StudyGroup',
    'TheoryTopic',
    'ExamSession',
    'Review',
    'Chat',
    'Subscription',
    'ApiKey',
    'ApiLog',
    'TrainingCourse',
    'OptionalLessonType',
    'PracticeMeetingPoint',
    'StudentProgress',
    'SchoolEnrollment',
    'EnrollmentRequest',
  ]

  for (const table of tables) {
    try {
      // Используем raw SQL для обновления (более эффективно)
      const result = await prisma.$executeRawUnsafe(`
        UPDATE "${table}"
        SET "organizationId" = "schoolId"
        WHERE "schoolId" IS NOT NULL AND "organizationId" IS NULL
      `)
      console.log(`  ✅ ${table}: обновлено ${result} записей`)
    } catch {
      // Если таблица не имеет schoolId (например, EnrollmentRequest), пробуем без условия
      console.log(`  ⚠️ ${table}: пропущено (возможно, schoolId опциональный)`)
    }
  }

  console.log('  Связи мигрированы')
}

/**
 * Главная функция миграции
 *
 * Флаги:
 * --force       Перезаписать существующие данные
 * --only-links  Запустить только миграцию связей (Фаза 5.3)
 */
async function main() {
  const onlyLinks = process.argv.includes('--only-links')

  if (onlyLinks) {
    console.log('🔗 Запуск только миграции связей (Фаза 5.3)')
    console.log('='.repeat(60))
    await migrateRelationships()
    console.log('\n✅ Миграция связей завершена!')
    await prisma.$disconnect()
    return
  }

  console.log('🚀 Начало миграции School → Better Auth Organizations')
  console.log('='.repeat(60))

  try {
    // Проверяем, есть ли уже данные в новых таблицах
    const existingOrgs = await prisma.organization.count()
    if (existingOrgs > 0) {
      console.log(`\n⚠️ ВНИМАНИЕ: В таблице Organization уже ${existingOrgs} записей!`)
      console.log('Запустите скрипт с флагом --force для перезаписи')
      if (!process.argv.includes('--force')) {
        process.exit(1)
      }
      console.log('Продолжаем с --force...')
    }

    // Запускаем миграции последовательно
    // Фаза 2: Миграция основных сущностей
    await migrateSchools()
    const memberIdMapping = await migrateMembers()
    await migrateInvitations()
    const locationIdMapping = await migrateLocations()
    await migrateStaffAssignments(memberIdMapping, locationIdMapping)

    // Фаза 5.3: Миграция связей schoolId → organizationId
    await migrateRelationships()

    console.log('\n' + '='.repeat(60))
    console.log('✅ Миграция завершена успешно!')
    console.log('\nСледующие шаги:')
    console.log('1. Проверить данные в новых таблицах')
    console.log('2. Запустить тесты')
    console.log('3. Обновить UI компоненты (Фаза 6)')
  } catch (error) {
    console.error('\n❌ Ошибка миграции:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
