/**
 * Скрипт миграции изображений в централизованное хранилище.
 *
 * Запуск: npx tsx scripts/migrate-images.ts
 *
 * Что делает:
 * 1. Мигрирует VariantImage.url -> Image + VariantImage.imageId
 * 2. Мигрирует UserProfile.image -> Image + UserProfile.avatarId (только локальные)
 * 3. Мигрирует CustomOrder.referenceImages -> Image + CustomOrder.referenceImageIds
 */

import { existsSync, statSync } from 'fs'
import { join } from 'path'
import sharp from 'sharp'

import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

/**
 * Извлекает путь из URL.
 * /api/files/products/xxx.jpg -> products/xxx.jpg
 */
function extractPath(url: string): string {
  if (url.startsWith('/api/files/')) {
    return url.replace('/api/files/', '')
  }
  return url
}

/**
 * Извлекает имя файла из URL.
 */
function extractFilename(url: string): string {
  return url.split('/').pop() ?? ''
}

/**
 * Определяет MIME-тип по расширению файла.
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'svg':
      return 'image/svg+xml'
    default:
      return 'image/jpeg'
  }
}

/**
 * Получает размер файла.
 */
async function getFileSize(path: string): Promise<number> {
  const filepath = join(process.cwd(), 'uploads', path)
  if (existsSync(filepath)) {
    return statSync(filepath).size
  }
  return 0
}

/**
 * Получает размеры изображения.
 */
async function getImageDimensions(path: string): Promise<{ width: number | null; height: number | null }> {
  const filepath = join(process.cwd(), 'uploads', path)
  if (!existsSync(filepath)) {
    return { width: null, height: null }
  }

  try {
    const metadata = await sharp(filepath).metadata()
    return {
      width: metadata.width ?? null,
      height: metadata.height ?? null,
    }
  } catch {
    return { width: null, height: null }
  }
}

/**
 * Определяет категорию по пути.
 */
function getCategory(path: string): 'PRODUCT' | 'AVATAR' | 'REFERENCE' | 'NOTIFICATION' {
  if (path.startsWith('products/')) {
    return 'PRODUCT'
  }
  if (path.startsWith('avatars/')) {
    return 'AVATAR'
  }
  if (path.startsWith('references/')) {
    return 'REFERENCE'
  }
  return 'PRODUCT'
}

async function migrateVariantImages() {
  console.log('📸 Миграция VariantImage...')

  // Получаем все VariantImage с url, но без imageId
  const variantImages = await prisma.variantImage.findMany({
    where: {
      url: { not: null },
      imageId: null,
    },
  })

  console.log(`   Найдено ${variantImages.length} записей для миграции`)

  let migrated = 0
  let skipped = 0
  let errors = 0

  for (const vi of variantImages) {
    if (!vi.url) {
      skipped++
      continue
    }

    try {
      const path = extractPath(vi.url)
      const filename = extractFilename(vi.url)
      const mimeType = getMimeType(filename)
      const size = await getFileSize(path)
      const dimensions = await getImageDimensions(path)

      // Проверяем, существует ли уже Image с таким path
      const existingImage = await prisma.image.findUnique({
        where: { path },
      })

      let imageId: string

      if (existingImage) {
        imageId = existingImage.id
      } else {
        // Создаём запись Image
        const image = await prisma.image.create({
          data: {
            filename,
            path,
            mimeType,
            size,
            width: dimensions.width,
            height: dimensions.height,
            category: 'PRODUCT',
            uploadedAt: vi.createdAt,
          },
        })
        imageId = image.id
      }

      // Обновляем VariantImage
      await prisma.variantImage.update({
        where: { id: vi.id },
        data: { imageId },
      })

      migrated++
      if (migrated % 10 === 0) {
        console.log(`   Мигрировано: ${migrated}/${variantImages.length}`)
      }
    } catch (error) {
      console.error(`   Ошибка миграции VariantImage ${vi.id}:`, error)
      errors++
    }
  }

  console.log(`   ✅ Мигрировано: ${migrated}, пропущено: ${skipped}, ошибок: ${errors}`)
}

async function migrateUserProfiles() {
  console.log('👤 Миграция UserProfile...')

  // Получаем все UserProfile с локальными image (не OAuth)
  const profiles = await prisma.userProfile.findMany({
    where: {
      image: {
        not: null,
        startsWith: '/api/files/',
      },
      avatarId: null,
    },
  })

  console.log(`   Найдено ${profiles.length} записей для миграции`)

  let migrated = 0
  let skipped = 0
  let errors = 0

  for (const profile of profiles) {
    if (!profile.image) {
      skipped++
      continue
    }

    // Пропускаем OAuth аватары (внешние URL)
    if (!profile.image.startsWith('/api/files/')) {
      skipped++
      continue
    }

    try {
      const path = extractPath(profile.image)
      const filename = extractFilename(profile.image)
      const mimeType = getMimeType(filename)
      const size = await getFileSize(path)
      const dimensions = await getImageDimensions(path)

      // Проверяем, существует ли уже Image с таким path
      const existingImage = await prisma.image.findUnique({
        where: { path },
      })

      let imageId: string

      if (existingImage) {
        imageId = existingImage.id
      } else {
        // Создаём запись Image
        const image = await prisma.image.create({
          data: {
            filename,
            path,
            mimeType,
            size,
            width: dimensions.width,
            height: dimensions.height,
            category: 'AVATAR',
            uploadedById: profile.userId,
            uploadedAt: profile.createdAt,
          },
        })
        imageId = image.id
      }

      // Обновляем UserProfile
      await prisma.userProfile.update({
        where: { id: profile.id },
        data: { avatarId: imageId },
      })

      migrated++
    } catch (error) {
      console.error(`   Ошибка миграции UserProfile ${profile.id}:`, error)
      errors++
    }
  }

  console.log(`   ✅ Мигрировано: ${migrated}, пропущено: ${skipped}, ошибок: ${errors}`)
}

