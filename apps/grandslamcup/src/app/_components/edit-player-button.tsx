'use client'

/**
 * Кнопка "Редактировать" на профиле поэта.
 * Показывается только если пользователь — Admin или сам поэт.
 * Динамический список socialLinks + bio + фото.
 */

import { EntityPhotoUploader } from '@/app/_components/entity-photo-uploader'
import type { SocialLink } from '@/app/_components/social-links'
import { useSession } from '@/lib/auth-client'
import { isUserAdmin } from '@/lib/session-utils'
import {
  Box,
  Button,
  Circle,
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
import { LuPencil, LuPlus, LuTrash2, LuUserRound } from 'react-icons/lu'

/** Доступные платформы */
const PLATFORMS = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'vk', label: 'VKontakte' },
  { value: 'stihi.ru', label: 'Стихи.ру' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'website', label: 'Сайт' },
]

interface EditPlayerButtonProps {
  playerId: string
  playerName: string
  playerUserId: string | null
  playerPhoto: string | null
  bio: string | null
  socialLinks: SocialLink[]
  currentTeamId: string | null
  /** Серверная проверка прав: admin, сам поэт, или тренер его команды */
  canEdit?: boolean
}

export function EditPlayerButton({
  playerId,
  playerName,
  playerUserId,
  playerPhoto,
  bio,
  socialLinks,
  currentTeamId: _currentTeamId,
  canEdit: canEditProp,
}: EditPlayerButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [bioVal, setBioVal] = useState(bio ?? '')
  const [links, setLinks] = useState<SocialLink[]>(socialLinks.length > 0 ? socialLinks : [])
  const [saving, setSaving] = useState(false)

  if (!session?.user) return null

  // Если canEdit передан с сервера — используем его, иначе fallback на клиентскую проверку
  const user = session.user
  const isAdmin = isUserAdmin(user)
  const isSelf = playerUserId === user.id
  const canEdit = canEditProp ?? (isAdmin || isSelf)

  if (!canEdit) return null

  /** Добавить пустую ссылку */
  function addLink() {
    setLinks([...links, { platform: 'telegram', url: '' }])
  }

  /** Удалить ссылку по индексу */
  function removeLink(index: number) {
    setLinks(links.filter((_, i) => i !== index))
  }

  /** Обновить ссылку */
  function updateLink(index: number, field: 'platform' | 'url', value: string) {
    const updated = [...links]
    updated[index] = { ...updated[index], [field]: value }
    setLinks(updated)
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Фильтруем пустые URL
      const validLinks = links.filter((l) => l.url.trim())

      const { updatePlayerProfileAdminAction } = await import('@/app/admin/teams/_actions/roster-admin.action')
      const result = await updatePlayerProfileAdminAction({
        playerId,
        bio: bioVal.trim(),
        socialLinks: validLinks,
      })
      if ('error' in result) {
        // Fallback на coach action
        const { updatePlayerProfileAction } = await import('@/app/coach/_actions/roster.action')
        const coachResult = await updatePlayerProfileAction({
          playerId,
          bio: bioVal.trim(),
          socialLinks: validLinks,
        })
        if ('error' in coachResult) {
          alert(String(coachResult.error))
          return
        }
      }
      router.refresh()
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button
        size="xs"
        variant="ghost"
        color="whiteAlpha.600"
        _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
        onClick={() => setOpen(true)}
      >
        <LuPencil size={14} />
        <Text display={{ base: 'none', sm: 'inline' }}>Редактировать</Text>
      </Button>

      <Dialog.Root open={open} onOpenChange={(e) => !e.open && setOpen(false)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="lg">
              <Dialog.Header>
                <Dialog.Title>Редактировать — {playerName}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack gap={4} align="stretch">
                  {/* Фото */}
                  <Flex justify="center">
                    <EntityPhotoUploader
                      entityType="player"
                      entityId={playerId}
                      currentPhoto={playerPhoto}
                      size={120}
                      placeholder={
                        <Circle size={14} bg="brand.subtle" color="brand.solid">
                          <LuUserRound size={28} />
                        </Circle>
                      }
                      label="Фото поэта"
                    />
                  </Flex>

                  {/* Биография */}
                  <Flex direction="column" gap={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      Биография
                    </Text>
                    <Textarea
                      value={bioVal}
                      onChange={(e) => setBioVal(e.target.value)}
                      placeholder="О поэте..."
                      rows={4}
                      size="sm"
                    />
                  </Flex>

                  {/* Социальные ссылки */}
                  <Box>
                    <Flex justify="space-between" align="center" mb={2}>
                      <Text fontSize="sm" fontWeight="medium">
                        Ссылки
                      </Text>
                      <Button size="xs" variant="ghost" colorPalette="teal" onClick={addLink}>
                        <LuPlus size={14} />
                        Добавить
                      </Button>
                    </Flex>
                    <VStack gap={2} align="stretch">
                      {links.map((link, i) => (
                        <HStack key={i} gap={2}>
                          <NativeSelect.Root size="sm" w="140px" flexShrink={0}>
                            <NativeSelect.Field
                              value={link.platform}
                              onChange={(e) => updateLink(i, 'platform', e.target.value)}
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
                            onChange={(e) => updateLink(i, 'url', e.target.value)}
                            placeholder="https://..."
                            size="sm"
                            flex={1}
                          />
                          <Button size="xs" variant="ghost" colorPalette="red" onClick={() => removeLink(i)}>
                            <LuTrash2 size={14} />
                          </Button>
                        </HStack>
                      ))}
                      {links.length === 0 && (
                        <Text fontSize="xs" color="fg.muted">
                          Нет ссылок — нажмите "Добавить"
                        </Text>
                      )}
                    </VStack>
                  </Box>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Flex gap={3}>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Отмена
                  </Button>
                  <Button colorPalette="brand" onClick={handleSave} loading={saving}>
                    Сохранить
                  </Button>
                </Flex>
              </Dialog.Footer>
              <Dialog.CloseTrigger />
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  )
}
