'use client'

/**
 * Кнопка "Это я" — заявка на привязку профиля поэта к текущей учётке.
 * Создаёт заявку, которую должен подтвердить тренер, организатор или админ.
 * Показывается только если: пользователь авторизован, поэт не привязан к учётке.
 */

import { useSession } from '@/lib/auth-client'
import { Button, Dialog, Portal, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuUserCheck } from 'react-icons/lu'

interface ClaimProfileButtonProps {
  playerId: string
  playerName: string
  playerUserId: string | null
}

export function ClaimProfileButton({ playerId, playerName, playerUserId }: ClaimProfileButtonProps) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [sent, setSent] = useState(false)

  // Не показываем если: не авторизован, или поэт уже привязан
  if (!session?.user || playerUserId) {
    return null
  }

  async function handleClaim() {
    setClaiming(true)
    try {
      const res = await fetch('/api/players/claim-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
      if (res.ok) {
        setSent(true)
      }
    } finally {
      setClaiming(false)
    }
  }

  if (sent) {
    return (
      <Button size="xs" variant="outline" colorPalette="gray" disabled>
        Заявка отправлена
      </Button>
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
      <Dialog.Trigger asChild>
        <Button size="xs" variant="outline" colorPalette="teal">
          <LuUserCheck size={14} />
          Это я
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW={{ base: 'calc(100vw - 32px)', sm: 'md' }}>
            <Dialog.Header>
              <Dialog.Title>Заявка на привязку профиля</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={3} align="stretch">
                <Text>
                  Вы хотите заявить, что <strong>{playerName}</strong> — это вы?
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  Заявка будет отправлена тренеру команды или организатору на подтверждение. После одобрения вы сможете
                  редактировать этот профиль (био, фото, ссылки).
                </Text>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button colorPalette="teal" onClick={handleClaim} loading={claiming}>
                Отправить заявку
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
