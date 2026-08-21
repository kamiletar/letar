import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

// Загружаем .env.local, затем .env (как Next.js)
config({ path: '.env.local' })
config({ path: '.env' })

export default defineConfig({
  schema: 'src/generated/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Без этого ключа `prisma db seed` печатает подсказку "No seed command configured" и
    // завершается exit 0, ни разу не запустив seed.ts — деплой репортует "успех" для сида,
    // который физически не выполнялся (agent-mail e2e-gate-status-form-example-kami, 2026-08-21).
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
