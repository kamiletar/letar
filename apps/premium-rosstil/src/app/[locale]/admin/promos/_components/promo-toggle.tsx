'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Switch } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { togglePromoActive } from '../_actions/promo.actions'

interface PromoToggleProps {
  id: string
  isActive: boolean
}

/** Переключатель активности промокода */
export function PromoToggle({ id, isActive }: PromoToggleProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleChange = () => {
    startTransition(async () => {
      const result = await togglePromoActive(id, !isActive)
      if (result.success) {
        router.refresh()
      } else {
        toaster.error({ title: result.error || 'Ошибка' })
      }
    })
  }

  return (
    <Switch.Root checked={isActive} onCheckedChange={handleChange} disabled={isPending} size="sm">
      <Switch.HiddenInput />
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
    </Switch.Root>
  )
}
