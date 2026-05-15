import * as bcrypt from 'bcryptjs'
import { Gender, PrismaClient, UserRole } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Создаём админа
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rosstil.ru' },
    update: {},
    create: {
      email: 'admin@rosstil.ru',
      name: 'Администратор',
      hashedPassword: adminPassword,
      role: UserRole.ADMIN,
      emailVerified: new Date(),
    },
  })
  console.log('✅ Admin created:', admin.email)

  // Создаём обычного пользователя
  const userPassword = await bcrypt.hash('user123', 10)
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'Тестовый пользователь',
      hashedPassword: userPassword,
      role: UserRole.USER,
      emailVerified: new Date(),
      phoneNumber: '+79001234567',
    },
  })
  console.log('✅ User created:', user.email)

  // Создаём размеры (женские)
  const sizes = [
    {
      gender: Gender.FEMALE,
      international: 'XS',
      ru: '40-42',
      de: '32-34',
      it: '38-40',
      fr: '34-36',
      uk: '6-8',
      us: '2-4',
      jeansFrom: '24',
      jeansTo: '25',
      bustMin: 76,
      bustMax: 83,
      waistMin: 58,
      waistMax: 62,
      hipsMin: 84,
      hipsMax: 91,
      sortOrder: 1,
    },
    {
      gender: Gender.FEMALE,
      international: 'S',
      ru: '44',
      de: '36',
      it: '42',
      fr: '38',
      uk: '10',
      us: '6',
      jeansFrom: '26',
      jeansTo: '27',
      bustMin: 84,
      bustMax: 87,
      waistMin: 63,
      waistMax: 67,
      hipsMin: 92,
      hipsMax: 95,
      sortOrder: 2,
    },
    {
      gender: Gender.FEMALE,
      international: 'M',
      ru: '46',
      de: '38',
      it: '44',
      fr: '40',
      uk: '12',
      us: '8',
      jeansFrom: '28',
      jeansTo: '29',
      bustMin: 88,
      bustMax: 91,
      waistMin: 68,
      waistMax: 72,
      hipsMin: 96,
      hipsMax: 99,
      sortOrder: 3,
    },
  ]

  for (const sizeData of sizes) {
    await prisma.productSize.upsert({
      where: { ru_gender: { ru: sizeData.ru, gender: sizeData.gender } },
      update: {},
      create: sizeData,
    })
  }
  console.log('✅ Sizes created:', sizes.length)

  // Получаем созданные размеры
  const createdSizes = await prisma.productSize.findMany({
    where: { gender: Gender.FEMALE },
    orderBy: { sortOrder: 'asc' },
  })

  // Создаём продукт
  const product = await prisma.product.create({
    data: {
      name: 'Тестовое платье',
      description: 'Элегантное платье для особых случаев',
      gender: Gender.FEMALE,
      variants: {
        create: {
          color: 'Чёрный',
          composition: '95% хлопок, 5% эластан',
          items: {
            create: createdSizes.map((size, index) => ({
              sizeId: size.id,
              price: 5900 + index * 200,
              availableCount: index === 0 ? 0 : 5, // Первый размер - нет в наличии
            })),
          },
          images: {
            create: [
              {
                url: '/video/1.mp4', // Используем временно видео как placeholder
                alt: 'Тестовое платье - вид спереди',
                order: 0,
              },
            ],
          },
        },
      },
    },
  })
  console.log('✅ Product created:', product.name)

  console.log('🎉 Seed completed!')
  console.log('\n📝 Test credentials:')
  console.log('Admin: admin@rosstil.ru / admin123')
  console.log('User: user@example.com / user123')
  console.log('\n🔗 Open: http://localhost:3000')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
