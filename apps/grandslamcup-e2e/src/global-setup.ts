/**
 * Глобальная настройка: авторизация admin через dev-session endpoint.
 * Сохраняет storageState для тестов, требующих авторизации.
 */

import type { FullConfig } from '@playwright/test'
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

export const ADMIN_STORAGE_STATE = resolve(__dirname, '../playwright/.auth/admin.json')

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3016'

  // Создаём директорию для auth state
  const authDir = resolve(__dirname, '../playwright/.auth')
  if (!existsSync(authDir)) {
    mkdirSync(authDir, { recursive: true })
  }

  // Авторизуемся через dev-session endpoint
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(`${baseURL}/api/auth/dev-session?email=admin@grandslamcup.ru&redirect=/admin`)
    await page.waitForURL('**/admin**', { timeout: 30_000 })

    // Сохраняем cookies в storageState
    await context.storageState({ path: ADMIN_STORAGE_STATE })
    console.log('[Global Setup] Admin авторизован, storageState сохранён')
  } catch (error) {
    console.error('[Global Setup] Ошибка авторизации:', error)
    throw error
  } finally {
    await browser.close()
  }
}
