import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const hookPath = fileURLToPath(new URL('../../../.claude/hooks/time-heartbeat.js', import.meta.url))

function heartbeat(payload: string, threadId = '', claudeSessionId = '') {
  // Перехватываем HTTP внутри отдельного процесса: реальные таймеры и секреты не используются.
  const child = spawnSync(process.execPath, [
    '-e',
    `
    global.fetch = async (url) => { process.stdout.write(url); return { ok: true } }
    require(process.argv[1])
  `,
    hookPath,
  ], {
    input: payload,
    encoding: 'utf8',
    timeout: 5000,
    env: {
      ...process.env,
      STUDIO_URL: 'http://studio.test',
      TIME_MCP_SECRET: 'test-secret',
      CODEX_THREAD_ID: threadId,
      CLAUDE_CODE_SESSION_ID: claudeSessionId,
    },
  })
  expect(child.error).toBeUndefined()
  expect(child.status, child.stderr).toBe(0)
  return child.stdout
}

describe('heartbeat Codex', () => {
  it('привязывает запрос к session_id из payload, а не к унаследованному окружению', () => {
    expect(heartbeat('{"session_id":"chat/a"}', 'parent-chat', 'other-claude'))
      .toBe('http://studio.test/api/mcp/time/heartbeat?sessionRef=chat%2Fa')
  })

  it('использует CODEX_THREAD_ID, когда payload не содержит session_id', () => {
    expect(heartbeat('{}', 'codex-chat'))
      .toBe('http://studio.test/api/mcp/time/heartbeat?sessionRef=codex-chat')
  })

  it('сохраняет поддержку окружения Claude Code', () => {
    expect(heartbeat('{}', '', 'claude-session'))
      .toBe('http://studio.test/api/mcp/time/heartbeat?sessionRef=claude-session')
  })

  it('не отправляет heartbeat без идентификатора, чтобы не продлевать таймер owner-UI', () => {
    expect(heartbeat('{}')).toBe('')
    expect(heartbeat('{"session_id":42}')).toBe('')
  })

  it('не отправляет heartbeat при повреждённом payload', () => {
    expect(heartbeat('not-json', 'codex-chat')).toBe('')
  })
})
