/**
 * Хелперы для работы с базой данных в E2E тестах
 *
 * ВАЖНО: Используем динамический импорт PrismaClient,
 * чтобы избежать проблем с ESM/CommonJS
 */
import { loadEnvConfig } from '@next/env'
import { resolve } from 'path'

// Загружаем переменные окружения через @next/env
// Это загружает .env, .env.local, .env.development и т.д.
const projectDir = resolve(__dirname, '../..')
loadEnvConfig(projectDir)

type PrismaClientType = import('../../../premium-rosstil/src/generated/prisma').PrismaClient

let prisma: PrismaClientType | null = null

/**
 * Получить инстанс Prisma Client
 */
async function getPrisma(): Promise<PrismaClientType> {
  if (!prisma) {
    // Динамический импорт для избежания проблем с ESM
    // Путь к generated prisma в основном приложении premium-rosstil
    // eslint-disable-next-line @nx/enforce-module-boundaries
    const { PrismaClient } = await import('../../../premium-rosstil/src/generated/prisma/index.js')
    prisma = new PrismaClient()
  }
  return prisma
}

/**
 * Активация email пользователя (установка emailVerified)
 */
export async function activateUser(email: string) {
  const db = await getPrisma()
  await db.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  })
}

/**
 * Повышение пользователя до администратора
 */
export async function promoteToAdmin(email: string) {
  const db = await getPrisma()
  await db.user.update({
    where: { email },
    data: { role: 'ADMIN' },
  })
}

/**
 * Активация и повышение до админа за один вызов
 */
export async function activateAndPromoteToAdmin(email: string) {
  const db = await getPrisma()
  await db.user.update({
    where: { email },
    data: {
      emailVerified: new Date(),
      role: 'ADMIN',
    },
  })
}

/**
 * Проверка существования пользователя
 */
export async function userExists(email: string): Promise<boolean> {
  const db = await getPrisma()
  const user = await db.user.findUnique({ where: { email } })
  return user !== null
}

/**
 * Получение пользователя по email
 */
export async function getUser(email: string) {
  const db = await getPrisma()
  return db.user.findUnique({ where: { email } })
}

/**
 * Удаление тестовых пользователей
 */
export async function deleteTestUsers() {
  const db = await getPrisma()
  await db.user.deleteMany({
    where: { email: { contains: '@test.local' } },
  })
}

/**
 * Обеспечить существование активированного тестового пользователя
 * Если пользователь не существует - создаёт его
 * Если существует - обновляет пароль и активацию
 */
export async function ensureTestUser(userData: { email: string; password: string; name: string }) {
  const db = await getPrisma()
  const bcrypt = await import('bcryptjs')

  const existingUser = await db.user.findUnique({ where: { email: userData.email } })

  if (existingUser) {
    // Всегда обновляем пароль и активацию для тестового пользователя
    const hashedPassword = await bcrypt.hash(userData.password, 12)
    await db.user.update({
      where: { email: userData.email },
      data: {
        hashedPassword,
        emailVerified: new Date(),
        name: userData.name,
      },
    })

    // Создаём/обновляем Account для Better Auth credential auth
    // Better Auth использует providerId и accountId (не provider/providerAccountId!)
    await db.account.upsert({
      where: {
        providerId_accountId: {
          providerId: 'credential',
          accountId: userData.email,
        },
      },
      update: { password: hashedPassword },
      create: {
        userId: existingUser.id,
        providerId: 'credential',
        accountId: userData.email,
        password: hashedPassword,
      },
    })

    console.log(`✅ Обновлён тестовый пользователь: ${userData.email}`)
    return existingUser
  }

  // Создаём нового пользователя
  const hashedPassword = await bcrypt.hash(userData.password, 12)

  const newUser = await db.user.create({
    data: {
      email: userData.email,
      name: userData.name,
      hashedPassword,
      emailVerified: new Date(),
    },
  })

  // Создаём Account для Better Auth credential auth
  await db.account.create({
    data: {
      userId: newUser.id,
      providerId: 'credential',
      accountId: userData.email,
      password: hashedPassword,
    },
  })

  console.log(`✅ Создан новый тестовый пользователь: ${userData.email}`)
  return newUser
}

/**
 * Обеспечить существование активированного тестового администратора
 * Если пользователь не существует - создаёт его с ролью ADMIN
 * Если существует - обновляет пароль, активацию и роль
 */
