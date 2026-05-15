/**
 * Утилиты для аудита пинов — вынесены из route.ts для переиспользования.
 */

/** Заголовки авторизации Kubo API */
function kuboHeaders(authSecret?: string | null): Record<string, string> {
  const headers: Record<string, string> = {}
  if (authSecret) {
    headers['Authorization'] = `Bearer ${authSecret}`
  }
  return headers
}

/** Получить все recursive pins из Kubo через NDJSON stream */
export async function getKuboPins(apiUrl: string, authSecret?: string | null): Promise<string[]> {
  const response = await fetch(`${apiUrl}/api/v0/pin/ls?type=recursive&stream=true`, {
    method: 'POST',
    headers: kuboHeaders(authSecret),
    signal: AbortSignal.timeout(120_000),
  })

  if (!response.ok) {
    throw new Error(`Kubo pin/ls failed: ${response.status}`)
  }

  // Streaming NDJSON: каждая строка — { Cid: "...", Type: "recursive" }
  const text = await response.text()
  const pins: string[] = []
  for (const line of text.split('\n')) {
    if (!line.trim()) {
      continue
    }
    try {
      const parsed = JSON.parse(line)
      if (parsed.Cid) {
        // Kubo v0.40+ может возвращать CID как строку или как объект { "/": "..." }
        const cid = typeof parsed.Cid === 'string' ? parsed.Cid : parsed.Cid['/']
        if (cid) {
          pins.push(cid)
        }
      }
    } catch {
      // Пропускаем битые строки
    }
  }
  return pins
}

export interface PinServerInfo {
  pinQueueUrl: string | null
  pinQueueSecret: string | null
  apiUrl: string
  authSecret: string | null
}

/** Распинить CID через pin-queue или Kubo напрямую */
export async function unpinCid(cid: string, server: PinServerInfo): Promise<{ success: boolean; error?: string }> {
  try {
    if (server.pinQueueUrl) {
      const headers: Record<string, string> = {}
      if (server.pinQueueSecret) {
        headers['Authorization'] = `Bearer ${server.pinQueueSecret}`
      }
      const res = await fetch(`${server.pinQueueUrl}/api/pin?cid=${encodeURIComponent(cid)}`, {
        method: 'DELETE',
        headers,
        signal: AbortSignal.timeout(30_000),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown' }))
        return { success: false, error: data.error }
      }
      return { success: true }
    }

    // Напрямую через Kubo
    const res = await fetch(`${server.apiUrl}/api/v0/pin/rm?arg=${encodeURIComponent(cid)}`, {
      method: 'POST',
      headers: kuboHeaders(server.authSecret),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown' }
  }
}
