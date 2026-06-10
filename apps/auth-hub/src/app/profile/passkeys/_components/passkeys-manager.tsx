'use client'

import { Badge, Button, HStack, Stack, Text } from '@chakra-ui/react'
import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuPlus, LuTrash2 } from 'react-icons/lu'

interface Passkey {
  id: string
  name: string | null
  deviceType: string
  createdAt: Date
}

interface PasskeysManagerProps {
  passkeys: Passkey[]
}

/**
 * Клиентский компонент управления ключами доступа.
 * Список, добавление и удаление passkeys.
 */
export function PasskeysManager({ passkeys: initialPasskeys }: PasskeysManagerProps) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    setAdding(true)
    setError(null)
    try {
      const optionsRes = await fetch('/api/passkey/register-options', { method: 'POST' })
      if (!optionsRes.ok) {
        const data = (await optionsRes.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'Ошибка получения параметров')
      }
      const optionsJSON = (await optionsRes.json()) as object

      const response = await startRegistration({ optionsJSON })

      const verifyRes = await fetch('/api/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      })
      const result = (await verifyRes.json()) as { verified?: boolean; error?: string }
      if (!verifyRes.ok || !result.verified) {
        throw new Error(result.error ?? 'Не удалось добавить ключ')
      }

      router.refresh()
    } catch (e) {
      if (e instanceof Error && e.name === 'NotAllowedError') {
        return
      }
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(passkeyId: string) {
    setDeletingId(passkeyId)
    setError(null)
    try {
      const res = await fetch('/api/passkey/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkeyId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Ошибка удаления')
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setDeletingId(null)
    }
  }

  const supportsWebAuthn = browserSupportsWebAuthn()

  return (
    <Stack gap={4}>
      {initialPasskeys.length === 0
        ? (
          <Text color="fg.muted" fontSize="sm">
            У вас нет зарегистрированных ключей доступа
          </Text>
        )
        : (
          <Stack gap={2}>
            {initialPasskeys.map((pk) => (
              <HStack
                key={pk.id}
                justify="space-between"
                p={3}
                borderWidth="1px"
                borderRadius="md"
                borderColor="border.subtle"
              >
                <Stack gap={0.5}>
                  <HStack gap={2}>
                    <Text fontSize="sm" fontWeight="medium">
                      {pk.name ?? (pk.deviceType === 'platform' ? 'Ключ устройства' : 'Переносной ключ')}
                    </Text>
                    <Badge size="sm" variant="outline">
                      {pk.deviceType === 'platform' ? 'платформа' : 'внешний'}
                    </Badge>
                  </HStack>
                  <Text fontSize="xs" color="fg.muted">
                    Добавлен {new Date(pk.createdAt).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </Stack>
                <Button
                  size="sm"
                  variant="ghost"
                  colorPalette="red"
                  loading={deletingId === pk.id}
                  onClick={() => handleDelete(pk.id)}
                  aria-label="Удалить ключ"
                >
                  <LuTrash2 />
                </Button>
              </HStack>
            ))}
          </Stack>
        )}

      {error && (
        <Text color="fg.error" fontSize="sm">
          {error}
        </Text>
      )}

      {supportsWebAuthn && (
        <Button variant="outline" loading={adding} onClick={handleAdd} alignSelf="start" gap={2}>
          <LuPlus />
          Добавить ключ доступа
        </Button>
      )}

      {!supportsWebAuthn && (
        <Text fontSize="sm" color="fg.muted">
          Ваш браузер не поддерживает ключи доступа
        </Text>
      )}
    </Stack>
  )
}
