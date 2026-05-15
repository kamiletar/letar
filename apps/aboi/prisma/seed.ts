import { auth } from '@/lib/auth'
import { createImageRecord } from '@/lib/images/upload'
import { prismaAuth } from '@/lib/prisma'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Сидинг dev-БД:
 * 1. Создаёт админ-пользователя если его нет
 * 2. Создаёт 5 тестовых товаров с картинками из ABOI_IMAGES_DIR
 *
 * Запуск: `nx db:seed aboi`
 * Картинки: C:/Users/Kami/Pictures/aboi (или переопределить через ABOI_IMAGES_DIR)
 */

// ============================================================================
// Конфиг продуктов
// ============================================================================

interface ProductSeed {
  slug: string
  name: string
  description: string
  pricePerMeter: number // в копейках
  minLengthMeters: number
  affirmations: string[]
  imageIndexes: number[] // индексы в массиве всех файлов картинок
}

const PRODUCTS: ProductSeed[] = [
  {
    slug: 'lesnaya-mantra',
    name: 'Лесная Мантра',
    description:
      'Глубокая зелень лесного полога — дизайн для тех, кто ценит тишину и живую природу. Текстура создаёт ощущение пространства и свежести в любом интерьере.',
    pricePerMeter: 150_000, // 1500 ₽
    minLengthMeters: 1,
    affirmations: ['покой', 'гармония', 'жизнь', 'рост', 'сила'],
    imageIndexes: [0, 1, 2, 3, 4, 5],
  },
  {
    slug: 'nebesnyj-pokoj',
    name: 'Небесный Покой',
    description:
      'Мягкие переходы небесного голубого и белого — дизайн для спальни или медитативного уголка. Создаёт атмосферу лёгкости и безмятежности.',
    pricePerMeter: 160_000, // 1600 ₽
    minLengthMeters: 1,
    affirmations: ['спокойствие', 'лёгкость', 'чистота', 'ясность', 'свобода'],
    imageIndexes: [6, 7, 8, 9, 10, 11],
  },
  {
    slug: 'gornyj-duh',
    name: 'Горный Дух',
    description:
      'Силуэты горных хребтов в туманной дымке — для тех, кто мечтает о вершинах. Мощная, но спокойная энергетика для рабочего кабинета или гостиной.',
    pricePerMeter: 170_000, // 1700 ₽
    minLengthMeters: 1,
    affirmations: ['сила', 'устойчивость', 'достижение', 'вершина', 'воля'],
    imageIndexes: [12, 13, 14, 15, 16, 17],
  },
  {
    slug: 'morskaya-dusha',
    name: 'Морская Душа',
    description:
      'Волны, ракушки и морская глубина — дизайн наполнен энергией воды. Идеально для ванной, детской или любого пространства, где важна текучесть и интуиция.',
    pricePerMeter: 155_000, // 1550 ₽
    minLengthMeters: 1,
    affirmations: ['интуиция', 'поток', 'глубина', 'чувствительность', 'творчество'],
    imageIndexes: [18, 19, 20, 21, 22, 23],
  },
  {
    slug: 'solnechnaya-mysl',
    name: 'Солнечная Мысль',
    description:
      'Тёплые золотистые оттенки рассвета — дизайн заряжает оптимизмом с первых минут дня. Отличный выбор для кухни, прихожей или домашнего офиса.',
    pricePerMeter: 145_000, // 1450 ₽
    minLengthMeters: 1,
    affirmations: ['радость', 'оптимизм', 'энергия', 'успех', 'благодарность'],
    imageIndexes: [24, 25, 26, 27, 28],
  },
]

// ============================================================================
// Утилиты
// ============================================================================

function mimeFromExt(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  return 'image/jpeg'
}

// ============================================================================
// Seed: Админ
// ============================================================================

