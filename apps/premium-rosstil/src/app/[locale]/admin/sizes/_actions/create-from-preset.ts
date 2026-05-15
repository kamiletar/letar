'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getPresetById } from '../_lib/size-presets'

/**
 * Result of creating sizes from a preset
 */
export interface CreateFromPresetResult {
  success: boolean
  created: number
  skipped: number
  errors: string[]
  message: string
}

/**
 * Create multiple sizes from a preset template.
 * Skips sizes that already exist (based on ru + gender unique constraint).
 *
 * @param presetId - ID of the preset to use
 * @returns Result object with created/skipped counts and any errors
 */
export async function createFromPreset(presetId: string): Promise<CreateFromPresetResult> {
  // 1. Authentication check
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  // 2. Get the preset
  const preset = getPresetById(presetId)
  if (!preset) {
    return {
      success: false,
      created: 0,
      skipped: 0,
      errors: [`Шаблон с ID "${presetId}" не найден`],
      message: 'Ошибка: шаблон не найден',
    }
  }

  // 3. Get enhanced Prisma client
  const db = getEnhancedPrisma(session.user)

  // 4. Create sizes, tracking success/failures
  let created = 0
  let skipped = 0
  const errors: string[] = []

  // Get current max sortOrder for this gender
  const maxSortOrderResult = await db.productSize.findFirst({
    where: { gender: preset.gender },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })

  let currentSortOrder = (maxSortOrderResult?.sortOrder ?? -1) + 1

  for (const sizeData of preset.sizes) {
    try {
      await db.productSize.create({
        data: {
          ...sizeData,
          sortOrder: currentSortOrder,
        },
      })
      created++
      currentSortOrder++
    } catch (error) {
      // Check if it's a unique constraint violation (P2002)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        // Size already exists - skip it
        skipped++
      } else {
        // Other error - record it
        console.error(`Failed to create size ${sizeData.ru}:`, error)
        errors.push(
          `Ошибка при создании размера ${sizeData.ru}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
        )
      }
    }
  }

  // 5. Revalidate the sizes page
  revalidatePath('/admin/sizes', 'page')

  // 6. Return result
  const total = preset.sizes.length
  const success = created > 0

  let message = ''
  if (created === total) {
    message = `Успешно создано ${created} ${pluralize(created, 'размер', 'размера', 'размеров')}`
  } else if (created > 0) {
    message = `Создано ${created}, пропущено ${skipped} ${errors.length > 0 ? `, ошибок: ${errors.length}` : ''}`
  } else if (skipped > 0) {
    message = `Все ${skipped} ${pluralize(skipped, 'размер', 'размера', 'размеров')} уже ${pluralize(
      skipped,
      'существует',
      'существуют',
      'существуют'
    )}`
  } else {
    message = 'Не удалось создать размеры'
  }

  return {
    success,
    created,
    skipped,
    errors,
    message,
  }
}

/**
 * Pluralize Russian word based on count
 */
function pluralize(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) {
    return one
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return few
  }
  return many
}
