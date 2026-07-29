import type { MentorStateReport } from './schema'

interface MentorRuntimeState extends MentorStateReport {
  connectedClients: number
  updatedAt: string
}

let current: MentorRuntimeState | null = null
let clients = 0

/** Браузер репортит своё состояние (heartbeat) — читает MCP-ресурс daw://current-state */
export function reportMentorState(report: MentorStateReport): void {
  current = { ...report, connectedClients: clients, updatedAt: new Date().toISOString() }
}

export function trackClientConnected(): void {
  clients += 1
}

export function trackClientDisconnected(): void {
  clients = Math.max(0, clients - 1)
}

export function getMentorState(): { connectedClients: number } & Partial<MentorRuntimeState> {
  return current ? { ...current, connectedClients: clients } : { connectedClients: clients }
}
