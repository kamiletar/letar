import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

// Загружаем .env.local, затем .env (как Next.js)
config({ path: '.env.local', quiet: true })
config({ path: '.env', quiet: true })

export default defineConfig({
  schema: 'src/generated/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
