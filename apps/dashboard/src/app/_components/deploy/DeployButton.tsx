'use client'

import { deployApp } from '@/app/_actions/deploy-actions'
import { toaster } from '@/app/_components/ui/toaster'
import { Button } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { LuFlaskConical, LuRocket } from 'react-icons/lu'

interface DeployButtonProps {
  app?: string
  dryRun?: boolean
  onDeployStart?: (pid: number) => void
  disabled?: boolean
  /** Размер кнопки */
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

export function DeployButton({ app, dryRun = false, onDeployStart, disabled = false, size = 'md' }: DeployButtonProps) {
  const deployMutation = useMutation({
    mutationFn: async () => {
      const result = await deployApp(app, dryRun)
      if (!result.success) {
        throw new Error(result.error || 'Failed to start deploy')
      }
      return result
    },
    onSuccess: (result) => {
      toaster.create({
        title: 'Deploy started',
        description: 'message' in result ? result.message : undefined,
        type: 'success',
      })
      if ('pid' in result && result.pid && onDeployStart) {
        onDeployStart(result.pid as number)
      }
    },
    onError: (error: Error) => {
      toaster.create({
        title: 'Failed to start deploy',
        description: error.message,
        type: 'error',
      })
    },
  })

  const Icon = dryRun ? LuFlaskConical : LuRocket
  const label = dryRun ? 'Dry Run' : app ? `Deploy ${app}` : 'Deploy All'

  return (
    <Button
      colorPalette={dryRun ? 'gray' : 'brand'}
      variant={dryRun ? 'outline' : 'solid'}
      onClick={() => deployMutation.mutate()}
      loading={deployMutation.isPending}
      disabled={disabled}
      size={size}
    >
      <Icon />
      {label}
    </Button>
  )
}
