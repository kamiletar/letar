'use client'

/**
 * Кнопка "Редактировать" на профиле команды.
 * Показывается для admin и тренеров/замов этой команды.
 */

import { EntityPhotoUploader } from '@/app/_components/entity-photo-uploader'
import type { SocialLink } from '@/app/_components/social-links'
import {
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
import { LuPencil, LuPlus, LuTrash2, LuUsers } from 'react-icons/lu'

/** Доступные платформы */
const PLATFORMS = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'vk', label: 'VKontakte' },
  { value: 'website', label: 'Сайт' },
]

interface EditTeamButtonProps {
  teamId: string
  teamName: string
  description: string | null
  logo: string | null
  socialLinks: SocialLink[]
  canEdit: boolean
  citySlug: string
  teamSlug: string
}

export function EditTeamButton({
  teamId,
  teamName,
  description,
  logo,
  socialLinks,
  canEdit,
  citySlug: _citySlug,
  teamSlug: _teamSlug,
}: EditTeamButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [desc, setDesc] = useState(description ?? '')
  const [links, setLinks] = useState<SocialLink[]>(socialLinks.length > 0 ? socialLinks : [])
  const [saving, setSaving] = useState(false)

  if (!canEdit) return null

  function addLink() {
    setLinks([...links, { platform: 'telegram', url: '' }])
  }

  function removeLink(index: number) {
    setLinks(links.filter((_, i) => i !== index))
  }

  function updateLink(index: number, field: 'platform' | 'url', value: string) {
    const updated = [...links]
    updated[index] = { ...updated[index], [field]: value }
    setLinks(updated)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/teams/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          description: desc || null,
          socialLinks: links.filter((l) => l.url.trim()),
        }),
      })
      if (res.ok) {
        setOpen(false)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
      <Dialog.Trigger asChild>
        <Button size="xs" variant="ghost" colorPalette="brand" title={`Редактировать ${teamName}`}>
          <LuPencil size={14} />
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW={{ base: 'calc(100vw - 32px)', sm: 'lg' }}>
            <Dialog.Header>
              <Dialog.Title>Редактировать {teamName}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                {/* Логотип команды */}
                <Flex justify="center">
                  <EntityPhotoUploader
                    entityType="team"
                    entityId={teamId}
                    currentPhoto={logo}
                    size={120}
                    placeholder={<LuUsers size={40} />}
                    label="Логотип команды"
                  />
                </Flex>

                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Описание
                  </Text>
                  <Textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Описание команды..."
                    rows={3}
                    size="sm"
                  />
                </Box>

                {/* Социальные ссылки */}
                <Box>
                  <Flex justify="space-between" align="center" mb={2}>
                    <Text fontSize="sm" fontWeight="medium">
                      Ссылки
                    </Text>
                    <Button size="xs" variant="ghost" onClick={addLink}>
                      <LuPlus size={14} />
                      Добавить
                    </Button>
                  </Flex>
                  <VStack gap={2} align="stretch">
                    {links.map((link, i) => (
                      <HStack key={i} gap={2}>
                        <NativeSelect.Root size="sm" w="130px">
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
                        </NativeSelect.Root>
                        <Input
                          value={link.url}
                          onChange={(e) => updateLink(i, 'url', e.target.value)}
                          placeholder="URL"
                          size="sm"
                          flex={1}
                        />
                        <Button size="xs" variant="ghost" colorPalette="red" onClick={() => removeLink(i)}>
                          <LuTrash2 size={14} />
                        </Button>
                      </HStack>
                    ))}
                  </VStack>
                </Box>

                <Flex justify="flex-end">
                  <Button colorPalette="brand" size="sm" onClick={handleSave} loading={saving}>
                    Сохранить
                  </Button>
                </Flex>
              </VStack>
            </Dialog.Body>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
