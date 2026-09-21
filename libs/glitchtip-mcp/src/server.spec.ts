import { connectedClient as connectMcp, expectValidationError, textOf } from '@letar/mcp-test-kit'
import type { Client } from '@modelcontextprotocol/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { listProjectsMock, listIssuesMock, getLatestIssueEventMock, setIssueStatusMock } = vi.hoisted(() => ({
  listProjectsMock: vi.fn(),
  listIssuesMock: vi.fn(),
  getLatestIssueEventMock: vi.fn(),
  setIssueStatusMock: vi.fn(),
}))

vi.mock('./client.js', () => ({
  listProjects: listProjectsMock,
  listIssues: listIssuesMock,
  getLatestIssueEvent: getLatestIssueEventMock,
  setIssueStatus: setIssueStatusMock,
}))

import { createGlitchtipMcpServer } from './server.js'

function connectedClient() {
  return connectMcp(createGlitchtipMcpServer)
}

describe('createGlitchtipMcpServer', () => {
  let client: Client

  beforeEach(async () => {
    ;({ client } = await connectedClient())
  })

  afterEach(() => {
    listProjectsMock.mockReset()
    listIssuesMock.mockReset()
    getLatestIssueEventMock.mockReset()
    setIssueStatusMock.mockReset()
  })

  describe('glitchtip_list_projects', () => {
    it('успешный вызов возвращает список проектов', async () => {
      listProjectsMock.mockResolvedValue([{ id: '1', slug: 'aboi', name: 'aboi' }])

      const result = await client.callTool({ name: 'glitchtip_list_projects', arguments: {} })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('Проектов в GlitchTip: 1')
      expect(textOf(result)).toContain('"slug": "aboi"')
      expect(listProjectsMock).toHaveBeenCalledWith()
    })

    it('ошибка внешнего вызова (клиент бросает) возвращает isError', async () => {
      listProjectsMock.mockRejectedValue(new Error('GlitchTip API error: HTTP 500'))

      const result = await client.callTool({ name: 'glitchtip_list_projects', arguments: {} })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('HTTP 500')
    })
  })

  describe('glitchtip_list_issues', () => {
    it('ошибка валидации — отсутствует обязательный project', async () => {
      await expectValidationError(client, 'glitchtip_list_issues', {})
      expect(listIssuesMock).not.toHaveBeenCalled()
    })

    it('успешный вызов возвращает найденные issues', async () => {
      listIssuesMock.mockResolvedValue([
        {
          id: 'i1',
          title: 'TypeError: boom',
          culprit: 'src/foo.ts',
          count: '3',
          userCount: 1,
          level: 'error',
          status: 'unresolved',
          firstSeen: '2026-08-01T00:00:00Z',
          lastSeen: '2026-08-20T00:00:00Z',
          permalink: 'https://errors.s3.letar.best/i1',
        },
      ])

      const result = await client.callTool({
        name: 'glitchtip_list_issues',
        arguments: { project: 'aboi', environment: 'production', statsPeriod: '7d', status: 'unresolved', limit: 10 },
      })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('aboi — issues: 1')
      expect(textOf(result)).toContain('TypeError: boom')
      expect(listIssuesMock).toHaveBeenCalledWith('aboi', {
        environment: 'production',
        statsPeriod: '7d',
        status: 'unresolved',
        limit: 10,
      })
    })

    it('пустой результат — читаемое сообщение без ошибки', async () => {
      listIssuesMock.mockResolvedValue([])

      const result = await client.callTool({ name: 'glitchtip_list_issues', arguments: { project: 'aboi' } })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('issues по фильтру не найдено')
    })

    it('ошибка внешнего вызова возвращает isError с именем проекта', async () => {
      listIssuesMock.mockRejectedValue(new Error('GlitchTip API error: HTTP 404'))

      const result = await client.callTool({ name: 'glitchtip_list_issues', arguments: { project: 'unknown-app' } })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('glitchtip_list_issues(unknown-app)')
      expect(textOf(result)).toContain('HTTP 404')
    })
  })

  describe('glitchtip_get_issue_event', () => {
    it('ошибка валидации — отсутствует обязательный issueId', async () => {
      await expectValidationError(client, 'glitchtip_get_issue_event', {})
      expect(getLatestIssueEventMock).not.toHaveBeenCalled()
    })

    it('успешный вызов возвращает событие issue', async () => {
      getLatestIssueEventMock.mockResolvedValue({
        eventID: 'e1',
        message: 'boom',
        dateCreated: '2026-08-20T00:00:00Z',
        entries: [{ type: 'exception', data: {} }],
      })

      const result = await client.callTool({ name: 'glitchtip_get_issue_event', arguments: { issueId: 'i1' } })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('Событие issue i1')
      expect(textOf(result)).toContain('"eventID": "e1"')
      expect(getLatestIssueEventMock).toHaveBeenCalledWith('i1')
    })

    it('ошибка внешнего вызова возвращает isError с issueId', async () => {
      getLatestIssueEventMock.mockRejectedValue(new Error('GlitchTip API error: HTTP 404'))

      const result = await client.callTool({ name: 'glitchtip_get_issue_event', arguments: { issueId: 'missing' } })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('glitchtip_get_issue_event(missing)')
      expect(textOf(result)).toContain('HTTP 404')
    })
  })

  describe('glitchtip_set_issue_status', () => {
    it('ошибка валидации — отсутствует обязательный status', async () => {
      await expectValidationError(client, 'glitchtip_set_issue_status', { issueId: '771' })
      expect(setIssueStatusMock).not.toHaveBeenCalled()
    })

    it('ошибка валидации — статус вне списка', async () => {
      await expectValidationError(client, 'glitchtip_set_issue_status', { issueId: '771', status: 'deleted' })
      expect(setIssueStatusMock).not.toHaveBeenCalled()
    })

    it('ошибка валидации — нечисловой issueId не попадает в путь запроса', async () => {
      await expectValidationError(client, 'glitchtip_set_issue_status', { issueId: '1/../../x', status: 'ignored' })
      expect(setIssueStatusMock).not.toHaveBeenCalled()
    })

    it('успешный вызов меняет статус и возвращает обновлённую группу', async () => {
      setIssueStatusMock.mockResolvedValue({ id: '771', title: 'ContextError', status: 'ignored' })

      const result = await client.callTool({
        name: 'glitchtip_set_issue_status',
        arguments: { issueId: '771', status: 'ignored' },
      })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('Issue 771: статус → ignored')
      expect(setIssueStatusMock).toHaveBeenCalledWith('771', 'ignored')
    })

    it('ошибка внешнего вызова (нет прав токена) возвращает isError с id и статусом', async () => {
      setIssueStatusMock.mockRejectedValue(new Error('GlitchTip API error: HTTP 403'))

      const result = await client.callTool({
        name: 'glitchtip_set_issue_status',
        arguments: { issueId: '771', status: 'resolved' },
      })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('glitchtip_set_issue_status(771, resolved)')
      expect(textOf(result)).toContain('HTTP 403')
    })
  })
})

