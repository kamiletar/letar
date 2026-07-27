/**
 * Каталог для JSON-хранилищ в dev-режиме — папка внутри репозитория, а не системный
 * userData, чтобы тестовые данные не смешивались с реальными профилями пользователя.
 * В production undefined — `createJsonStore` берёт `app.getPath('userData')` сам.
 */
import { app } from 'electron'
import { join } from 'node:path'

export function devDataDir(): string | undefined {
  return app.isPackaged ? undefined : join(__dirname, '../../prisma/data')
}
