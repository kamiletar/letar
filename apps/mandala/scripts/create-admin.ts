import bcrypt from 'bcryptjs'
import { config } from 'dotenv'
import { PrismaClient } from '../src/generated/prisma'
config({ path: '.env.local', quiet: true })

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('Admin123', 10)

  const user = await prisma.user.upsert({
    where: { email: 'test@admin.dev' },
    update: { role: 'ADMIN', password: hashedPassword, emailVerified: new Date() },
    create: {
      email: 'test@admin.dev',
      name: 'Test Admin',
      password: hashedPassword,
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  })

  console.log('Created admin:', user.email, user.role)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
