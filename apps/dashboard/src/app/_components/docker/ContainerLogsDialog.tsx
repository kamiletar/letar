'use client'

import { LogsDialog } from '@/app/_components/shared/LogsDialog'
import { useCallback } from 'react'

interface ContainerLogsDialogProps {
  containerId: string
  containerName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

async function fetchContainerLogs(containerId: string, tail: number) {
  const res = await fetch(`/api/docker/containers/${containerId}/logs?tail=${tail}&timestamps=true`)
  if (!res.ok) {
    throw new Error('Failed to fetch logs')
  }
  const data = await res.json()
  return data.logs as string
}

export function ContainerLogsDialog({ containerId, containerName, open, onOpenChange }: ContainerLogsDialogProps) {
  const fetchLogs = useCallback((lines = 100) => fetchContainerLogs(containerId, lines), [containerId])

  return (
    <LogsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Logs: ${containerName}`}
      fetchLogs={fetchLogs}
      queryKey={['container-logs', containerId]}
      showLineSelector
      autoRefreshInterval={3000}
      footerInfo={`Container ID: ${containerId.substring(0, 12)}`}
    />
  )
}
