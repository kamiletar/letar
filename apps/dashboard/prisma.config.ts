import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

// Загружаем .env.local, затем .env.docker
config({ path: '.env.local', quiet: true })
config({ path: '.env.docker', quiet: true })

export default defineConfig({
  schema: 'src/generated/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  seed: {
    command: 'bun prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
