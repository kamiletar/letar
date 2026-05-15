import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Начальные продукты
  await prisma.product.createMany({
    data: [
      {
        name: 'Wireless Headphones',
        description: 'Premium noise-cancelling headphones with 30h battery',
        price: 199.99,
        status: 'ACTIVE',
        tags: ['audio', 'wireless', 'premium'],
        rating: 5,
      },
      {
        name: 'Mechanical Keyboard',
        description: 'Cherry MX switches, RGB backlight, USB-C',
        price: 149.99,
        status: 'ACTIVE',
        tags: ['peripherals', 'gaming'],
        rating: 4,
      },
      {
        name: 'USB-C Hub',
        description: '7-in-1 hub with HDMI, USB 3.0, SD card reader',
        price: 49.99,
        status: 'DRAFT',
        tags: ['accessories'],
        rating: 3,
      },
      {
        name: 'Webcam 4K',
        description: 'Auto-focus, built-in mic, privacy shutter',
        price: 89.99,
        status: 'ARCHIVED',
        tags: ['video', 'streaming'],
        rating: 4,
      },
    ],
    skipDuplicates: true,
  })

  // Начальные контакты
  await prisma.contact.createMany({
    data: [
      {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'SUPPORT',
        message: 'How do I integrate @letar/forms with my existing Next.js project?',
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        subject: 'FEEDBACK',
        message: 'Great library! Love the ZenStack integration. Would be nice to have more examples.',
      },
    ],
    skipDuplicates: true,
  })

  console.log('Seed data created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
