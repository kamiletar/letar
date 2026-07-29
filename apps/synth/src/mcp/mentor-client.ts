// Тонкий HTTP-клиент к Next.js API студии (/api/mentor/*) — MCP-сервер и Next.js
// работают в разных процессах, единственная связь между ними — эти запросы.
import type { MentorEvent } from '../lib/mentor/schema.js'

export interface MentorClientOptions {
  baseUrl: string
  token?: string
}

export function createMentorClient(options: MentorClientOptions) {
  const { baseUrl, token } = options

  async function emit(event: MentorEvent): Promise<void> {
    const res = await fetch(`${baseUrl}/api/mentor/emit/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(event),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`mentor emit failed (${res.status}): ${body}`)
    }
  }

  async function getState(): Promise<unknown> {
    const res = await fetch(`${baseUrl}/api/mentor/state/`)
    if (!res.ok) {
      throw new Error(`mentor state fetch failed (${res.status})`)
    }
    return res.json()
  }

  return { emit, getState }
}

export type MentorClient = ReturnType<typeof createMentorClient>
