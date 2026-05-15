/**
 * Инициализация встроенных профилей кодирования в БД
 *
 * Вызывается при старте приложения из background.ts (main process).
 * Определяет набор профилей по поколению GPU и засиживает в БД.
 */

import { getBuiltInProfiles } from '../../../shared/encoding-profiles'
import type { GpuGeneration } from '../../../shared/types'
import { prisma } from '../../utils/db'

/**
 * Инициализирует встроенные профили в БД по возможностям железа
 *
 * ВАЖНО: При смене поколения GPU удаляет старые встроенные профили
 * и засиживает новые, подходящие для текущего оборудования.
 * Гарантирует ровно один профиль по умолчанию.
 */
export async function seedEncodingProfiles(generation: GpuGeneration = 'blackwell'): Promise<void> {
  const profiles = getBuiltInProfiles(generation)
  const profileNames = new Set(profiles.map((p) => p.name))

  // Удаляем встроенные профили, которых нет в новом наборе
  // (например "Blackwell UHQ" при переходе на Ada или CPU)
  const existingBuiltIn = await prisma.encodingProfile.findMany({
    where: { isBuiltIn: true },
  })

  for (const existing of existingBuiltIn) {
    if (!profileNames.has(existing.name)) {
      try {
        await prisma.encodingProfile.delete({ where: { id: existing.id } })
      } catch {
        // Игнорируем ошибки удаления (например если профиль привязан к settings)
      }
    }
  }

  // Создаём или обновляем профили для текущего поколения
  for (const profile of profiles) {
    try {
      const existing = await prisma.encodingProfile.findFirst({
        where: { name: profile.name, isBuiltIn: true },
      })

      if (!existing) {
        await prisma.encodingProfile.create({ data: profile })
      } else {
        // Обновляем, сохраняя пользовательский isDefault
        const { isDefault: _isDefault, ...updateData } = profile
        await prisma.encodingProfile.update({
          where: { id: existing.id },
          data: updateData,
        })
      }
    } catch {
      // Продолжаем с другими профилями
    }
  }

  // Гарантируем ровно один default профиль
  const allDefaults = await prisma.encodingProfile.findMany({
    where: { isDefault: true },
    orderBy: { createdAt: 'desc' },
  })

  if (allDefaults.length > 1) {
    // Оставляем только самый новый, остальные сбрасываем
    const idsToReset = allDefaults.slice(1).map((p) => p.id)
    await prisma.encodingProfile.updateMany({
      where: { id: { in: idsToReset } },
      data: { isDefault: false },
    })
  } else if (allDefaults.length === 0) {
    // Нет ни одного default — ставим первый встроенный
    const firstBuiltIn = await prisma.encodingProfile.findFirst({
      where: { isBuiltIn: true },
      orderBy: { createdAt: 'asc' },
    })
    if (firstBuiltIn) {
      await prisma.encodingProfile.update({
        where: { id: firstBuiltIn.id },
        data: { isDefault: true },
      })
    }
  }
}
