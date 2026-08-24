import { loadEnvCascade } from '@letar/env-load'
import { defineConfig, env } from 'prisma/config'

loadEnvCascade()

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
