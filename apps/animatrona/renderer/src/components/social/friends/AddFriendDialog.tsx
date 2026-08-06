/**
 * AddFriendDialog — Диалог добавления друга
 *
 * Позволяет добавить друга по Friend Code или показать свой код для добавления.
 */

'use client'

import {
  Box,
  Button,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  Heading,
  HStack,
  Input,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useState } from 'react'

import { toaster } from '@/components/ui/toaster'

import { useProfile } from '../../../hooks/useProfile'

interface AddFriendDialogProps {
  /** Диалог открыт */
  open: boolean
  /** Закрыть диалог */
  onClose: () => void
  /** Callback при отправке запроса */
  onRequestSent?: () => void
}

export function AddFriendDialog({ open, onClose, onRequestSent }: AddFriendDialogProps) {
  const { profile, validateFriendCode, getPeerId } = useProfile()
  const [friendCode, setFriendCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Форматирование ввода (XXXX-XXXX)
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')

    // Добавляем дефис после 4 символов
    if (value.length > 4) {
      value = `${value.slice(0, 4)}-${value.slice(4, 8)}`
    }

    setFriendCode(value)
    setValidationError(null)
  }, [])

  // Валидация кода
  const handleValidate = useCallback(async () => {
    if (friendCode.length !== 9) {
      setValidationError('Friend Code должен быть в формате XXXX-XXXX')
      return false
    }

    const isValid = await validateFriendCode(friendCode)
    if (!isValid) {
      setValidationError('Неверный формат Friend Code')
      return false
    }

    return true
  }, [friendCode, validateFriendCode])

  // Отправка запроса
  const handleSendRequest = useCallback(async () => {
    setIsValidating(true)
    const isValid = await handleValidate()
    setIsValidating(false)

    if (!isValid) {
      return
    }

    // Проверяем что это не свой код
    if (profile?.friendCode === friendCode) {
      setValidationError('Нельзя добавить себя в друзья')
      return
    }

    if (!window.electronAPI?.friends) {
      toaster.error({ title: 'Friends API недоступен' })
      return
    }

    setIsSending(true)

    try {
      // Получаем PeerId по Friend Code через верификацию
      // Для MVP пока отправляем запрос напрямую (PeerId = friendCode для упрощения)
      // В полной реализации нужен discovery через DHT
      const myPeerId = await getPeerId()

      if (!myPeerId) {
        toaster.error({ title: 'Не удалось получить PeerId' })
        return
      }

      // Отправляем запрос (targetPeerId временно = friendCode)
      // В реальной реализации нужен resolve friendCode → peerId
      const result = await window.electronAPI.friends.sendRequest(friendCode)

      if (result.success && result.data) {
        toaster.success({
          title: 'Запрос отправлен',
          description: `Ожидайте подтверждения от ${friendCode}`,
        })
        onRequestSent?.()
        onClose()
        setFriendCode('')
      } else {
        toaster.error({
          title: 'Ошибка',
          description: result.error || 'Не удалось отправить запрос',
        })
      }
    } catch (err) {
      toaster.error({
        title: 'Ошибка',
        description: err instanceof Error ? err.message : 'Неизвестная ошибка',
      })
    } finally {
      setIsSending(false)
    }
  }, [friendCode, profile, handleValidate, getPeerId, onRequestSent, onClose])

  // Копирование своего кода
  const handleCopyMyCode = useCallback(async () => {
    if (!profile?.friendCode) {
      return
    }

    try {
      await navigator.clipboard.writeText(profile.friendCode)
      toaster.success({ title: 'Friend Code скопирован' })
    } catch {
      toaster.error({ title: 'Не удалось скопировать' })
    }
  }, [profile])

  return (
    <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить друга</DialogTitle>
          <DialogDescription>Введите Friend Code друга или поделитесь своим кодом</DialogDescription>
        </DialogHeader>

        <DialogBody>
          <VStack gap={6} align="stretch">
            {/* Ввод Friend Code */}
            <Box>
              <Heading size="sm" mb={2}>
                Введите Friend Code
              </Heading>
              <HStack>
                <Input
                  placeholder="XXXX-XXXX"
                  value={friendCode}
                  onChange={handleInputChange}
                  maxLength={9}
                  fontFamily="mono"
                  textTransform="uppercase"
                  flex={1}
                />
                <Button
                  colorPalette="blue"
                  onClick={handleSendRequest}
                  disabled={friendCode.length !== 9 || isSending || isValidating}
                >
                  {isSending || isValidating ? <Spinner size="sm" /> : 'Добавить'}
                </Button>
              </HStack>
              {validationError && (
                <Text color="red.500" fontSize="sm" mt={1}>
                  {validationError}
                </Text>
              )}
            </Box>

            {/* Разделитель */}
            <HStack>
              <Box flex={1} borderBottom="1px solid" borderColor="border.muted" />
              <Text color="fg.muted" fontSize="sm">
                или
              </Text>
              <Box flex={1} borderBottom="1px solid" borderColor="border.muted" />
            </HStack>

            {/* Свой код */}
            <Box>
              <Heading size="sm" mb={2}>
                Ваш Friend Code
              </Heading>
              {profile?.friendCode
                ? (
                  <HStack p={3} bg="bg.subtle" borderRadius="md" justify="space-between">
                    <Text fontFamily="mono" fontSize="xl" fontWeight="bold">
                      {profile.friendCode}
                    </Text>
                    <Button size="sm" variant="ghost" onClick={handleCopyMyCode}>
                      Копировать
                    </Button>
                  </HStack>
                )
                : <Text color="fg.muted">Создайте профиль для получения кода</Text>}
            </Box>
          </VStack>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Закрыть
          </Button>
        </DialogFooter>

        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}
