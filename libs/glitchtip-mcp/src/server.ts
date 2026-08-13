/**
 * MCP-сервер glitchtip-mcp — read-only доступ к self-hosted GlitchTip (errors.s3.letar.best)
 * через её REST API вместо ручных curl/PowerShell в теле команды `/infra:glitchtip-errors`.
 * Только чтение: сервер не резолвит/не игнорирует issues и ничего не мутирует на стороне
 * GlitchTip — см. infra/glitchtip/README.md § «Что не сделано» про осознанное решение не
 * автоматизировать write-действия здесь.
 */

import { errorText, pretty, text } from '@letar/mcp-server-kit'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getLatestIssueEvent, listIssues, listProjects } from './client.js'

export function createGlitchtipMcpServer(): McpServer {
  const server = new McpServer({ name: '@letar/glitchtip-mcp', version: '0.1.0' }, { capabilities: { tools: {} } })

  // ─── glitchtip_list_projects ─────────────────────────────────────────────────
  server.tool(
    'glitchtip_list_projects',
    'Список всех проектов, подключённых к GlitchTip (slug, name, id) — slug совпадает с именем приложения.',
    {},
    async () => {
      try {
        const projects = await listProjects()
        return text(`📋 Проектов в GlitchTip: ${projects.length}\n\n${pretty(projects)}`)
      } catch (err) {
        return errorText(`❌ glitchtip_list_projects: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )

  // ─── glitchtip_list_issues ───────────────────────────────────────────────────
  server.tool(
    'glitchtip_list_issues',
    'Необработанные issues проекта, отсортированные по частоте (по умолчанию is:unresolved за 14 дней).',
    {
      project: z.string().min(1).describe('Slug проекта в GlitchTip, совпадает с именем приложения'),
      environment: z.string().optional().describe('Фильтр по окружению, напр. "production" или "staging"'),
      statsPeriod: z.string().optional().describe(
        'Период статистики GlitchTip, напр. "24h"/"14d"/"90d", по умолчанию 14d',
      ),
      status: z.enum(['unresolved', 'resolved', 'ignored']).optional().describe('По умолчанию unresolved'),
      limit: z.number().int().min(1).max(100).optional().describe('Максимум issues, по умолчанию 25'),
    },
    async ({ project, environment, statsPeriod, status, limit }) => {
      try {
        const issues = await listIssues(project, { environment, statsPeriod, status, limit })
        if (issues.length === 0) {
          return text(`✅ ${project}: issues по фильтру не найдено.`)
        }
        return text(`🐞 ${project} — issues: ${issues.length}\n\n${pretty(issues)}`)
      } catch (err) {
        return errorText(`❌ glitchtip_list_issues(${project}): ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )

  // ─── glitchtip_get_issue_event ───────────────────────────────────────────────
  server.tool(
    'glitchtip_get_issue_event',
    'Последнее событие issue — сообщение и стектрейс. issueId берётся из glitchtip_list_issues (поле id), не project slug.',
    { issueId: z.string().min(1).describe('id issue из glitchtip_list_issues') },
    async ({ issueId }) => {
      try {
        const event = await getLatestIssueEvent(issueId)
        return text(`🔎 Событие issue ${issueId}:\n\n${pretty(event)}`)
      } catch (err) {
        return errorText(
          `❌ glitchtip_get_issue_event(${issueId}): ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    },
  )

  return server
}