async function seedAdmin() {
  const ADMIN_EMAIL = process.env.ABOI_ADMIN_EMAIL ?? 'admin@aboi.local'
  const ADMIN_PASSWORD = process.env.ABOI_ADMIN_PASSWORD ?? 'adminpass123'
  const ADMIN_NAME = process.env.ABOI_ADMIN_NAME ?? 'Виталий'

  const existing = await prismaAuth.user.findUnique({ where: { email: ADMIN_EMAIL } })

  if (existing) {
    if (!existing.roles.includes('ADMIN')) {
      await prismaAuth.user.update({
        where: { id: existing.id },
        data: { roles: { set: ['ADMIN', 'CUSTOMER'] }, emailVerified: true },
      })
      console.warn(`[seed] Существующему ${ADMIN_EMAIL} выдана роль ADMIN`)
    } else {
      console.warn(`[seed] Админ ${ADMIN_EMAIL} уже существует`)
    }
    return
  }

  const result = await auth.api.signUpEmail({
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: ADMIN_NAME },
  })

  if (!result.user) {
    throw new Error('signUpEmail не вернул user')
  }

  await prismaAuth.user.update({
    where: { id: result.user.id },
    data: { roles: { set: ['ADMIN', 'CUSTOMER'] }, emailVerified: true },
  })

  console.warn(`[seed] Создан админ ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (смените пароль!)`)
}

// ============================================================================
// Seed: Продукты с картинками
// ============================================================================

async function seedProducts() {
  const imagesDir = process.env.ABOI_IMAGES_DIR ?? 'C:/Users/Kami/Pictures/aboi'

  // Собираем все jpg-файлы в алфавитном порядке
  const { readdir } = await import('node:fs/promises')
  let allFiles: string[]
  try {
    const entries = await readdir(imagesDir)
    allFiles = entries
      .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .sort()
      .map((f) => path.join(imagesDir, f))
  } catch {
    console.warn(`[seed] Папка с картинками не найдена: ${imagesDir}. Продукты создаются без изображений.`)
    allFiles = []
  }

  console.log(`[seed] Найдено картинок: ${allFiles.length}`)

  for (const product of PRODUCTS) {
    const existing = await prismaAuth.product.findUnique({ where: { slug: product.slug } })
    if (existing) {
      console.warn(`[seed] Товар "${product.name}" уже существует, пропускаем`)
      continue
    }

    console.log(`[seed] Создаём товар "${product.name}"...`)

    // Создаём товар
    const created = await prismaAuth.product.create({
      data: {
        slug: product.slug,
        name: product.name,
        description: product.description,
        pricePerMeter: product.pricePerMeter,
        minLengthMeters: product.minLengthMeters,
        affirmations: product.affirmations,
        published: true,
      },
    })

    // Загружаем и прикрепляем картинки
    const imageFiles = product.imageIndexes
      .map((i) => allFiles[i])
      .filter((f): f is string => f !== undefined)

    for (let sortOrder = 0; sortOrder < imageFiles.length; sortOrder++) {
      const filePath = imageFiles[sortOrder]
      const filename = path.basename(filePath)

      try {
        const buffer = await readFile(filePath)
        const mimeType = mimeFromExt(filename)

        const image = await createImageRecord({
          buffer,
          mimeType,
          originalName: filename,
          category: 'products',
          alt: `${product.name} — фото ${sortOrder + 1}`,
        })

        await prismaAuth.productImage.create({
          data: {
            productId: created.id,
            imageId: image.id,
            sortOrder,
          },
        })

        console.log(`  [seed]   ✓ ${filename}`)
      } catch (err) {
        console.error(`  [seed]   ✗ ${filename}: ${err}`)
      }
    }

    console.log(`[seed] Товар "${product.name}" создан (id: ${created.id})`)
  }
}

// ============================================================================
// Точка входа
// ============================================================================

async function main() {
  await seedAdmin()
  await seedProducts()
}

main()
  .catch((err) => {
    console.error('[seed] Ошибка:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prismaAuth.$disconnect()
  })
