/**
 * DB-хелперы для E2E тестов svoichuzhie
 *
 * Создаёт тестовых пользователей напрямую в БД через Prisma CJS wrapper.
 */
import { config } from 'dotenv'
import { randomBytes, scryptSync } from 'node:crypto'
import { resolve } from 'path'

// Better Auth scrypt format: `${salt_hex}:${key_hex}` (N=16384, r=16, p=1, dkLen=64)
// scryptSync вместо promisify(scrypt) — util.promisify теряет перегрузку с options-объектом
// (4 аргумента), типизация резолвится в 3-арг сигнатуру (TS2554). Тестовый setup-код —
// синхронность не критична.
async function hashPasswordBetterAuth(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const key = scryptSync(Buffer.from(password.normalize('NFKC')), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  })
  return `${salt}:${key.toString('hex')}`
}

const projectDir = resolve(__dirname, '../../../svoichuzhie')
config({ path: resolve(projectDir, '.env.local') })
config({ path: resolve(projectDir, '.env') })

type AnyPrisma = { user: Record<string, unknown>; account: Record<string, unknown> }

let prisma: AnyPrisma | null = null

async function getPrisma(): Promise<AnyPrisma> {
  if (!prisma) {
    const mod = require('./prisma-cjs-wrapper')
    prisma = mod.createPrismaClient() as AnyPrisma
  }
  return prisma
}

/** Создаёт или обновляет тестового пользователя. Возвращает userId. */
export async function createTestUser(data: {
  email: string
  password: string
  name: string
  role?: 'USER' | 'ADMIN'
}): Promise<string> {
  const db = (await getPrisma()) as any
  const hashedPassword = await hashPasswordBetterAuth(data.password)
  const role = data.role ?? 'USER'

  const existing = await db.user.findUnique({ where: { email: data.email } })

  let userId: string

  if (existing) {
    await db.user.update({
      where: { email: data.email },
      data: { name: data.name, emailVerified: true, role },
    })
    userId = existing.id
    await db.account.upsert({
      where: { providerId_accountId: { providerId: 'credential', accountId: data.email } },
      update: { password: hashedPassword },
      create: { userId, providerId: 'credential', accountId: data.email, password: hashedPassword },
    })
    console.log(`  ✓ Updated user: ${data.email}`)
  } else {
    const user = await db.user.create({
      data: { email: data.email, name: data.name, emailVerified: true, role },
    })
    userId = user.id
    await db.account.create({
      data: { userId, providerId: 'credential', accountId: data.email, password: hashedPassword },
    })
    console.log(`  ✓ Created user: ${data.email}`)
  }

  return userId
}

/** Создаёт FanMember запись для пользователя (если не существует). */
export async function ensureFanMember(userId: string): Promise<void> {
  const db = (await getPrisma()) as any
  const existing = await db.fanMember.findUnique({ where: { userId } })
  if (!existing) {
    await db.fanMember.create({
      data: { userId, tier: 'STANDARD', consentPersonal: true, consentMarketing: true, consentedAt: new Date() },
    })
    console.log(`  ✓ FanMember created for userId=${userId}`)
  }
}

export interface TestProduct {
  productId: string
  variantId: string
  slug: string
  price: number
}

/** Создаёт (идемпотентно) тестовый товар с одним вариантом для E2E чекаута. */
export async function ensureTestProduct(): Promise<TestProduct> {
  const db = (await getPrisma()) as any
  const price = 150000 // 1500 ₽

  const category = await db.category.upsert({
    where: { slug: 'e2e-test-cat' },
    update: {},
    create: { slug: 'e2e-test-cat', name: 'E2E' },
  })

  const product = await db.product.upsert({
    where: { slug: 'e2e-test-product' },
    update: { isPublished: true },
    create: {
      slug: 'e2e-test-product',
      name: 'E2E тестовый товар',
      isPublished: true,
      categoryId: category.id,
      weightG: 200,
      lengthCm: 30,
      widthCm: 20,
      heightCm: 3,
    },
  })

  const variant = await db.productVariant.upsert({
    where: { sku: 'E2E-M' },
    update: { stock: 999, price },
    create: { productId: product.id, sku: 'E2E-M', name: 'M', size: 'M', stock: 999, price },
  })

  return { productId: product.id, variantId: variant.id, slug: product.slug, price }
}

/** Создаёт оплаченный заказ с ненулевой deliveryCost для проверки страницы /merch/orders/[token]. */
export async function createTestOrderWithDelivery(
  product: TestProduct,
  deliveryCost: number
): Promise<{ accessToken: string }> {
  const db = (await getPrisma()) as any

  const order = await db.order.create({
    data: {
      email: 'e2e-order@svoichuzhie.test',
      name: 'E2E Покупатель',
      deliveryType: 'PVZ',
      pvzAddress: 'ул. Красная Пресня, 28, Москва',
      deliveryCost,
      totalAmount: product.price,
      originalAmount: product.price,
      status: 'PAID',
      items: {
        create: {
          productId: product.productId,
          variantId: product.variantId,
          quantity: 1,
          price: product.price,
          productName: 'E2E тестовый товар (M)',
        },
      },
    },
    select: { accessToken: true },
  })

  return { accessToken: order.accessToken }
}

/** Закрывает соединение с БД. */
export async function disconnectDb(): Promise<void> {
  if (prisma) {
    await (prisma as any).$disconnect()
    prisma = null
  }
}