export async function ensureTestAdmin(userData: { email: string; password: string; name: string }) {
  const db = await getPrisma()
  const bcrypt = await import('bcryptjs')

  const existingUser = await db.user.findUnique({ where: { email: userData.email } })

  if (existingUser) {
    // Всегда обновляем пароль, активацию и роль для тестового пользователя
    const hashedPassword = await bcrypt.hash(userData.password, 12)
    await db.user.update({
      where: { email: userData.email },
      data: {
        hashedPassword,
        emailVerified: new Date(),
        role: 'ADMIN',
        name: userData.name,
      },
    })

    // Создаём/обновляем Account для Better Auth credential auth
    await db.account.upsert({
      where: {
        providerId_accountId: {
          providerId: 'credential',
          accountId: userData.email,
        },
      },
      update: { password: hashedPassword },
      create: {
        userId: existingUser.id,
        providerId: 'credential',
        accountId: userData.email,
        password: hashedPassword,
      },
    })

    console.log(`✅ Обновлён тестовый админ: ${userData.email}`)
    return existingUser
  }

  // Создаём нового админа
  const hashedPassword = await bcrypt.hash(userData.password, 12)

  const newUser = await db.user.create({
    data: {
      email: userData.email,
      name: userData.name,
      hashedPassword,
      emailVerified: new Date(),
      role: 'ADMIN',
    },
  })

  // Создаём Account для Better Auth credential auth
  await db.account.create({
    data: {
      userId: newUser.id,
      providerId: 'credential',
      accountId: userData.email,
      password: hashedPassword,
    },
  })

  console.log(`✅ Создан новый тестовый админ: ${userData.email}`)
  return newUser
}

/**
 * Полная очистка тестовых данных
 * Порядок важен из-за foreign key constraints
 */
export async function cleanupTestData() {
  const db = await getPrisma()

  // Удаляем в правильном порядке (сначала зависимые таблицы)
  await db.orderItem.deleteMany({})
  await db.order.deleteMany({})
  await db.cartItem.deleteMany({})
  await db.cart.deleteMany({})
  await db.customOrder.deleteMany({})
  await db.wishlistItem.deleteMany({})
  await db.wishlist.deleteMany({})
  await db.productItem.deleteMany({})
  await db.variantImage.deleteMany({})
  await db.productVariant.deleteMany({})
  await db.product.deleteMany({})
  await db.productSize.deleteMany({})
  await db.image.deleteMany({})
  await db.address.deleteMany({})
  await db.userMeasurements.deleteMany({})
  await db.userProfile.deleteMany({})
  await db.companyProfile.deleteMany({})
  await db.notificationPreferences.deleteMany({})
  await db.pushSubscription.deleteMany({})
  await db.session.deleteMany({})
  await db.account.deleteMany({})
  await db.verificationToken.deleteMany({})
  await deleteTestUsers()
}

/**
 * Сброс rate limit для IP или email
 */
export async function resetRateLimit(identifier?: string) {
  const db = await getPrisma()
  if (identifier) {
    await db.loginAttempt.deleteMany({
      where: { identifier },
    })
  } else {
    // Сбрасываем все rate limits (для тестов)
    await db.loginAttempt.deleteMany({})
  }
}

/**
 * Закрытие соединения с БД
 */
export async function disconnectDb() {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}

// ============================================================
// Хелперы для работы с размерами
// ============================================================

/**
 * Получить количество размеров в БД
 */
export async function getSizesCount(): Promise<number> {
  const db = await getPrisma()
  return db.productSize.count()
}

/**
 * Получить количество размеров по полу
 */
export async function getSizesCountByGender(gender: 'FEMALE' | 'MALE'): Promise<number> {
  const db = await getPrisma()
  return db.productSize.count({ where: { gender } })
}

/**
 * Проверить существование размера по RU размеру и полу
 */
export async function sizeExists(ruSize: string, gender: 'FEMALE' | 'MALE'): Promise<boolean> {
  const db = await getPrisma()
  const size = await db.productSize.findFirst({
    where: { ru: ruSize, gender },
  })
  return size !== null
}

/**
 * Удалить все размеры (для очистки перед тестами)
 */
export async function deleteAllSizes() {
  const db = await getPrisma()
  // Сначала удаляем ProductItems которые ссылаются на размеры
  await db.productItem.deleteMany({})
  // Потом удаляем размеры
  await db.productSize.deleteMany({})
}

/**
 * Получить все размеры
 */
export async function getAllSizes() {
  const db = await getPrisma()
  return db.productSize.findMany({
    orderBy: [{ gender: 'asc' }, { sortOrder: 'asc' }],
  })
}

// ============================================================
// Хелперы для работы с товарами
// ============================================================

/**
 * Получить количество товаров в БД
 */
