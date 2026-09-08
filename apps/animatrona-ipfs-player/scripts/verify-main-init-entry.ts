// Точка входа для bundling — см. verify-main-init.cjs и .claude/rules/electron.md
// `__non_webpack_require__` в database.ts webpack подставляет автоматически (защита от
// статического бандлинга fts5-sql-bundle) — под bun build для верификации подставляем сами.
;(globalThis as unknown as { __non_webpack_require__: NodeRequire }).__non_webpack_require__ = require

import { app } from 'electron'
import { registerIpcHandlers } from '../main/ipc'
import { initializeDatabase } from '../main/services/database'
import { closePrismaClient, getPrismaClient, initializePrismaDb } from '../main/utils/db'

process.on('uncaughtException', (error) => {
  console.error('[FAIL] uncaughtException:', error)
  process.exit(1)
})

app.whenReady().then(async () => {
  try {
    await initializeDatabase()
    await initializePrismaDb()
    registerIpcHandlers(() => null)

    const db = getPrismaClient()
    const trackerCount = await db.tracker.count()
    const settingsCount = await db.settings.count()
    console.log('[OK] initializeDatabase + initializePrismaDb + registerIpcHandlers прошли без ошибок')
    console.log(`[OK] tracker.count() = ${trackerCount}, settings.count() = ${settingsCount}`)

    await closePrismaClient()
    app.exit(0)
  } catch (error) {
    console.error('[FAIL]', error)
    app.exit(1)
  }
})
