'use client'

import { Button } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { rotateSecretAction } from '../../_actions/client.action'

export function RotateSecretButton({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleRotate() {
    if (!confirm('Ротировать секрет? Текущий секрет станет недействительным.')) {
      return
    }

    startTransition(async () => {
      const result = await rotateSecretAction(clientId)
      if ('secret' in result) {
        router.replace(`/admin/clients/${clientId}?secret=${encodeURIComponent(result.secret)}`)
      }
    })
  }

  return (
    <Button size="sm" variant="outline" colorPalette="orange" loading={isPending} onClick={handleRotate}>
      Ротировать секрет
    </Button>
  )
}
