'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import {
  type ColumnMapping,
  type ImportDataType,
  type ImportOptions,
  type ImportResult,
  type ImportRow,
  type InstructorImportRow,
  parseImportData,
  type StudentImportRow,
} from '@/lib/excel'
import type { UserRole } from '@letar/driving-school-db/prisma'
import { revalidatePath } from 'next/cache'

// Проверка прав доступа к школе
async function checkSchoolAccess(schoolId: string, userId: string, user: { id: string; roles: UserRole[] }) {
  const db = getEnhancedPrisma(user)
  const membership = await db.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: schoolId,
        userId,
      },
    },
  })

  if (!membership) {
    return { success: false as const, error: 'NOT_MEMBER' }
  }

  // Только owner, super_manager и manager могут импортировать
  if (!['owner', 'super_manager', 'manager'].includes(membership.role)) {
    return { success: false as const, error: 'NOT_AUTHORIZED' }
  }

  return { success: true as const, role: membership.role }
}

// Максимальное количество строк для импорта за раз
const MAX_IMPORT_ROWS = 500

// Импорт учеников
// Оптимизация: batch lookup пользователей и членств (2 запроса вместо 2N)
// createMany не подходит для creates из-за nested relations и conditional логики
async function importStudents(
  schoolId: string,
  rows: Array<{ data: StudentImportRow; isValid: boolean; rowIndex: number }>,
  options: ImportOptions,
  user: { id: string; roles: UserRole[] }
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  const db = getEnhancedPrisma(user)

  // Фильтруем валидные строки
  const validRows = rows.filter((row) => {
    if (!row.isValid) {
      if (options.skipErrors) {
        result.skipped++
      } else {
        result.errors.push({ rowIndex: row.rowIndex, error: 'Невалидные данные' })
      }
      return false
    }
    return true
  })

  if (validRows.length === 0) {
    return result
  }

  // Batch lookup: все пользователи по email (1 запрос вместо N)
  const emails = validRows.map((r) => r.data.email)
  const existingUsers = await db.user.findMany({
    where: { email: { in: emails } },
    include: { studentProfile: true },
  })
  const usersByEmail = new Map(existingUsers.map((u) => [u.email, u]))

  // Batch lookup: все членства в школе (1 запрос вместо N)
  const existingUserIds = existingUsers.map((u) => u.id)
  const existingMemberships =
    existingUserIds.length > 0
      ? await db.member.findMany({
          where: { organizationId: schoolId, userId: { in: existingUserIds } },
        })
      : []
  const membershipByUserId = new Map(existingMemberships.map((m) => [m.userId, m]))

  // Обработка строк (creates/updates — последовательно из-за conditional логики)
  for (const row of validRows) {
    const { name, email, phone } = row.data

    try {
      const existingUser = usersByEmail.get(email)

      if (existingUser) {
        const existingMembership = membershipByUserId.get(existingUser.id)

        if (existingMembership) {
          if (options.updateExisting) {
            await db.user.update({
              where: { id: existingUser.id },
              data: {
                name: name || existingUser.name,
                phone: phone || existingUser.phone,
              },
            })
            result.updated++
          } else {
            result.skipped++
          }
          continue
        }

        // Добавляем в школу
        await db.member.create({
          data: {
            organizationId: schoolId,
            userId: existingUser.id,
            role: 'member',
          },
        })

        // Создаём профиль ученика если нет
        if (!existingUser.studentProfile) {
          await db.studentProfile.create({
            data: {
              userId: existingUser.id,
            },
          })
        }

        result.imported++
      } else {
        // Создаём нового пользователя с nested relations
        await db.user.create({
          data: {
            email,
            name,
            phone,
            roles: ['USER'],
            studentProfile: {
              create: {},
            },
            organizationMembers: {
              create: {
                organizationId: schoolId,
                role: 'member',
              },
            },
          },
        })

        result.imported++
      }
    } catch (error) {
      result.errors.push({
        rowIndex: row.rowIndex,
        error: error instanceof Error ? error.message : 'Ошибка создания записи',
      })
    }
  }

  return result
}

