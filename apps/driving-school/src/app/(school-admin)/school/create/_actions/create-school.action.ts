'use server'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { LicenseCategory } from '@letar/driving-school-db/prisma'

import { type CreateSchoolInput, CreateSchoolSchema } from '../_schemas/create-school.schema'

export type CreateSchoolResult = { success: true; organizationId: string } | { success: false; error: string }

/**
 * Генерация slug из названия организации
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
 * Создать организацию (автошколу) через Better Auth
 *
 * Создаёт Organization + Member с ролью 'owner'
 */
export async function createSchoolAction(data: CreateSchoolInput): Promise<CreateSchoolResult> {
  const parsed = CreateSchoolSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'Необходимо авторизоваться' }
  }

  const { name, description, phone, email, licenseCategories } = parsed.data

  try {
    // Генерируем уникальный slug
    const slug = await ensureUniqueSlug(generateSlug(name.trim()))

    // Сериализуем массивы в JSON для metadata
    const metadata = JSON.stringify({
      cities: [],
      licenseCategories: (licenseCategories || []) as LicenseCategory[],
    })

    // Создаём организацию и добавляем создателя как владельца
    const organization = await prisma.organization.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        metadata,
        isPublic: false,
        reviewCount: 0,
      },
    })

    // Добавляем создателя как владельца (owner)
    await prisma.member.create({
      data: {
        organizationId: organization.id,
        userId: session.user.id,
        role: 'owner',
      },
    })

    return { success: true, organizationId: organization.id }
  } catch (error) {
    console.error('Create organization error:', error)
    return { success: false, error: 'Не удалось создать школу. Попробуйте позже.' }
  }
}