export async function getProductsCount(): Promise<number> {
  const db = await getPrisma()
  return db.product.count()
}

/**
 * Проверить существование товара по названию
 */
export async function productExists(name: string): Promise<boolean> {
  const db = await getPrisma()
  const product = await db.product.findFirst({
    where: { name },
  })
  return product !== null
}

/**
 * Получить товар по названию с вариантами и items
 */
export async function getProductByName(name: string) {
  const db = await getPrisma()
  return db.product.findFirst({
    where: { name },
    include: {
      variants: {
        include: {
          items: {
            include: {
              size: true,
            },
          },
          images: {
            include: {
              image: true,
            },
          },
        },
      },
    },
  })
}

/**
 * Получить товар по ID
 */
export async function getProductById(id: string) {
  const db = await getPrisma()
  return db.product.findUnique({
    where: { id },
    include: {
      variants: {
        include: {
          items: {
            include: {
              size: true,
            },
          },
          images: {
            include: {
              image: true,
            },
          },
        },
      },
    },
  })
}

/**
 * Удалить все товары (для очистки перед тестами)
 */
export async function deleteAllProducts() {
  const db = await getPrisma()
  // Удаляем в правильном порядке из-за foreign keys
  await db.orderItem.deleteMany({})
  await db.cartItem.deleteMany({})
  await db.wishlistItem.deleteMany({})
  await db.variantImage.deleteMany({})
  await db.productItem.deleteMany({})
  await db.productVariant.deleteMany({})
  await db.product.deleteMany({})
}

/**
 * Получить все товары
 */
export async function getAllProducts() {
  const db = await getPrisma()
  return db.product.findMany({
    include: {
      variants: {
        include: {
          items: true,
          images: true,
        },
      },
    },
  })
}

/**
 * Получить размер по international коду и полу
 */
export async function getSizeByInternational(international: string, gender: 'FEMALE' | 'MALE') {
  const db = await getPrisma()
  return db.productSize.findFirst({
    where: { international, gender },
  })
}

/**
 * Получить все размеры для пола
 */
export async function getSizesByGender(gender: 'FEMALE' | 'MALE') {
  const db = await getPrisma()
  return db.productSize.findMany({
    where: { gender },
    orderBy: { sortOrder: 'asc' },
  })
}

// ============================================================
// Хелперы для работы с изображениями
// ============================================================

/**
 * Получить количество изображений в БД
 */
export async function getImagesCount(): Promise<number> {
  const db = await getPrisma()
  return db.image.count()
}

/**
 * Получить количество изображений варианта (VariantImage)
 */
export async function getVariantImagesCount(variantId: string): Promise<number> {
  const db = await getPrisma()
  return db.variantImage.count({ where: { variantId } })
}

/**
 * Получить изображения варианта
 */
export async function getVariantImages(variantId: string) {
  const db = await getPrisma()
  return db.variantImage.findMany({
    where: { variantId },
    include: { image: true },
    orderBy: { order: 'asc' },
  })
}

/**
 * Получить все изображения
 */
export async function getAllImages() {
  const db = await getPrisma()
  return db.image.findMany({
    include: {
      variantImages: true,
    },
  })
}

/**
 * Удалить все изображения
 */
export async function deleteAllImages() {
  const db = await getPrisma()
  // Сначала удаляем связи
  await db.variantImage.deleteMany({})
  // Потом сами изображения
  await db.image.deleteMany({})
}

/**
 * Получить вариант по ID с изображениями
 */
export async function getVariantById(variantId: string) {
  const db = await getPrisma()
  return db.productVariant.findUnique({
    where: { id: variantId },
    include: {
      images: {
        include: { image: true },
        orderBy: { order: 'asc' },
      },
      items: {
        include: { size: true },
      },
    },
  })
}

/**
 * Получить вариант по цвету и productId
 */
export async function getVariantByColor(productId: string, color: string) {
  const db = await getPrisma()
  return db.productVariant.findFirst({
    where: { productId, color },
    include: {
      images: {
        include: { image: true },
        orderBy: { order: 'asc' },
      },
      items: {
        include: { size: true },
      },
    },
  })
}

/**
 * Получить первое изображение из БД
 */
export async function getFirstImage() {
  const db = await getPrisma()
  return db.image.findFirst({
    orderBy: { uploadedAt: 'asc' },
  })
}

/**
 * Получить имена файлов изображений
 */
export async function getImageFilenames(): Promise<string[]> {
  const db = await getPrisma()
  const images = await db.image.findMany({
    select: { filename: true },
  })
  return images.map((img: { filename: string }) => img.filename)
}

