/* eslint-disable no-console */
/**
 * Скрипт для генерации нумерологических профилей для существующих клиентов
 * Запуск: bun run scripts/generate-numerology-profiles.ts
 */

import { PrismaClient } from '@/generated/prisma'
import { generateNumerologyProfileData } from '@/lib/utils/numerology'

const prisma = new PrismaClient()

async function generateNumerologyProfiles() {
  console.info('🔮 Начинаю генерацию нумерологических профилей...\n')

  try {
    // Получаем всех клиентов с датой рождения, но без нумерологического профиля
    const clients = await prisma.client.findMany({
      where: {
        birthdate: { not: null },
        numerologyProfile: null,
      },
      select: {
        id: true,
        name: true,
        birthdate: true,
      },
    })

    if (clients.length === 0) {
      console.info('✅ Все клиенты с датой рождения уже имеют нумерологический профиль')
      return
    }

    console.info(`📊 Найдено клиентов без профиля: ${clients.length}\n`)

    for (const client of clients) {
      try {
        console.info(`⏳ Обрабатываю клиента: ${client.name}`)
        console.info(`   Дата рождения: ${client.birthdate?.toLocaleDateString('ru-RU')}`)

        if (!client.birthdate) {
          console.info('   ⚠️  Пропускаю (нет даты рождения)\n')
          continue
        }

        // Генерируем данные профиля
        const profileData = generateNumerologyProfileData(client.birthdate)

        // Создаем профиль в БД
        await prisma.numerologyProfile.create({
          data: {
            clientId: client.id,
            ...profileData,
          },
        })

        console.info(`   ✅ Профиль успешно создан`)
        console.info(`   - Число судьбы: ${profileData.destinyNumber}`)
        console.info(`   - Число жизненного пути: ${profileData.lifePathNumber}`)
        console.info(`   - Текущий цикл: ${profileData.currentCycle}\n`)
      } catch (error) {
        console.error(`   ❌ Ошибка при создании профиля для клиента ${client.name}:`, error)
        console.info()
      }
    }

    console.info('\n🎉 Генерация профилей завершена!')
  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Запуск скрипта
generateNumerologyProfiles()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
