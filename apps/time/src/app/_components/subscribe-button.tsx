'use client'

import { Box, Button, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { LuBell, LuSettings } from 'react-icons/lu'

import { Link } from '@/i18n/navigation'
import { signInWithLetarAuth, useSession } from '@/lib/auth-client'

import { PressableCta } from './pressable-cta'

/**
 * Кнопка подписки на уведомления о юбилеях
 */
export function SubscribeButton() {
  const t = useTranslations('subscribe')
  const { data: session } = useSession()
  const [showExplanation, setShowExplanation] = useState(false)

  // Не авторизован — показываем кнопку входа с пояснением
  if (!session) {
    return (
      <VStack gap={2}>
        <Button
          variant="ghost"
          size="sm"
          fontWeight="100"
          letterSpacing="0.1em"
          onClick={() => {
            if (showExplanation) {
              signInWithLetarAuth()
            } else {
              setShowExplanation(true)
            }
          }}
        >
          <LuBell />
          {t('subscribe')}
        </Button>

        {showExplanation && (
          <Box maxW="300px" textAlign="center">
            <Text fontSize="xs" fontWeight="100" color="fg.muted" mb={2}>
              {t('explanation')}
            </Text>
            {
              /* Главный CTA блока — реальный вход, а не переключатель пояснения выше.
                `colorPalette="brand"` + `variant="solid"` вместо `outline`: без тёмной заливки
                ripple `PressableCta` (белый полупрозрачный) не виден. */
            }
            <PressableCta>
              <Button
                size="xs"
                colorPalette="brand"
                variant="solid"
                fontWeight="200"
                mb={2}
                onClick={() => signInWithLetarAuth()}
              >
                {t('signIn')}
              </Button>
            </PressableCta>
          </Box>
        )}
      </VStack>
    )
  }

  // Авторизован — ссылка на настройки
  return (
    <Button variant="ghost" size="sm" fontWeight="100" letterSpacing="0.1em" asChild>
      <Link href="/profile">
        <LuSettings />
        {t('settings')}
      </Link>
    </Button>
  )
}
