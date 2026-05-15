'use client'

import { useSSE } from './useSSE'

interface ContainersData {
  containers: unknown[]
  timestamp: string
}

export function useRealtimeContainers(enabled = true) {
  return useSSE<ContainersData>({
    url: '/api/stream/containers',
    eventName: 'containers',
    enabled,
    onError: (error) => {
      console.error('[Realtime Containers] Connection error:', error)
    },
  })
}
