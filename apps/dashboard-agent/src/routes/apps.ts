/**
 * Apps Routes
 * API для получения конфигурации приложений (NPM proxy host config)
 */

import type { FastifyInstance } from 'fastify'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import type { ApiResponse } from '../types'

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || '/home/deploy/lena'

/** Конфигурация NPM proxy host для приложения */
interface AppNpmConfig {
  name: string
  containerName: string
  port: number
  domains: string[]
}

/**
 * Парсит .env.docker файл и возвращает объект с переменными
 */
function parseEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {}
  if (!existsSync(filePath)) {
    return result
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) {
        continue
      }
      const key = trimmed.substring(0, eqIndex).trim()
      let value = trimmed.substring(eqIndex + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      result[key] = value
    }
  } catch {
    // Файл недоступен
  }

  return result
}

export async function appsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/apps/:app/npm-config
   * Возвращает конфигурацию приложения для NPM proxy host
   * Читает DOMAIN из .env.docker в workspace
   */
  fastify.get<{ Params: { app: string } }>(
    '/api/apps/:app/npm-config',
    async (request): Promise<ApiResponse<AppNpmConfig>> => {
      const { app } = request.params

      // Читаем DOMAIN из .env.docker файла приложения (без захардкоженного списка)
      const envPath = path.join(WORKSPACE_PATH, 'apps', app, '.env.docker')
      const env = parseEnvFile(envPath)

      const domainsRaw = env['DOMAIN'] || ''
      const domains = domainsRaw
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean)

      // Порт из .env.docker или стандартный 3000
      const port = parseInt(env['PORT'] || '3000', 10)

      return {
        success: true,
        data: {
          name: app,
          containerName: `${app}-app`,
          port,
          domains,
        },
        timestamp: new Date().toISOString(),
      }
    }
  )
}
