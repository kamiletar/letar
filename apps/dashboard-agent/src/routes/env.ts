/**
 * Env Routes
 * API для записи переменных окружения в .env.docker приложений
 */

import type { FastifyInstance } from 'fastify'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import type { ApiResponse } from '../types'

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || '/home/deploy/lena'
const UMAMI_SCRIPT_URL = 'https://stats.letar.best/script.js'

export async function envRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/env-status?apps=app1,app2
   * Проверяет наличие NEXT_PUBLIC_UMAMI_WEBSITE_ID в .env.docker
   */
  fastify.get<{ Querystring: { apps?: string } }>(
    '/api/env-status',
    async (request): Promise<ApiResponse & { data?: Record<string, boolean> }> => {
      const appsParam = request.query.apps
      if (!appsParam) {
        return { success: true, data: {}, timestamp: new Date().toISOString() }
      }

      const apps = appsParam.split(',').filter((a) => /^[a-z0-9-]+$/.test(a))
      const status: Record<string, boolean> = {}

      for (const app of apps) {
        const envPath = path.join(WORKSPACE_PATH, 'apps', app, '.env.docker')
        if (existsSync(envPath)) {
          const content = readFileSync(envPath, 'utf-8')
          status[app] = content.includes('NEXT_PUBLIC_UMAMI_WEBSITE_ID=')
        } else {
          status[app] = false
        }
      }

      return { success: true, data: status, timestamp: new Date().toISOString() }
    }
  )

  /**
   * POST /api/apps/:app/env
   * Записывает переменные окружения в .env.docker приложения
   * Body: { key: string, value: string } или { websiteId: string } (для Umami)
   */
  fastify.post<{ Params: { app: string }; Body: { websiteId?: string; key?: string; value?: string } }>(
    '/api/apps/:app/env',
    async (request, reply): Promise<ApiResponse> => {
      const { app } = request.params
      const { websiteId, key, value } = request.body

      // Валидация имени приложения (защита от path traversal)
      if (!/^[a-z0-9-]+$/.test(app)) {
        return reply.status(400).send({
          success: false,
          error: 'Некорректное имя приложения',
          timestamp: new Date().toISOString(),
        })
      }

      const envPath = path.join(WORKSPACE_PATH, 'apps', app, '.env.docker')

      try {
        let content: string
        if (existsSync(envPath)) {
          content = readFileSync(envPath, 'utf-8')
        } else {
          // Проверить что директория приложения существует, создать .env.docker
          const appDir = path.join(WORKSPACE_PATH, 'apps', app)
          if (!existsSync(appDir)) {
            return reply.status(404).send({
              success: false,
              error: `Директория apps/${app} не найдена`,
              timestamp: new Date().toISOString(),
            })
          }
          content = ''
        }

        // Режим Umami — записать Website ID и Script URL
        if (websiteId) {
          if (!/^[a-f0-9-]+$/.test(websiteId)) {
            return reply.status(400).send({
              success: false,
              error: 'Некорректный websiteId',
              timestamp: new Date().toISOString(),
            })
          }

          const scriptUrlLine = `NEXT_PUBLIC_UMAMI_SCRIPT_URL=${UMAMI_SCRIPT_URL}`
          const websiteIdLine = `NEXT_PUBLIC_UMAMI_WEBSITE_ID=${websiteId}`

          if (content.includes('NEXT_PUBLIC_UMAMI_WEBSITE_ID=')) {
            content = content.replace(/NEXT_PUBLIC_UMAMI_WEBSITE_ID=.*/, websiteIdLine)
          } else {
            const block = `\n# Umami Analytics\n${scriptUrlLine}\n${websiteIdLine}\n`
            content = content.trimEnd() + '\n' + block
          }

          if (content.includes('NEXT_PUBLIC_UMAMI_SCRIPT_URL=')) {
            content = content.replace(/NEXT_PUBLIC_UMAMI_SCRIPT_URL=.*/, scriptUrlLine)
          }
        } // Режим key/value — записать произвольную переменную
        else if (key && value !== undefined) {
          if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
            return reply.status(400).send({
              success: false,
              error: 'Некорректное имя переменной',
              timestamp: new Date().toISOString(),
            })
          }

          const line = `${key}=${value}`
          if (content.includes(`${key}=`)) {
            content = content.replace(new RegExp(`${key}=.*`), line)
          } else {
            content = content.trimEnd() + '\n' + line + '\n'
          }
        } else {
          return reply.status(400).send({
            success: false,
            error: 'Нужен websiteId или key+value',
            timestamp: new Date().toISOString(),
          })
        }

        writeFileSync(envPath, content, 'utf-8')

        return {
          success: true,
          timestamp: new Date().toISOString(),
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
        return reply.status(500).send({
          success: false,
          error: `Не удалось записать .env.docker: ${message}`,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )
}
