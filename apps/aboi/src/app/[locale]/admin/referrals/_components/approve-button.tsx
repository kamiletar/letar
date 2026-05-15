'use client'

import { Button } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { approveReferralEarningAction } from '@/lib/referral'

export function ReferralApproveButton({ earningId }: { earningId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      size="xs"
      colorPalette="green"
      loading={isPending}
      onClick={() =>
        startTransition(async () => {
          await approveReferralEarningAction(earningId)
          router.refresh()
        })}
    >
      Одобрить
    </Button>
  )
}
