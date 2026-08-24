import { loadEnvCascade } from '@letar/env-load'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '../src/generated/prisma'
loadEnvCascade(undefined, ['.env.local'])

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
