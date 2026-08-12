/**
 * MCP-сервер umami-mcp — доступ к self-hosted Umami (stats.letar.best) через её REST API вместо
 * браузерной автоматизации с вводом пароля (см. .claude/docs/mcp-servers.md — деплой-агент и
 * dashboard уже ходят в Umami тем же способом, здесь тот же клиент оформлен в MCP-инструменты).
 */

import { errorText, pretty, text } from '@letar/mcp-server-kit'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { createWebsite, findWebsiteByDomain, getWebsiteStats, listWebsites } from './client.js'

const PERIOD = z.enum(['1h', '24h', '7d', '30d'])

export function createUmamiMcpServer(): McpServer {
  const server = new McpServer({ name: '@letar/umami-mcp', version: '0.1.0' }, { capabilities: { tools: {} } })

  // ─── umami_list_websites ─────────────────────────────────────────────────────
  server.tool(
    'umami_list_websites',
    'Список всех сайтов, заведённых в Umami (имя, домен, id, дата создания).',
    {},
    async () => {
      try {
        const sites = await listWebsites()
        return text(`📊 Сайтов в Umami: ${sites.length}\n\n${pretty(sites)}`)
      } catch (err) {
        return errorText(`❌ umami_list_websites: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )

  // ─── umami_find_website ──────────────────────────────────────────────────────
  server.tool(
    'umami_find_website',
    'Проверить, заведён ли домен в Umami — точное совпадение по полю domain.',
    { domain: z.string().min(1).describe('Домен без протокола, напр. "domwellbes.ru"') },
    async ({ domain }) => {
      try {
        const site = await findWebsiteByDomain(domain)
        if (!site) {
          return text(`ℹ️ Домен "${domain}" в Umami не найден.`)
        }
        return text(`✅ Найден:\n\n${pretty(site)}`)
      } catch (err) {
        return errorText(`❌ umami_find_website(${domain}): ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )

  // ─── umami_get_website_stats ─────────────────────────────────────────────────
  server.tool(
    'umami_get_website_stats',
    'Статистика сайта (pageviews/visitors/visits/bounces/totaltime) за период.',
    {
      websiteId: z.string().min(1).describe('id сайта в Umami — см. umami_list_websites/umami_find_website'),
      period: PERIOD.optional().describe('Период: 1h/24h/7d/30d, по умолчанию 24h'),
    },
    async ({ websiteId, period }) => {
      try {
        const stats = await getWebsiteStats(websiteId, period ?? '24h')
        return text(`📈 Статистика (${period ?? '24h'}):\n\n${pretty(stats)}`)
      } catch (err) {
        return errorText(
          `❌ umami_get_website_stats(${websiteId}): ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    },
  )

  // ─── umami_create_website ────────────────────────────────────────────────────
  server.tool(
    'umami_create_website',
    'Завести новый сайт в Umami (POST /api/websites). Возвращает websiteId — его нужно положить '
      + 'в .env.docker.enc приложения (NEXT_PUBLIC_UMAMI_WEBSITE_ID) и в docker-compose.production.yml.',
    {
      name: z.string().min(1).describe('Отображаемое имя сайта в панели Umami'),
      domain: z.string().min(1).describe('Домен без протокола, напр. "domwellbes.ru"'),
    },
    async ({ name, domain }) => {
      try {
        const site = await createWebsite(name, domain)
        return text(`✅ Сайт создан:\n\n${pretty(site)}`)
      } catch (err) {
        return errorText(`❌ umami_create_website(${domain}): ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )

  return server
}
