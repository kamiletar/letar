'use client'

/**
 * ProfileSection — Секция профиля пользователя
 *
 * Отображает информацию о профиле и позволяет редактировать displayName.
 */

import { Box, Button, Editable, Flex, HStack, Spinner, Text, VStack } from '@chakra-ui/react'

import { toaster } from '@/components/ui/toaster'
import { useCallback, useState } from 'react'
import { LuPencil, LuSave, LuUser, LuX } from 'react-icons/lu'

import { useProfile } from '../../../hooks/useProfile'
import { FriendCodeDisplay } from './FriendCodeDisplay'

export interface ProfileSectionProps {
  /** Callback при успешном обновлении профиля */
  onProfileUpdated?: () => void
}

/**
 * Секция профиля пользователя
 */
export function ProfileSection({ onProfileUpdated }: ProfileSectionProps) {
  const { isLoading, isReady, profile, error, updateProfile } = useProfile()
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleStartEdit = useCallback(() => {
    setEditedName(profile?.displayName || '')
    setIsEditing(true)
  }, [profile?.displayName])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditedName('')
  }, [])

  const handleSave = useCallback(async () => {
    if (!editedName.trim()) {
      toaster.error({
        title: 'Введите имя',
        description: 'Имя не может быть пустым',
      })
      return
    }

    setIsSaving(true)

    try {
      const success = await updateProfile({ displayName: editedName.trim() })

      if (success) {
        toaster.success({
          title: 'Профиль обновлён',
          description: 'Ваше имя успешно изменено',
        })
        setIsEditing(false)
        onProfileUpdated?.()
      } else {
        toaster.error({
          title: 'Ошибка сохранения',
          description: 'Не удалось обновить профиль',
        })
      }
    } finally {
      setIsSaving(false)
    }
  }, [editedName, updateProfile, onProfileUpdated])

  // Загрузка
  if (isLoading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" />
        <Text mt={2} color="fg.muted">
          Загрузка профиля...
        </Text>
      </Box>
    )
  }

  // Ошибка или не готов
  if (!isReady || error) {
    return (
      <Box p={6} borderRadius="lg" bg="bg.error.subtle" textAlign="center">
        <Text color="fg.error" fontWeight="medium">
          {error || 'Профиль недоступен'}
        </Text>
        <Text fontSize="sm" color="fg.muted" mt={1}>
          Убедитесь, что P2P сеть запущена
        </Text>
      </Box>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок */}
      <Flex align="center" gap={2}>
        <LuUser size={20} />
        <Text fontSize="lg" fontWeight="semibold">
          Профиль
        </Text>
      </Flex>

      {/* Имя пользователя */}
      <Box p={4} borderRadius="lg" bg="bg.subtle" borderWidth="1px" borderColor="border.subtle">
        <Flex justify="space-between" align="center">
          <VStack align="start" gap={1}>
            <Text fontSize="xs" color="fg.muted" fontWeight="medium">
              Отображаемое имя
            </Text>
            {isEditing
              ? (
                <Editable.Root
                  value={editedName}
                  onValueChange={(e) => setEditedName(e.value)}
                  placeholder="Введите имя"
                  activationMode="focus"
                  autoFocus
                >
                  <Editable.Preview />
                  <Editable.Input fontSize="xl" fontWeight="semibold" maxLength={50} />
                </Editable.Root>
              )
              : (
                <Text fontSize="xl" fontWeight="semibold">
                  {profile?.displayName || 'Анонимус'}
                </Text>
              )}
          </VStack>

          {isEditing
            ? (
              <HStack gap={2}>
                <Button size="sm" variant="ghost" onClick={handleCancelEdit} disabled={isSaving}>
                  <LuX />
                  Отмена
                </Button>
                <Button size="sm" colorPalette="blue" onClick={handleSave} loading={isSaving}>
                  <LuSave />
                  Сохранить
                </Button>
              </HStack>
            )
            : (
              <Button size="sm" variant="ghost" onClick={handleStartEdit}>
                <LuPencil />
                Изменить
              </Button>
            )}
        </Flex>
      </Box>

      {/* Friend Code */}
      <FriendCodeDisplay friendCode={profile?.friendCode || null} />

      {/* Дополнительная информация */}
      <Box p={4} borderRadius="lg" bg="bg.subtle" borderWidth="1px" borderColor="border.subtle">
        <VStack align="start" gap={3}>
          <HStack justify="space-between" w="full">
            <Text fontSize="sm" color="fg.muted">
              PeerId
            </Text>
            <Text fontSize="sm" fontFamily="mono" maxW="300px" truncate>
              {profile?.peerId || '—'}
            </Text>
          </HStack>

          <HStack justify="space-between" w="full">
            <Text fontSize="sm" color="fg.muted">
              Создан
            </Text>
            <Text fontSize="sm">
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
                : '—'}
            </Text>
          </HStack>
        </VStack>
      </Box>
    </VStack>
  )
}