// ============================================================
// Хелперы для работы с пользователями (дополнительные)
// ============================================================

/**
 * Получить количество пользователей
 */
export async function getUsersCount(): Promise<number> {
  const db = await getPrisma()
  return db.user.count()
}

/**
 * Получить количество админов
 */
export async function getAdminsCount(): Promise<number> {
  const db = await getPrisma()
  return db.user.count({ where: { role: 'ADMIN' } })
}

/**
 * Получить всех пользователей
 */
export async function getAllUsers() {
  const db = await getPrisma()
  return db.user.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

// ============================================================
// Хелперы для работы с индивидуальными заказами (CustomOrder)
// ============================================================

/**
 * Получить количество индивидуальных заказов
 */
export async function getCustomOrdersCount(): Promise<number> {
  const db = await getPrisma()
  return db.customOrder.count()
}

/**
 * Получить количество заказов по типу
 */
export async function getCustomOrdersCountByType(
  type: 'MADE_TO_ORDER' | 'CUSTOM_DESIGN' | 'B2B_PARTNERSHIP'
): Promise<number> {
  const db = await getPrisma()
  return db.customOrder.count({ where: { type } })
}

/**
 * Получить количество заказов по статусу
 */
export async function getCustomOrdersCountByStatus(
  status: 'NEW' | 'CONFIRMED' | 'IN_PRODUCTION' | 'COMPLETED' | 'CANCELLED'
): Promise<number> {
  const db = await getPrisma()
  return db.customOrder.count({ where: { status } })
}

/**
 * Получить все индивидуальные заказы
 */
export async function getAllCustomOrders() {
  const db = await getPrisma()
  return db.customOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
      product: { select: { name: true } },
      variant: { select: { color: true } },
    },
  })
}

/**
 * Получить индивидуальный заказ по ID
 */
export async function getCustomOrderById(id: string) {
  const db = await getPrisma()
  return db.customOrder.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      product: { select: { name: true } },
      variant: { select: { color: true } },
    },
  })
}

/**
 * Получить первый индивидуальный заказ
 */
export async function getFirstCustomOrder() {
  const db = await getPrisma()
  return db.customOrder.findFirst({
    orderBy: { createdAt: 'asc' },
  })
}

// ============================================================
// Хелперы для работы с категориями
// ============================================================

/**
 * Получить количество категорий в БД
 */
export async function getCategoriesCount(): Promise<number> {
  const db = await getPrisma()
  return db.category.count()
}

/**
 * Проверить существование категории по slug
 */
export async function categoryExists(slug: string): Promise<boolean> {
  const db = await getPrisma()
  const category = await db.category.findUnique({ where: { slug } })
  return category !== null
}

/**
 * Получить категорию по slug
 */
export async function getCategoryBySlug(slug: string) {
  const db = await getPrisma()
  return db.category.findUnique({ where: { slug } })
}

/**
 * Получить категорию по ID
 */
export async function getCategoryById(id: string) {
  const db = await getPrisma()
  return db.category.findUnique({ where: { id } })
}

/**
 * Получить все категории
 */
export async function getAllCategories() {
  const db = await getPrisma()
  return db.category.findMany({
    orderBy: { sortOrder: 'asc' },
  })
}

/**
 * Удалить все категории
 */
export async function deleteAllCategories() {
  const db = await getPrisma()
  // Сначала снимаем связи с продуктами
  await db.product.updateMany({
    data: { categoryId: null },
  })
  // Потом удаляем категории
  await db.category.deleteMany({})
}

/**
 * Создать тестовую категорию
 */
export async function createTestCategory(data: { name: string; slug: string; sortOrder?: number }) {
  const db = await getPrisma()
  return db.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      sortOrder: data.sortOrder ?? 0,
    },
  })
}

/**
 * Получить количество продуктов с флагом новинки
 */
export async function getNewCollectionProductsCount(): Promise<number> {
  const db = await getPrisma()
  return db.product.count({ where: { isNewCollection: true } })
}

/**
 * Установить флаг новинки для продукта
 */
export async function setProductNewCollection(productId: string, isNew: boolean) {
  const db = await getPrisma()
  return db.product.update({
    where: { id: productId },
    data: { isNewCollection: isNew },
  })
}

/**
 * Привязать продукт к категории
 */
export async function setProductCategory(productId: string, categoryId: string | null) {
  const db = await getPrisma()
  return db.product.update({
    where: { id: productId },
    data: { categoryId },
  })
}

/**
 * Создать тестовый продукт
 */
