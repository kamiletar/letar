'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Button, HStack } from '@chakra-ui/react'
import { useState } from 'react'

interface AppControlsProps {
  appName: string
  containerId?: string
  isRunning: boolean
  onStatusChange?: () => void
}

export function AppControls({ appName: _appName, containerId, isRunning, onStatusChange }: AppControlsProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleControl = async (action: 'start' | 'stop' | 'restart') => {
    if (!containerId) {
      toaster.error({
        title: 'Error',
        description: 'Container ID not available',
      })
      return
    }

    setLoading(action)

    try {
      const res = await fetch(`/api/docker/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId, action }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to control container')
      }

      toaster.success({
        title: 'Success',
        description: `Container ${action}ed successfully`,
      })

      // Refresh status
      onStatusChange?.()
    } catch (error) {
      toaster.error({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoading(null)
    }
  }

  if (!containerId) {
    return null
  }

  return (
    <HStack gap="2">
      {!isRunning && (
        <Button
          colorPalette="green"
          onClick={() => handleControl('start')}
          loading={loading === 'start'}
          disabled={!!loading}
        >
          Start
        </Button>
      )}

      {isRunning && (
        <>
          <Button
            colorPalette="red"
            onClick={() => handleControl('stop')}
            loading={loading === 'stop'}
            disabled={!!loading}
          >
            Stop
          </Button>

          <Button
            colorPalette="brand"
            onClick={() => handleControl('restart')}
            loading={loading === 'restart'}
            disabled={!!loading}
          >
            Restart
          </Button>
        </>
      )}
    </HStack>
  )
}
