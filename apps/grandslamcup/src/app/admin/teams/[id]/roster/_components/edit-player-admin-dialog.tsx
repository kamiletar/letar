'use client'

/**
 * Диалог редактирования профиля игрока + привязка User (админка).
 */

import { toaster } from '@/app/_components/ui/toaster'
import {
  adminLinkPlayerToUserAction,
  adminUnlinkPlayerAction,
  updatePlayerProfileAdminAction,
} from '@/app/admin/teams/_actions/roster-admin.action'
import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  HStack,
  Input,
  NativeSelect,
  Portal,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuLink, LuPlus, LuTrash2, LuUnlink } from 'react-icons/lu'

export interface EditablePlayer {
  playerId: string
  name: string
  bio: string | null
  socialLinks: Array<{ platform: string; url: string }>
  badges: string[]
  hasUser: boolean
}

const PLATFORMS = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'vk', label: 'VK' },
  { value: 'stihi.ru', label: 'Стихи.ру' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'website', label: 'Сайт' },
]

interface EditPlayerAdminDialogProps {
  player: EditablePlayer
  onClose: () => void
}

export function EditPlayerAdminDialog({ player, onClose }: EditPlayerAdminDialogProps) {
  const router = useRouter()
  const [bio, setBio] = useState(player.bio ?? '')
  const [links, setLinks] = useState(player.socialLinks.length > 0 ? player.socialLinks : [])
  const [badges, setBadges] = useState(player.badges.join(', '))
  const [saving, setSaving] = useState(false)
  const [linkEmail, setLinkEmail] = useState('')
  const [linking, setLinking] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const validLinks = links.filter((l) => l.url.trim())
      const result = await updatePlayerProfileAdminAction({
        playerId: player.playerId,
        bio: bio.trim(),
        socialLinks: validLinks,
        badges: badges
          .split(',')
          .map((b) => b.trim())
          .filter(Boolean),
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

  async function handleLink() {
    if (!linkEmail.trim()) {
      return
    }
    setLinking(true)
    try {
      const result = await adminLinkPlayerToUserAction({ playerId: player.playerId, email: linkEmail.trim() })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Привязано' })
        router.refresh()
        onClose()
      }
    } finally {
      setLinking(false)
    }
  }

  async function handleUnlink() {
    const result = await adminUnlinkPlayerAction({ playerId: player.playerId })
    if ('error' in result) {
      toaster.error({ title: String(result.error) })
    } else {
      toaster.success({ title: 'Отвязано' })
      router.refresh()
      onClose()
    }
  }

  return (
    <Dialog.Root open onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW={{ base: 'calc(100vw - 32px)', sm: 'lg' }}>
            <Dialog.Header>
              <Dialog.Title>{player.name}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Биография
                  </Text>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="О поэте..."
                    rows={3}
                    size="sm"
                  />
                </Box>
                {/* Ссылки */}
                <Box>
                  <Flex justify="space-between" align="center" mb={2}>
                    <Text fontSize="sm" fontWeight="medium">
                      Ссылки
                    </Text>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="teal"
                      onClick={() => setLinks([...links, { platform: 'telegram', url: '' }])}
                    >
                      <LuPlus size={14} /> Добавить
                    </Button>
                  </Flex>
                  <VStack gap={2} align="stretch">
                    {links.map((link, i) => (
                      <HStack key={i} gap={2}>
                        <NativeSelect.Root size="sm" w="130px" flexShrink={0}>
                          <NativeSelect.Field
                            value={link.platform}
                            onChange={(e) => {
                              const u = [...links]
                              u[i] = { ...u[i], platform: e.target.value }
                              setLinks(u)
                            }}
                          >
                            {PLATFORMS.map((p) => (
                              <option key={p.value} value={p.value}>
                                {p.label}
                              </option>
                            ))}
                          </NativeSelect.Field>
                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                        <Input
                          value={link.url}
                          onChange={(e) => {
                            const u = [...links]
                            u[i] = { ...u[i], url: e.target.value }
                            setLinks(u)
                          }}
                          placeholder="https://..."
                          size="sm"
                          flex={1}
                        />
                        <Button
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => setLinks(links.filter((_, j) => j !== i))}
                        >
                          <LuTrash2 size={14} />
                        </Button>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Бейджи (через запятую)
                  </Text>
                  <Input
                    value={badges}
                    onChange={(e) => setBadges(e.target.value)}
                    placeholder="Оргкомитет, Создатель КБС"
                    size="sm"
                  />
                </Box>
                <Flex justify="flex-end">
                  <Button colorPalette="brand" size="sm" onClick={handleSave} loading={saving}>
                    Сохранить
                  </Button>
                </Flex>

                {/* Привязка User */}
                <Box borderTopWidth="1px" borderColor="border" pt={4}>
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>
                    Привязка аккаунта
                  </Text>
                  {player.hasUser
                    ? (
                      <Flex justify="space-between" align="center">
                        <Badge colorPalette="green" size="sm">
                          Привязан
                        </Badge>
                        <Button size="xs" variant="outline" colorPalette="red" onClick={handleUnlink}>
                          <LuUnlink size={14} /> Отвязать
                        </Button>
                      </Flex>
                    )
                    : (
                      <Flex gap={2}>
                        <Input
                          value={linkEmail}
                          onChange={(e) => setLinkEmail(e.target.value)}
                          placeholder="Email"
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
                          <LuLink size={14} /> Привязать
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