export async function createTestProduct(data: {
  name: string
  description?: string
  gender?: 'FEMALE' | 'MALE'
  categoryId?: string
}) {
  const db = await getPrisma()
  return db.product.create({
    data: {
      name: data.name,
      description: data.description,
      gender: data.gender ?? 'FEMALE',
      categoryId: data.categoryId,
    },
  })
}

// ============================================================
// Seed функции для setup тестов
// ============================================================

/**
 * Seed размеров в БД
 * Создаёт размеры если их ещё нет
 */
export async function seedSizes(
  sizes: Array<{
    international: string
    ru: string
    de: string
    it: string
    fr: string
    uk: string
    us: string
    jeansFrom: string
    jeansTo: string
    bustMin: number
    bustMax: number
    waistMin: number
    waistMax: number
    hipsMin: number
    hipsMax: number
  }>,
  gender: 'FEMALE' | 'MALE' = 'FEMALE'
) {
  const db = await getPrisma()

  // Проверяем, есть ли уже размеры для этого пола
  const existingCount = await db.productSize.count({ where: { gender } })
  if (existingCount > 0) {
    console.log(`Размеры для ${gender} уже существуют (${existingCount} шт.), пропускаем seed`)
    return
  }

  // Создаём размеры
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i]
    await db.productSize.create({
      data: {
        international: size.international,
        ru: size.ru,
        de: size.de,
        it: size.it,
        fr: size.fr,
        uk: size.uk,
        us: size.us,
        jeansFrom: size.jeansFrom,
        jeansTo: size.jeansTo,
        bustMin: size.bustMin,
        bustMax: size.bustMax,
        waistMin: size.waistMin,
        waistMax: size.waistMax,
        hipsMin: size.hipsMin,
        hipsMax: size.hipsMax,
        gender,
        sortOrder: i,
      },
    })
  }

  console.log(`Создано ${sizes.length} размеров для ${gender}`)
}

/**
 * Seed товаров в БД
 * Создаёт товары с вариантами и SKU если их ещё нет
 */
export async function seedProducts(
  products: Array<{
    name: string
    description: string
    gender: string
    variants: Array<{
      color: string
      composition: string
      images?: string[]
      items: Array<{
        size: string
        price: number
        availableCount: number
      }>
    }>
  }>
) {
  const db = await getPrisma()

  for (const productData of products) {
    // Проверяем, существует ли товар
    const existing = await db.product.findFirst({ where: { name: productData.name } })
    if (existing) {
      console.log(`Товар "${productData.name}" уже существует, пропускаем`)
      continue
    }

    // Создаём товар
    const product = await db.product.create({
      data: {
        name: productData.name,
        description: productData.description,
        gender: productData.gender as 'FEMALE' | 'MALE',
      },
    })

    // Создаём варианты
    for (const variantData of productData.variants) {
      const variant = await db.productVariant.create({
        data: {
          productId: product.id,
          color: variantData.color,
          composition: variantData.composition,
        },
      })

      // Создаём SKU (ProductItem) для каждого размера
      for (const itemData of variantData.items) {
        // Находим размер по international коду
        const size = await db.productSize.findFirst({
          where: {
            international: itemData.size,
            gender: productData.gender as 'FEMALE' | 'MALE',
          },
        })

        if (!size) {
          console.warn(`Размер ${itemData.size} для ${productData.gender} не найден, пропускаем`)
          continue
        }

        await db.productItem.create({
          data: {
            variantId: variant.id,
            sizeId: size.id,
            price: itemData.price,
            availableCount: itemData.availableCount,
          },
        })
      }
    }

    console.log(`Создан товар "${productData.name}" с ${productData.variants.length} вариантами`)
  }
}

/**
 * Полный seed тестовых данных
 * Вызывается один раз в setup перед всеми тестами
 */
export async function seedTestData(data: {
  sizes: Array<{
    international: string
    ru: string
    de: string
    it: string
    fr: string
    uk: string
    us: string
    jeansFrom: string
    jeansTo: string
    bustMin: number
    bustMax: number
    waistMin: number
    waistMax: number
    hipsMin: number
    hipsMax: number
  }>
  products: Array<{
    name: string
    description: string
    gender: string
    variants: Array<{
      color: string
      composition: string
      images?: string[]
      items: Array<{
        size: string
        price: number
        availableCount: number
      }>
    }>
  }>
}) {
  console.log('🌱 Начинаем seed тестовых данных...')

  // Сначала размеры (товары зависят от них)
  await seedSizes(data.sizes, 'FEMALE')

  // Затем товары
  await seedProducts(data.products)

  console.log('✅ Seed тестовых данных завершён')
}
