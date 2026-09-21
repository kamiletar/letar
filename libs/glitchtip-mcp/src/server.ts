/**
 * MCP-сервер glitchtip-mcp — доступ к self-hosted GlitchTip (errors.s3.letar.best) через её
 * REST API вместо ручных curl/PowerShell в теле команды `/infra:glitchtip-errors`.
 * Читает issues и события; единственная запись — `glitchtip_set_issue_status` (закрыть/
 * игнорировать/переоткрыть группу), вызывается только по явной просьбе пользователя.
 */

import { errorText, pretty, text } from '@letar/mcp-server-kit'
import { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { getLatestIssueEvent, listIssues, listProjects, setIssueStatus } from './client.js'

export function createGlitchtipMcpServer(): McpServer {
  const server = new McpServer({ name: '@letar/glitchtip-mcp', version: '0.1.0' }, { capabilities: { tools: {} } })

  // ─── glitchtip_list_projects ─────────────────────────────────────────────────
  server.registerTool('glitchtip_list_projects', {
    description:
      'Список всех проектов, подключённых к GlitchTip (slug, name, id) — slug совпадает с именем приложения.',
    inputSchema: z.object({}),
  }, async () => {
    try {
      const projects = await listProjects()
      return text(`📋 Проектов в GlitchTip: ${projects.length}\n\n${pretty(projects)}`)
    } catch (err) {
      return errorText(`❌ glitchtip_list_projects: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  // ─── glitchtip_list_issues ───────────────────────────────────────────────────
  server.registerTool('glitchtip_list_issues', {
    description: 'Необработанные issues проекта, отсортированные по частоте (по умолчанию is:unresolved за 14 дней).',
    inputSchema: z.strictObject({
      project: z.string().min(1).describe('Slug проекта в GlitchTip, совпадает с именем приложения'),
      environment: z.string().optional().describe('Фильтр по окружению, напр. "production" или "staging"'),
      statsPeriod: z.string().optional().describe(
        'Период статистики GlitchTip, напр. "24h"/"14d"/"90d", по умолчанию 14d',
      ),
      status: z.enum(['unresolved', 'resolved', 'ignored']).optional().describe('По умолчанию unresolved'),
      limit: z.number().int().min(1).max(100).optional().describe('Максимум issues, по умолчанию 25'),
    }),
  }, async ({ project, environment, statsPeriod, status, limit }) => {
    try {
      const issues = await listIssues(project, { environment, statsPeriod, status, limit })
      if (issues.length === 0) {
        return text(`✅ ${project}: issues по фильтру не найдено.`)
      }
      return text(`🐞 ${project} — issues: ${issues.length}\n\n${pretty(issues)}`)
    } catch (err) {
      return errorText(`❌ glitchtip_list_issues(${project}): ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  // ─── glitchtip_get_issue_event ───────────────────────────────────────────────
  server.registerTool('glitchtip_get_issue_event', {
    description:
      'Последнее событие issue — сообщение и стектрейс. issueId берётся из glitchtip_list_issues (поле id), не project slug.',
    inputSchema: z.strictObject({ issueId: z.string().min(1).describe('id issue из glitchtip_list_issues') }),
  }, async ({ issueId }) => {
    try {
      const event = await getLatestIssueEvent(issueId)
      return text(`🔎 Событие issue ${issueId}:\n\n${pretty(event)}`)
    } catch (err) {
      return errorText(
        `❌ glitchtip_get_issue_event(${issueId}): ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  })

  // ─── glitchtip_set_issue_status ──────────────────────────────────────────────
  server.registerTool('glitchtip_set_issue_status', {
    description:
      'Меняет статус группы (issue) в GlitchTip: resolved — исправлено, ignored — шум/не баг, unresolved — переоткрыть. '
      + 'Пишет во внешний сервис: вызывай только по явной просьбе пользователя и только для перечисленных им id. '
      + 'issueId — числовой id из glitchtip_list_issues.',
    inputSchema: z.strictObject({
      issueId: z.string().regex(/^\d+$/, 'issueId — числовой id группы').describe('id issue из glitchtip_list_issues'),
      status: z.enum(['resolved', 'ignored', 'unresolved']).describe('Новый статус группы'),
    }),
  }, async ({ issueId, status }) => {
    try {
      const issue = await setIssueStatus(issueId, status)
      return text(`✅ Issue ${issueId}: статус → ${issue.status}

${pretty(issue)}`)
    } catch (err) {
      return errorText(
        `❌ glitchtip_set_issue_status(${issueId}, ${status}): ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  })

  return server
}
