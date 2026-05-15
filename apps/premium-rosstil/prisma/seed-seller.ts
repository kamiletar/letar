import { ZenStackClient } from '@zenstackhq/orm'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { schema } from '../src/generated/schema'

/**
 * Миграция данных: создание Seller-профиля для Елены (ADMIN)
 * и привязка всех товаров к этому продавцу.
 *
 * Запуск: bun apps/premium-rosstil/prisma/seed-seller.ts
 */

const orm = new ZenStackClient(schema, {
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
})

async function main() {
  console.log('🏪 Миграция данных: создание Seller...')

  // 1. Найти ADMIN (Елена)
  const admin = await orm.user.findFirst({
    where: { role: 'ADMIN' },
  })

  if (!admin) {
    throw new Error('ADMIN пользователь не найден. Сначала запустите seed.ts')
  }

  console.log(`✅ Найден ADMIN: ${admin.email}`)

  // 2. Создать Seller (upsert по userId)
  const seller = await orm.seller.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      shopName: 'Премиум РосСтиль',
      slug: 'premium-rosstil',
      commissionRate: 0, // Владелец — без комиссии
      status: 'ACTIVE',
      taxSystem: 'IP_USN',
      contactEmail: admin.email,
    },
  })

  console.log(`✅ Seller создан: ${seller.shopName} (${seller.id})`)

  // 3. Создать SellerBalance
  await orm.sellerBalance.upsert({
    where: { sellerId: seller.id },
    update: {},
    create: {
      sellerId: seller.id,
      availableAmount: 0,
      pendingAmount: 0,
      reservedAmount: 0,
    },
  })

  console.log('✅ SellerBalance создан')

  // 4. Привязать все Product без sellerId к Seller Елены
  const result = await orm.product.updateMany({
    where: { sellerId: null as unknown as string },
    data: { sellerId: seller.id },
  })

  console.log(`✅ Обновлено товаров: ${result.count}`)

  // 5. Проверка
  const totalProducts = await orm.product.count()
  const productsWithSeller = await orm.product.count({ where: { sellerId: seller.id } })
  console.log(`✅ Товаров всего: ${totalProducts}, привязано к продавцу: ${productsWithSeller}`)

  console.log('🎉 Миграция завершена!')
}

main()
  .catch((e) => {
    console.error('❌ Миграция не удалась:', e)
    process.exit(1)
  })
  .finally(async () => {
    await orm.$disconnect()
  })
