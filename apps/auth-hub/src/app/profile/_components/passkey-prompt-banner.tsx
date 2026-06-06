'use client'

import { Box, Button, HStack, IconButton, Stack, Text } from '@chakra-ui/react'
import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser'
import { useEffect, useState } from 'react'
import { LuKey, LuX } from 'react-icons/lu'

const DISMISSED_KEY = 'passkey_prompt_dismissed'

interface PasskeyPromptBannerProps {
  /** Уже есть passkeys у пользователя — баннер не нужен */
  hasPasskeys: boolean
}

/**
 * Баннер-подсказка «Добавьте ключ доступа» после входа.
 * Показывается один раз, если у пользователя нет passkeys.
 * Dismissable — флаг хранится в localStorage.
 */
export function PasskeyPromptBanner({ hasPasskeys }: PasskeyPromptBannerProps) {
  const [visible, setVisible] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)

  useEffect(() => {
    if (hasPasskeys) {return}
    if (!browserSupportsWebAuthn()) {return}
    if (typeof localStorage === 'undefined') {return}
    if (localStorage.getItem(DISMISSED_KEY)) {return}
    setVisible(true)
  }, [hasPasskeys])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  async function handleRegister() {
    setRegistering(true)
    try {
      const optionsRes = await fetch('/api/auth/passkey/register/options', { method: 'POST' })
      if (!optionsRes.ok) {throw new Error('Ошибка получения параметров')}
      const optionsJSON = await optionsRes.json()

      const response = await startRegistration({ optionsJSON })

      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      })
      const result = await verifyRes.json()
      if (!verifyRes.ok || !result.verified) {throw new Error('Ошибка регистрации')}

      setRegistered(true)
      localStorage.setItem(DISMISSED_KEY, '1')
      setTimeout(() => setVisible(false), 2000)
    } catch (e) {
      if (e instanceof Error && e.name === 'NotAllowedError') {
        // Пользователь отменил — не показываем ошибку
        return
      }
      // При любой ошибке просто скрываем баннер
      dismiss()
    } finally {
      setRegistering(false)
    }
  }

  if (!visible) {return null}

  return (
    <Box
      bg="bg.subtle"
      borderWidth="1px"
      borderColor="border.emphasized"
      borderRadius="lg"
      p={4}
      position="relative"
    >
      <IconButton
        aria-label="Закрыть"
        variant="ghost"
        size="xs"
        position="absolute"
        top={2}
        right={2}
        onClick={dismiss}
      >
        <LuX />
      </IconButton>

      <Stack gap={3}>
        <HStack gap={2}>
          <LuKey size={18} />
          <Text fontWeight="semibold" fontSize="sm">
            {registered ? '✅ Ключ доступа добавлен!' : 'Войдите быстрее в следующий раз'}
          </Text>
        </HStack>

        {!registered && (
          <>
            <Text fontSize="sm" color="fg.muted">
              Добавьте ключ доступа — Touch ID / Face ID / Windows Hello. Больше не нужен пароль.
            </Text>
            <HStack gap={2}>
              <Button size="sm" colorPalette="brand" loading={registering} onClick={handleRegister}>
                Добавить
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Не сейчас
              </Button>
            </HStack>
          </>
        )}
      </Stack>
    </Box>
  )
}
