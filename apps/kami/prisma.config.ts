import { loadEnvCascade } from '@letar/env-load'
import { defineConfig, env } from 'prisma/config'

loadEnvCascade()

export default defineConfig({
  schema: 'src/generated/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Без этого ключа `prisma db seed` печатает подсказку "No seed command configured" и
    // завершается exit 0, ни разу не запустив seed.ts — деплой репортует "успех" для сида,
    // который физически не выполнялся (agent-mail e2e-gate-status-form-example-kami, 2026-08-21).
    // ⚠️ `npx tsx` — на сервере `npx` резолвит tsx не из локального bun-managed node_modules
    // (PM монорепо — Bun, не npm) и падает на `Cannot find module '../src/generated/prisma'`
    // при импорте относительного пути внутри seed.ts, хотя тот же файл через `bun ./prisma/seed.ts`
    // и через прямой вызов локального tsx.exe отрабатывает штатно (проверено локально). `bun` —
    // рантайм этого монорепо, умеет TS нативно, лишнее звено `tsx`/`npx` не нужно вовсе.
    seed: 'bun ./prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
