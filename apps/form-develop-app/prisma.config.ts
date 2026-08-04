import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

// Загружаем .env.local, затем .env (как Next.js)
config({ path: '.env.local' })
config({ path: '.env' })

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
