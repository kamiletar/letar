import type { MentorStateReport } from './schema'

interface MentorRuntimeState extends MentorStateReport {
  connectedClients: number
  updatedAt: string
}

// globalThis — та же причина, что и в event-bus.ts: /api/mentor/state, /api/mentor/emit
// и /api/mentor/events компилируются Turbopack'ом как отдельные точки входа, обычная
// module-scope переменная не гарантированно одна и та же между ними в dev-режиме.
const globalForMentorState = globalThis as unknown as {
  __synthMentorState?: MentorRuntimeState | null
  __synthMentorClients?: number
}

if (globalForMentorState.__synthMentorClients === undefined) {
  globalForMentorState.__synthMentorClients = 0
}

/** Браузер репортит своё состояние (heartbeat) — читает MCP-ресурс daw://current-state */
export function reportMentorState(report: MentorStateReport): void {
  globalForMentorState.__synthMentorState = {
    ...report,
    connectedClients: globalForMentorState.__synthMentorClients ?? 0,
    updatedAt: new Date().toISOString(),
  }
}

export function trackClientConnected(): void {
  globalForMentorState.__synthMentorClients = (globalForMentorState.__synthMentorClients ?? 0) + 1
}

export function trackClientDisconnected(): void {
  globalForMentorState.__synthMentorClients = Math.max(0, (globalForMentorState.__synthMentorClients ?? 0) - 1)
}

export function getMentorState(): { connectedClients: number } & Partial<MentorRuntimeState> {
  const clients = globalForMentorState.__synthMentorClients ?? 0
  const current = globalForMentorState.__synthMentorState
  return current ? { ...current, connectedClients: clients } : { connectedClients: clients }
}
