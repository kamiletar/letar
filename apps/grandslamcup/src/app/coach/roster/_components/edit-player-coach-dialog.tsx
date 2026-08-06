'use client'

/**
 * Диалог редактирования профиля игрока тренером.
 * Редактирование биографии, ссылок Telegram/VK, привязка/отвязка User.
 */

import { toaster } from '@/app/_components/ui/toaster'
import {
  linkPlayerToUserAction,
  unlinkPlayerAction,
  updatePlayerProfileAction,
} from '@/app/coach/_actions/roster.action'
import { Badge, Box, Button, Dialog, Flex, HStack, Input, Portal, Text, Textarea, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuLink, LuUnlink } from 'react-icons/lu'

interface EditPlayerCoachDialogProps {
  player: {
    playerId: string
    playerName: string
    hasUser: boolean
    bio?: string | null
    telegramLink?: string | null
    vkLink?: string | null
  }
  onClose: () => void
}

/** Диалог редактирования профиля поэта + привязка User */
export function EditPlayerCoachDialog({ player, onClose }: EditPlayerCoachDialogProps) {
  const router = useRouter()
  const [bio, setBio] = useState(player.bio ?? '')
  const [telegramLink, setTelegramLink] = useState(player.telegramLink ?? '')
  const [vkLink, setVkLink] = useState(player.vkLink ?? '')
  const [saving, setSaving] = useState(false)

  const [linkEmail, setLinkEmail] = useState('')
  const [linking, setLinking] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  /** Сохранить профиль */
  async function handleSave() {
    setSaving(true)
    try {
      const result = await updatePlayerProfileAction({
        playerId: player.playerId,
        bio: bio.trim(),
        telegramLink: telegramLink.trim(),
        vkLink: vkLink.trim(),
      })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Профиль обновлён' })
        router.refresh()
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  /** Привязать User */
  async function handleLink() {
    if (!linkEmail.trim()) return
    setLinking(true)
    try {
      const result = await linkPlayerToUserAction({
        playerId: player.playerId,
        email: linkEmail.trim(),
      })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Аккаунт привязан' })
        router.refresh()
        onClose()
      }
    } finally {
      setLinking(false)
    }
  }

  /** Отвязать User */
  async function handleUnlink() {
    setUnlinking(true)
    try {
      const result = await unlinkPlayerAction({ playerId: player.playerId })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Аккаунт отвязан' })
        router.refresh()
        onClose()
      }
    } finally {
      setUnlinking(false)
    }
  }

  return (
    <Dialog.Root open onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW={{ base: 'calc(100vw - 32px)', sm: 'lg' }}>
            <Dialog.Header>
              <Dialog.Title>{player.playerName}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                {/* Профиль — тренер может редактировать всех игроков */}
                {player.hasUser && (
                  <Box bg="green.subtle" p={2} borderRadius="lg">
                    <Text fontSize="xs" color="green.fg">
                      Профиль привязан к аккаунту. Поэт тоже может редактировать его сам.
                    </Text>
                  </Box>
                )}
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Биография
                  </Text>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Расскажите о поэте..."
                    rows={3}
                    size="sm"
                  />
                </Box>
                <Flex gap={3} direction={{ base: 'column', sm: 'row' }}>
                  <Box flex={1}>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Telegram
                    </Text>
                    <Input
                      value={telegramLink}
                      onChange={(e) => setTelegramLink(e.target.value)}
                      placeholder="https://t.me/username"
                      size="sm"
                    />
                  </Box>
                  <Box flex={1}>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      VK
                    </Text>
                    <Input
                      value={vkLink}
                      onChange={(e) => setVkLink(e.target.value)}
                      placeholder="https://vk.com/id"
                      size="sm"
                    />
                  </Box>
                </Flex>
                <Flex justify="flex-end">
                  <Button colorPalette="brand" size="sm" onClick={handleSave} loading={saving}>
                    Сохранить
                  </Button>
                </Flex>

                {/* Разделитель */}
                <Box borderTopWidth="1px" borderColor="border" pt={4}>
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>
                    Привязка аккаунта
                  </Text>
                  {player.hasUser
                    ? (
                      <Flex justify="space-between" align="center">
                        <HStack gap={2}>
                          <Badge colorPalette="green" size="sm">
                            Привязан
                          </Badge>
                        </HStack>
                        <Button
                          size="xs"
                          variant="outline"
                          colorPalette="red"
                          onClick={handleUnlink}
                          loading={unlinking}
                        >
                          <LuUnlink size={14} />
                          Отвязать
                        </Button>
                      </Flex>
                    )
                    : (
                      <Flex gap={2}>
                        <Input
                          value={linkEmail}
                          onChange={(e) => setLinkEmail(e.target.value)}
                          placeholder="Email пользователя"
                          size="sm"
                          flex={1}
                        />
                        <Button
                          size="sm"
                          colorPalette="teal"
                          onClick={handleLink}
                          loading={linking}
                          disabled={!linkEmail.trim()}
                        >
                          <LuLink size={14} />
                          Привязать
                        </Button>
                      </Flex>
                    )}
                </Box>
              </VStack>
            </Dialog.Body>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
