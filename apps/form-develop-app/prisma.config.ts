import { loadEnvCascade } from '@letar/env-load'
import { defineConfig, env } from 'prisma/config'

loadEnvCascade()

export default defineConfig({
  schema: 'src/generated/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
    // Prisma 7 требует shadow-БД явно для `migrate diff --from-migrations` и `migrate dev`.
    // ⚠️ Не через env() — она бросает исключение, если переменной вообще нет в process.env,
    // даже если текущая Prisma-команда её не использует (например `generate`).
    shadowDatabaseUrl: process.env['SHADOW_DATABASE_URL'],
  },
})