// zod по умолчанию молча отбрасывает неизвестные ключи: `glitchtip_list_issues` с опечаткой в
// `environment`/`status`/`statsPeriod` вернёт issues по умолчанию (unresolved за 14 дней, все
// окружения) — выборка выглядит валидной, но отвечает на другой вопрос. Схемы строгие.
describe('строгие входные схемы — неизвестный аргумент отвергается', () => {
  const cases: Array<[tool: string, args: Record<string, unknown>, mock: ReturnType<typeof vi.fn>]> = [
    [
      'glitchtip_list_issues',
      { project: 'aboi', environment: 'production', statsPeriod: '24h', status: 'resolved', limit: 5 },
      listIssuesMock,
    ],
    ['glitchtip_get_issue_event', { issueId: '42' }, getLatestIssueEventMock],
    ['glitchtip_set_issue_status', { issueId: '42', status: 'resolved' }, setIssueStatusMock],
  ]

  it.each(cases)('%s: валидный вызов проходит', async (tool, args, mock) => {
    mock.mockResolvedValue([{ id: '1' }])
    const { client } = await connectedClient()
    const result = await client.callTool({ name: tool, arguments: args })
    expect(textOf(result)).not.toContain('Input validation error')
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it.each(cases)('%s: лишний ключ даёт ошибку валидации без обращения к GlitchTip', async (tool, args, mock) => {
    const { client } = await connectedClient()
    await expectValidationError(client, tool, { ...args, unknownArg: 'x' })
    expect(mock).not.toHaveBeenCalled()
  })

  it('glitchtip_list_issues: `env` вместо `environment` не отдаёт issues всех окружений', async () => {
    const { client } = await connectedClient()
    await expectValidationError(client, 'glitchtip_list_issues', { project: 'aboi', env: 'production' })
    expect(listIssuesMock).not.toHaveBeenCalled()
  })
})
