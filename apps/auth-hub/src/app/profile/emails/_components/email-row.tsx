'use client'

import { Badge, Button, Flex, HStack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { removeEmail, setPrimaryEmail } from '../_actions/emails.action'

interface EmailRowProps {
  id: string
  email: string
  verified: boolean
}

export function EmailRow({ id, email, verified }: EmailRowProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleMakePrimary() {
    if (!confirm(`Сделать ${email} основным адресом? Потребуется войти заново.`)) {
      return
    }
    startTransition(async () => {
      await setPrimaryEmail(id)
      // setPrimaryEmail завершает сессию (см. докстринг в emails.action.ts) — уводим на вход
      router.push('/sign-in')
    })
  }

  function handleRemove() {
    if (!confirm(`Отвязать ${email}?`)) {
      return
    }
    startTransition(async () => {
      await removeEmail(id)
      router.refresh()
    })
  }

  return (
    <Flex justify="space-between" align="center" gap={3}>
      <HStack gap={2}>
        <Text fontSize="sm">{email}</Text>
        <Badge colorPalette={verified ? 'green' : 'yellow'} size="sm">
          {verified ? 'подтверждён' : 'ожидает подтверждения'}
        </Badge>
      </HStack>
      <HStack gap={2}>
        {verified && (
          <Button size="xs" variant="outline" loading={isPending} onClick={handleMakePrimary}>
            Сделать основным
          </Button>
        )}
        <Button size="xs" variant="ghost" colorPalette="red" loading={isPending} onClick={handleRemove}>
          Удалить
        </Button>
      </HStack>
    </Flex>
  )
}
