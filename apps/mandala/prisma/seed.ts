import { scryptAsync } from '@noble/hashes/scrypt.js'
import { bytesToHex, randomBytes } from '@noble/hashes/utils.js'
import { PrismaPg } from '@prisma/adapter-pg'
import * as fs from 'fs'
import * as path from 'path'
import sharp from 'sharp'
import mandalasData from '../data/mandalas.json'
import type { ImageCategory } from '../src/generated/prisma'
import { PrismaClient } from '../src/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! })
const prisma = new PrismaClient({ adapter })

/**
 * Тестовые данные для E2E тестов
 * ВАЖНО: Пароль должен совпадать с TEST_ADMIN в mandala-e2e/src/fixtures/auth.setup.ts
 */
const TEST_ADMIN_PASSWORD = 'admin123'

/**
 * Хеширование пароля в формате Better Auth (scrypt)
 * Формат: salt:hash (hex-encoded)
 */
async function hashPasswordBetterAuth(password: string): Promise<string> {
  const salt = bytesToHex(randomBytes(16))
  const key = await scryptAsync(password.normalize('NFKC'), salt, {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64,
  })
  return `${salt}:${bytesToHex(key)}`
}

/**
 * Извлекает путь файла из URL API
 * /api/files/mandalas/anahata.png -> mandalas/anahata.png
 */
function extractPathFromUrl(url: string): string {
  const prefix = '/api/files/'
  if (url.startsWith(prefix)) {
    return url.slice(prefix.length)
  }
  return url
}

/**
 * Генерирует blurDataURL для изображения.
 */
async function generateBlurDataURL(buffer: Buffer): Promise<string | null> {
  try {
    const blurBuffer = await sharp(buffer).resize(10, 10, { fit: 'inside' }).blur(1).webp({ quality: 20 }).toBuffer()

    return `data:image/webp;base64,${blurBuffer.toString('base64')}`
  } catch {
    return null
  }
}

/**
 * Получает информацию о файле изображения
 */
