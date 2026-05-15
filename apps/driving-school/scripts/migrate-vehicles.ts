/**
 * Скрипт миграции данных автомобилей инструкторов.
 * Переносит данные из старых полей InstructorProfile (carBrand, carModel, etc.)
 * в новую модель InstructorVehicle.
 *
 * Запуск: npx tsx scripts/migrate-vehicles.ts
 */

import type { Transmission } from '../src/generated/prisma'
import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🚗 Начинаем миграцию автомобилей инструкторов...\n')

  // Получаем все профили инструкторов с данными об авто
  const instructorProfiles = await prisma.instructorProfile.findMany({
    where: {
      carBrand: { not: null },
    },
    include: {
      vehicles: true,
      user: {
        select: { name: true },
      },
    },
  })

  console.log(`Найдено ${instructorProfiles.length} профилей с данными об автомобилях\n`)

  let migrated = 0
  let skipped = 0

  for (const profile of instructorProfiles) {
    // Пропускаем если уже есть автомобили
    if (profile.vehicles.length > 0) {
      console.log(`⏭️  ${profile.user?.name || profile.id}: уже есть ${profile.vehicles.length} авто, пропускаем`)
      skipped++
      continue
    }

    // Создаём автомобиль из старых данных
    try {
      await prisma.instructorVehicle.create({
        data: {
          instructorProfileId: profile.id,
          brand: profile.carBrand!,
          model: profile.carModel,
          year: profile.carYear,
          plateNumber: profile.carPlateNumber,
          transmission: (profile.carTransmission as Transmission) || 'MANUAL',
          isPrimary: true,
          isActive: true,
        },
      })

      console.log(
        `✅ ${profile.user?.name || profile.id}: создан ${profile.carBrand} ${profile.carModel || ''} ${
          profile.carYear || ''
        }`
      )
      migrated++
    } catch (error) {
      console.error(`❌ Ошибка миграции для ${profile.user?.name || profile.id}:`, error)
    }
  }

  console.log(`\n📊 Результаты миграции:`)
  console.log(`   ✅ Мигрировано: ${migrated}`)
  console.log(`   ⏭️  Пропущено: ${skipped}`)
  console.log(`   📝 Всего профилей: ${instructorProfiles.length}`)
}

main()
  .catch((e) => {
    console.error('Ошибка миграции:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
