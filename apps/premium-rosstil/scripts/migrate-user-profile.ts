/**
 * Migration script: Copy data from User.{image, gender, birthdate, phoneNumber}
 * to new UserProfile table.
 *
 * Run with: npx tsx scripts/migrate-user-profile.ts
 */

// Note: Run with `bun --env-file=.env.local run scripts/migrate-user-profile.ts`
import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting migration: User -> UserProfile\n')

  // Get all users with any profile data
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { image: { not: null } },
        { gender: { not: null } },
        { birthdate: { not: null } },
        { phoneNumber: { not: null } },
      ],
    },
    select: {
      id: true,
      email: true,
      image: true,
      gender: true,
      birthdate: true,
      phoneNumber: true,
      profile: { select: { id: true } },
    },
  })

  console.log(`Found ${users.length} users with profile data to migrate\n`)

  let created = 0
  let skipped = 0
  let errors = 0

  for (const user of users) {
    // Skip if user already has a profile
    if (user.profile) {
      console.log(`  [SKIP] ${user.email} - already has UserProfile`)
      skipped++
      continue
    }

    try {
      await prisma.userProfile.create({
        data: {
          userId: user.id,
          image: user.image,
          gender: user.gender,
          birthdate: user.birthdate,
          phoneNumber: user.phoneNumber,
        },
      })
      console.log(`  [OK] ${user.email} - created UserProfile`)
      created++
    } catch (error) {
      console.error(`  [ERROR] ${user.email}:`, error)
      errors++
    }
  }

  console.log('\n--- Migration Summary ---')
  console.log(`  Created: ${created}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Errors: ${errors}`)
  console.log(`  Total: ${users.length}`)
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
