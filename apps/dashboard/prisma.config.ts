import { loadEnvCascade } from '@letar/env-load'
import { defineConfig, env } from 'prisma/config'

loadEnvCascade(undefined, ['.env.local', '.env.docker'])

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