// Импорт инструкторов
// Оптимизация: batch lookup пользователей и членств (2 запроса вместо 2N)
async function importInstructors(
  schoolId: string,
  rows: Array<{ data: InstructorImportRow; isValid: boolean; rowIndex: number }>,
  options: ImportOptions,
  user: { id: string; roles: UserRole[] }
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  const db = getEnhancedPrisma(user)

  // Фильтруем валидные строки
  const validRows = rows.filter((row) => {
    if (!row.isValid) {
      if (options.skipErrors) {
        result.skipped++
      } else {
        result.errors.push({ rowIndex: row.rowIndex, error: 'Невалидные данные' })
      }
      return false
    }
    return true
  })

  if (validRows.length === 0) {
    return result
  }

  // Batch lookup: все пользователи по email (1 запрос вместо N)
  const emails = validRows.map((r) => r.data.email)
  const existingUsers = await db.user.findMany({
    where: { email: { in: emails } },
    include: { instructorProfile: true },
  })
  const usersByEmail = new Map(existingUsers.map((u) => [u.email, u]))

  // Batch lookup: все членства в школе (1 запрос вместо N)
  const existingUserIds = existingUsers.map((u) => u.id)
  const existingMemberships =
    existingUserIds.length > 0
      ? await db.member.findMany({
          where: { organizationId: schoolId, userId: { in: existingUserIds } },
        })
      : []
  const membershipByUserId = new Map(existingMemberships.map((m) => [m.userId, m]))

  // Обработка строк
  for (const row of validRows) {
    const { name, email, phone, categories, bio } = row.data

    try {
      const existingUser = usersByEmail.get(email)

      if (existingUser) {
        const existingMembership = membershipByUserId.get(existingUser.id)

        if (existingMembership) {
          if (options.updateExisting) {
            await db.user.update({
              where: { id: existingUser.id },
              data: {
                name: name || existingUser.name,
                phone: phone || existingUser.phone,
              },
            })

            if (existingUser.instructorProfile) {
              await db.instructorProfile.update({
                where: { id: existingUser.instructorProfile.id },
                data: {
                  bio: bio || existingUser.instructorProfile.bio,
                  licenseCategories: categories || existingUser.instructorProfile.licenseCategories,
                },
              })
            }

            result.updated++
          } else {
            result.skipped++
          }
          continue
        }

        // Добавляем в школу
        await db.member.create({
          data: {
            organizationId: schoolId,
            userId: existingUser.id,
            role: 'instructor',
          },
        })

        // Создаём профиль инструктора если нет
        if (!existingUser.instructorProfile) {
          await db.instructorProfile.create({
            data: {
              userId: existingUser.id,
              bio,
              licenseCategories: categories || [],
            },
          })
        }

        result.imported++
      } else {
        // Создаём нового пользователя с nested relations
        await db.user.create({
          data: {
            email,
            name,
            phone,
            roles: ['USER'],
            instructorProfile: {
              create: {
                bio,
                licenseCategories: categories || [],
              },
            },
            organizationMembers: {
              create: {
                organizationId: schoolId,
                role: 'instructor',
              },
            },
          },
        })

        result.imported++
      }
    } catch (error) {
      result.errors.push({
        rowIndex: row.rowIndex,
        error: error instanceof Error ? error.message : 'Ошибка создания записи',
      })
    }
  }

  return result
}

// Основная функция импорта
export async function importData(
  schoolId: string,
  dataType: ImportDataType,
  fileBuffer: ArrayBuffer,
  mapping: ColumnMapping[],
  options: ImportOptions
): Promise<ImportResult & { success: boolean; error?: string }> {
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'NOT_AUTHENTICATED', imported: 0, updated: 0, skipped: 0, errors: [] }
  }

  // Проверяем права
  const accessResult = await checkSchoolAccess(schoolId, session.user.id, session.user)
  if (!accessResult.success) {
    return { success: false, error: accessResult.error, imported: 0, updated: 0, skipped: 0, errors: [] }
  }

  // Парсим данные
  const parseResult = parseImportData<ImportRow>(fileBuffer, dataType, mapping)

  if (!parseResult.success) {
    return { success: false, error: parseResult.error, imported: 0, updated: 0, skipped: 0, errors: [] }
  }

  // Ограничиваем количество строк для предотвращения переполнения памяти
  const limitedRows = parseResult.rows.slice(0, MAX_IMPORT_ROWS)
  if (parseResult.rows.length > MAX_IMPORT_ROWS) {
    console.warn(`[Import] Ограничено количество строк: ${parseResult.rows.length} → ${MAX_IMPORT_ROWS}`)
  }

  // Выполняем импорт
  let result: ImportResult

  if (dataType === 'students') {
    result = await importStudents(
      schoolId,
      limitedRows as Array<{ data: StudentImportRow; isValid: boolean; rowIndex: number }>,
      options,
      session.user
    )
  } else {
    result = await importInstructors(
      schoolId,
      limitedRows as Array<{ data: InstructorImportRow; isValid: boolean; rowIndex: number }>,
      options,
      session.user
    )
  }

  // Ревалидируем страницу школы
  revalidatePath(`/school/${schoolId}`)

  return {
    ...result,
    success: result.errors.length === 0 || options.skipErrors,
  }
}

// Получение информации о школе для страницы импорта
export async function getSchoolForImport(schoolId: string) {
  const session = await getSession()

  if (!session?.user) {
    return { success: false as const, error: 'NOT_AUTHENTICATED' }
  }

  const accessResult = await checkSchoolAccess(schoolId, session.user.id, session.user)
  if (!accessResult.success) {
    return { success: false as const, error: accessResult.error }
  }

  const db = getEnhancedPrisma(session.user)
  const school = await db.organization.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          members: true,
        },
      },
    },
  })

  if (!school) {
    return { success: false as const, error: 'NOT_FOUND' }
  }

  return {
    success: true as const,
    school,
    canManage: ['owner', 'super_manager', 'manager'].includes(accessResult.role),
  }
}