async function getImageInfo(filePath: string) {
  const uploadsDir = path.join(process.cwd(), 'uploads')
  const fullPath = path.join(uploadsDir, filePath)

  // Проверяем существование файла
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠ File not found: ${fullPath}`)
    return null
  }

  const buffer = fs.readFileSync(fullPath)
  const stats = fs.statSync(fullPath)
  const filename = path.basename(filePath)
  const ext = path.extname(filename).toLowerCase()

  // Определяем MIME-тип
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  }

  // Получаем размеры изображения
  let width: number | null = null
  let height: number | null = null
  let blurDataURL: string | null = null

  try {
    const metadata = await sharp(buffer).metadata()
    width = metadata.width ?? null
    height = metadata.height ?? null
    blurDataURL = await generateBlurDataURL(buffer)
  } catch (err) {
    console.warn(`⚠ Failed to get metadata for ${filePath}:`, err)
  }

  return {
    filename,
    path: filePath,
    mimeType: mimeTypes[ext] || 'application/octet-stream',
    size: stats.size,
    width,
    height,
    blurDataURL,
    category: 'MANDALA' as ImageCategory,
  }
}

/**
 * Создаёт или находит запись Image
 */
async function upsertImage(filePath: string, category: ImageCategory = 'MANDALA'): Promise<string | null> {
  const imageInfo = await getImageInfo(filePath)
  if (!imageInfo) {
    return null
  }

  const image = await prisma.image.upsert({
    where: { path: filePath },
    update: {
      filename: imageInfo.filename,
      mimeType: imageInfo.mimeType,
      size: imageInfo.size,
      width: imageInfo.width,
      height: imageInfo.height,
      blurDataURL: imageInfo.blurDataURL,
      category,
    },
    create: {
      filename: imageInfo.filename,
      path: filePath,
      mimeType: imageInfo.mimeType,
      size: imageInfo.size,
      width: imageInfo.width,
      height: imageInfo.height,
      blurDataURL: imageInfo.blurDataURL,
      category,
    },
  })

  return image.id
}

async function main() {
  // Создать админа с паролем для E2E тестов (Better Auth scrypt формат)
  const hashedPassword = await hashPasswordBetterAuth(TEST_ADMIN_PASSWORD)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@elfafeya.art' },
    update: {
      // Обновляем emailVerified если пользователь уже существует
      emailVerified: true, // Better Auth использует Boolean
    },
    create: {
      email: 'admin@elfafeya.art',
      name: 'Эльфафея',
      role: 'ADMIN',
      emailVerified: true, // Better Auth использует Boolean
    },
  })

  // Создаём Account запись для credential auth (Better Auth v1 формат)
  await prisma.account.upsert({
    where: {
      providerId_accountId: {
        providerId: 'credential',
        accountId: admin.email,
      },
    },
    update: {
      password: hashedPassword,
    },
    create: {
      userId: admin.id,
      providerId: 'credential',
      accountId: admin.email,
      password: hashedPassword, // Better Auth хранит пароль в Account, не в User
    },
  })

  console.log('✓ Created admin user:', admin.email, '(password: admin123 for E2E tests)')

  // Загрузить мандалы из JSON с созданием Image записей
  console.log('\n⏳ Loading mandalas with Image records...')

  let created = 0
  let skipped = 0

  for (const mandala of mandalasData) {
    // Создаём Image записи для каждого изображения
    const imagePath = extractPathFromUrl(mandala.imageUrl)
    const centerImagePath = mandala.centerImageUrl ? extractPathFromUrl(mandala.centerImageUrl) : null
    const watermarkPath = mandala.watermarkUrl ? extractPathFromUrl(mandala.watermarkUrl) : null

    // Создаём основное изображение (обязательное)
    const imageId = await upsertImage(imagePath, 'MANDALA')
    if (!imageId) {
      console.warn(`⚠ Skipping ${mandala.slug}: image not found`)
      skipped++
      continue
    }

    // Опциональные изображения (миниатюры генерируются Next.js Image автоматически)
    const centerImageId = centerImagePath ? await upsertImage(centerImagePath, 'MANDALA') : null
    const watermarkId = watermarkPath ? await upsertImage(watermarkPath, 'MANDALA') : null

    // Создаём мандалу с FK связями (ogImageId берётся из imageId если не указан отдельно)
    await prisma.mandala.upsert({
      where: { slug: mandala.slug },
      update: {
        name: mandala.name,
        description: mandala.description,
        imageId,
        centerImageId,
        watermarkId,
        metaTitle: mandala.metaTitle,
        metaDescription: mandala.metaDescription,
        metaKeywords: mandala.metaKeywords,
        defaultEffectIndex: mandala.defaultEffectIndex,
        order: mandala.order,
        published: mandala.published,
      },
      create: {
        slug: mandala.slug,
        name: mandala.name,
        description: mandala.description,
        imageId,
        centerImageId,
        watermarkId,
        metaTitle: mandala.metaTitle,
        metaDescription: mandala.metaDescription,
        metaKeywords: mandala.metaKeywords,
        defaultEffectIndex: mandala.defaultEffectIndex,
        order: mandala.order,
        published: mandala.published,
      },
    })

    created++
    process.stdout.write(`\r  Processing: ${created}/${mandalasData.length}`)
  }

  console.log(`\n✓ Loaded ${created} mandalas (skipped: ${skipped})`)

  // Создать Image записи для контентных страниц
  console.log('\n⏳ Creating content images...')

  const contentImages = ['content/Elfafeya.jpg', 'content/Elfafeya_hands.jpg', 'content/KGUng.jpg']

  for (const imgPath of contentImages) {
    await upsertImage(imgPath, 'CONTENT')
  }

  console.log(`✓ Created ${contentImages.length} content images`)

  // ПРИМЕЧАНИЕ: ContentPage записи НЕ создаются, т.к. страницы about-elfafeya,
  // about-mandalas и contacts реализованы как статические React-компоненты

  // Создать короткие URL для первых мандал
  console.log('\n⏳ Creating short URLs...')

  const firstMandalas = mandalasData.slice(0, 10)

  for (let i = 0; i < firstMandalas.length; i++) {
    const mandala = firstMandalas[i]
    const code = String(i + 1)

    await prisma.shortUrl.upsert({
      where: { code },
      update: {},
      create: {
        code,
        fullUrl: `/mandalas/${mandala.slug}`,
      },
    })
  }

  console.log(`✓ Created ${firstMandalas.length} short URLs`)

  // Создать тестовые товары для магазина
  console.log('\n⏳ Creating products...')

  const productsData = [
    {
      slug: 'magnit-mandala-om',
      name: 'Магнит "Мандала Ом"',
      description: 'Керамический магнит с изображением мандалы Ом ручной работы.',
      price: 350,
      stock: 15,
    },
    {
      slug: 'otkrytka-czvetok-zhizni',
      name: 'Открытка "Цветок жизни"',
      description: 'Авторская открытка с мандалой "Цветок жизни", подходит для подарка.',
      price: 150,
      stock: 30,
    },
    {
      slug: 'poster-anahata',
      name: 'Постер "Анахата"',
      description: 'Печатный постер мандалы Анахата формата А3.',
      price: 900,
      stock: 8,
    },
  ]

  for (const [index, product] of productsData.entries()) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        order: index,
      },
      create: {
        slug: product.slug,
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        order: index,
      },
    })
  }

  console.log(`✓ Created ${productsData.length} products`)

  // Итоговая статистика
  const stats = {
    images: await prisma.image.count(),
    mandalas: await prisma.mandala.count(),
    shortUrls: await prisma.shortUrl.count(),
    products: await prisma.product.count(),
  }

  // Проверяем что blurDataURL заполнен
  const imagesWithBlur = await prisma.image.count({
    where: { blurDataURL: { not: null } },
  })

  console.log('\n✓ Seed completed')
  console.log(`  Images: ${stats.images} (with blur: ${imagesWithBlur})`)
  console.log(`  Mandalas: ${stats.mandalas}`)
  console.log(`  Short URLs: ${stats.shortUrls}`)
  console.log(`  Products: ${stats.products}`)
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
