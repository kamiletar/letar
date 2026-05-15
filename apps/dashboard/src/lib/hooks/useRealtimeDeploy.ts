'use client'

import { useSSE } from './useSSE'

interface DeployData {
  status: {
    isRunning: boolean
    pid?: number
    startTime?: string
    app?: string
    dryRun?: boolean
  }
  logs: string[]
  timestamp: string
}

export function useRealtimeDeploy(enabled = true) {
  return useSSE<DeployData>({
    url: '/api/stream/deploy',
    eventName: 'deploy',
    enabled,
    reconnectDelay: 2000,
    onError: (error) => {
      console.error('[Realtime Deploy] Connection error:', error)
    },
  })
}
