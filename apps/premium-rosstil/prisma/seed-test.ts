import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with test data...')

  // Create test users
  const testUserEmail = 'user@test.com'
  const testAdminEmail = 'admin@test.com'

  // Check if users already exist
  const existingUser = await prisma.user.findUnique({
    where: { email: testUserEmail },
  })

  const existingAdmin = await prisma.user.findUnique({
    where: { email: testAdminEmail },
  })

  // Create test USER
  if (!existingUser) {
    await prisma.user.create({
      data: {
        email: testUserEmail,
        name: 'Test User',
        role: 'USER',
        emailVerified: new Date(),
      },
    })
    console.log(`✅ Created test USER: ${testUserEmail}`)
  } else {
    console.log(`ℹ️  Test USER already exists: ${testUserEmail}`)
  }

  // Create test ADMIN
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: testAdminEmail,
        name: 'Test Admin',
        role: 'ADMIN',
        emailVerified: new Date(),
      },
    })
    console.log(`✅ Created test ADMIN: ${testAdminEmail}`)
  } else {
    console.log(`ℹ️  Test ADMIN already exists: ${testAdminEmail}`)
  }

  // Create test products
  const product1 = await prisma.product.upsert({
    where: { id: 'test-product-1' },
    update: {},
    create: {
      id: 'test-product-1',
      name: 'Тестовое Платье',
      variants: {
        create: [
          {
            color: 'Чёрный',
            composition: '100% хлопок',
            images: {
              create: [
                {
                  url: 'https://placehold.co/600x800/000000/FFFFFF/png?text=Black+Dress',
                  alt: 'Тестовое платье чёрного цвета',
                  order: 0,
                },
              ],
            },
            items: {
              create: [
                {
                  size: 'S',
                  price: 5000,
                },
                {
                  size: 'M',
                  price: 5500,
                },
                {
                  size: 'L',
                  price: 6000,
                },
              ],
            },
          },
          {
            color: 'Белый',
            composition: '100% хлопок',
            images: {
              create: [
                {
                  url: 'https://placehold.co/600x800/FFFFFF/000000/png?text=White+Dress',
                  alt: 'Тестовое платье белого цвета',
                  order: 0,
                },
              ],
            },
            items: {
              create: [
                {
                  size: 'S',
                  price: 5000,
                },
                {
                  size: 'M',
                  price: 5500,
                },
              ],
            },
          },
        ],
      },
    },
  })

  const product2 = await prisma.product.upsert({
    where: { id: 'test-product-2' },
    update: {},
    create: {
      id: 'test-product-2',
      name: 'Тестовая Юбка',
      variants: {
        create: [
          {
            color: 'Синий',
            composition: '95% хлопок, 5% эластан',
            images: {
              create: [
                {
                  url: 'https://placehold.co/600x800/0000FF/FFFFFF/png?text=Blue+Skirt',
                  alt: 'Тестовая юбка синего цвета',
                  order: 0,
                },
              ],
            },
            items: {
              create: [
                {
                  size: 'XS',
                  price: 3000,
                },
                {
                  size: 'S',
                  price: 3500,
                },
                {
                  size: 'M',
                  price: 4000,
                },
              ],
            },
          },
        ],
      },
    },
  })

  const product3 = await prisma.product.upsert({
    where: { id: 'test-product-3' },
    update: {},
    create: {
      id: 'test-product-3',
      name: 'Тестовая Блузка',
      variants: {
        create: [
          {
            color: 'Красный',
            composition: '100% шёлк',
            images: {
              create: [
                {
                  url: 'https://placehold.co/600x800/FF0000/FFFFFF/png?text=Red+Blouse',
                  alt: 'Тестовая блузка красного цвета',
                  order: 0,
                },
              ],
            },
            items: {
              create: [
                {
                  size: 'M',
                  price: 7000,
                },
                {
                  size: 'L',
                  price: 7500,
                },
              ],
            },
          },
        ],
      },
    },
  })

  console.log('✅ Created test products:', {
    product1: product1.name,
    product2: product2.name,
    product3: product3.name,
  })

  console.log('')
  console.log('🎉 Seed completed successfully!')
  console.log('')
  console.log('📝 Test credentials:')
  console.log(`   USER:  ${testUserEmail}`)
  console.log(`   ADMIN: ${testAdminEmail}`)
  console.log('')
  console.log('📦 Created 3 test products with variants and images')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
