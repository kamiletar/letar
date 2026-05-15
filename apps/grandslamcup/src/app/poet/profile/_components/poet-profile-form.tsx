'use client'

/**
 * Форма редактирования профиля поэта — фото, биография, социальные ссылки
 */

import { EntityPhotoUploader } from '@/app/_components/entity-photo-uploader'
import type { SocialLink } from '@/app/_components/social-links'
import { Box, Button, Circle, Flex, HStack, Input, NativeSelect, Text, Textarea, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuPlus, LuTrash2, LuUserRound } from 'react-icons/lu'

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

interface PoetProfileFormProps {
  playerId: string
  playerName: string
  playerPhoto: string | null
  bio: string | null
  socialLinks: SocialLink[]
}

export function PoetProfileForm({ playerId, playerName, playerPhoto, bio, socialLinks }: PoetProfileFormProps) {
  const router = useRouter()
  const [bioVal, setBioVal] = useState(bio ?? '')
  const [links, setLinks] = useState<SocialLink[]>(socialLinks.length > 0 ? socialLinks : [])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
    setMessage(null)
    try {
      const validLinks = links.filter((l) => l.url.trim())
      const { updatePoetProfileAction } = await import('@/app/poet/_actions/profile.action')
      const result = await updatePoetProfileAction({
        bio: bioVal.trim(),
        socialLinks: validLinks,
      })
      if ('error' in result) {
        setMessage({ type: 'error', text: String(result.error) })
      } else {
        setMessage({ type: 'success', text: 'Профиль сохранён' })
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <VStack gap={5} align="stretch">
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
          label={`Фото — ${playerName}`}
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
          placeholder="Расскажите о себе..."
          rows={5}
          size="sm"
        />
        <Text fontSize="xs" color="fg.muted">
          {bioVal.length} / 2000
        </Text>
      </Flex>

      {/* Социальные ссылки */}
      <Box>
        <Flex justify="space-between" align="center" mb={2}>
          <Text fontSize="sm" fontWeight="medium">
            Социальные ссылки
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
                <NativeSelect.Field value={link.platform} onChange={(e) => updateLink(i, 'platform', e.target.value)}>
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
              Нет ссылок — нажмите «Добавить»
            </Text>
          )}
        </VStack>
      </Box>

      {/* Сообщение */}
      {message && (
        <Text fontSize="sm" color={message.type === 'success' ? 'green.fg' : 'red.fg'}>
          {message.text}
        </Text>
      )}

      {/* Кнопка сохранения */}
      <Flex justify="flex-end">
        <Button colorPalette="brand" onClick={handleSave} loading={saving}>
          Сохранить
        </Button>
      </Flex>
    </VStack>
  )
}