async function migrateCustomOrders() {
  console.log('📦 Миграция CustomOrder...')

  // Получаем все CustomOrder с referenceImages
  const orders = await prisma.customOrder.findMany({
    where: {
      referenceImages: { isEmpty: false },
      referenceImageIds: { isEmpty: true },
    },
  })

  console.log(`   Найдено ${orders.length} записей для миграции`)

  let migrated = 0
  let skipped = 0
  let errors = 0

  for (const order of orders) {
    if (!order.referenceImages || order.referenceImages.length === 0) {
      skipped++
      continue
    }

    try {
      const imageIds: string[] = []

      for (const url of order.referenceImages) {
        const path = extractPath(url)
        const filename = extractFilename(url)
        const mimeType = getMimeType(filename)
        const size = await getFileSize(path)
        const dimensions = await getImageDimensions(path)

        // Проверяем, существует ли уже Image с таким path
        const existingImage = await prisma.image.findUnique({
          where: { path },
        })

        let imageId: string

        if (existingImage) {
          imageId = existingImage.id
        } else {
          // Создаём запись Image
          const image = await prisma.image.create({
            data: {
              filename,
              path,
              mimeType,
              size,
              width: dimensions.width,
              height: dimensions.height,
              category: 'REFERENCE',
              uploadedById: order.userId,
              uploadedAt: order.createdAt,
            },
          })
          imageId = image.id
        }

        imageIds.push(imageId)
      }

      // Обновляем CustomOrder
      await prisma.customOrder.update({
        where: { id: order.id },
        data: { referenceImageIds: imageIds },
      })

      migrated++
    } catch (error) {
      console.error(`   Ошибка миграции CustomOrder ${order.id}:`, error)
      errors++
    }
  }

  console.log(`   ✅ Мигрировано: ${migrated}, пропущено: ${skipped}, ошибок: ${errors}`)
}

async function showStats() {
  console.log('\n📊 Статистика после миграции:')

  const totalImages = await prisma.image.count()
  const productImages = await prisma.image.count({ where: { category: 'PRODUCT' } })
  const avatarImages = await prisma.image.count({ where: { category: 'AVATAR' } })
  const referenceImages = await prisma.image.count({ where: { category: 'REFERENCE' } })

  const variantImagesWithImageId = await prisma.variantImage.count({ where: { imageId: { not: null } } })
  const variantImagesWithUrl = await prisma.variantImage.count({ where: { url: { not: null }, imageId: null } })

  const profilesWithAvatarId = await prisma.userProfile.count({ where: { avatarId: { not: null } } })
  const profilesWithImage = await prisma.userProfile.count({
    where: { image: { not: null }, avatarId: null },
  })

  const ordersWithImageIds = await prisma.customOrder.count({ where: { referenceImageIds: { isEmpty: false } } })
  const ordersWithImages = await prisma.customOrder.count({
    where: { referenceImages: { isEmpty: false }, referenceImageIds: { isEmpty: true } },
  })

  console.log(`   Всего Image записей: ${totalImages}`)
  console.log(`     - PRODUCT: ${productImages}`)
  console.log(`     - AVATAR: ${avatarImages}`)
  console.log(`     - REFERENCE: ${referenceImages}`)
  console.log('')
  console.log(`   VariantImage с imageId: ${variantImagesWithImageId}`)
  console.log(`   VariantImage без imageId (требуют миграции): ${variantImagesWithUrl}`)
  console.log('')
  console.log(`   UserProfile с avatarId: ${profilesWithAvatarId}`)
  console.log(`   UserProfile без avatarId (требуют миграции): ${profilesWithImage}`)
  console.log('')
  console.log(`   CustomOrder с referenceImageIds: ${ordersWithImageIds}`)
  console.log(`   CustomOrder без referenceImageIds (требуют миграции): ${ordersWithImages}`)
}

async function main() {
  console.log('🚀 Начало миграции изображений...\n')

  try {
    await migrateVariantImages()
    await migrateUserProfiles()
    await migrateCustomOrders()
    await showStats()

    console.log('\n✅ Миграция завершена!')
  } catch (error) {
    console.error('\n❌ Ошибка миграции:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
