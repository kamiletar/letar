'use client'

import { LogsDialog } from '@/app/_components/shared/LogsDialog'
import { useCallback } from 'react'

interface DeployLogsDialogProps {
  deployId: string
  logFile: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

async function fetchDeployLogs(logFile: string) {
  const res = await fetch(`/api/deploy/logs/${logFile}`)
  if (!res.ok) {
    throw new Error('Failed to fetch logs')
  }
  const data = await res.json()
  return data.logs as string
}

export function DeployLogsDialog({ deployId, logFile, open, onOpenChange }: DeployLogsDialogProps) {
  const fetchLogs = useCallback(() => fetchDeployLogs(logFile!), [logFile])

  // Не рендерим диалог если нет файла логов
  if (!logFile) {
    return null
  }

  return (
    <LogsDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Deploy Logs"
      fetchLogs={fetchLogs}
      queryKey={['deploy-logs', logFile]}
      exportFilename={logFile || `deploy-${deployId}.log`}
      showExport
      footerInfo={`Deploy ID: ${deployId} | Log file: ${logFile}`}
    />
  )
}
