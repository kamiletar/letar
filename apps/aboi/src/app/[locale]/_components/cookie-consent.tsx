'use client'

import { Box, Button, Container, HStack, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'aboi.consent.v1'

interface ConsentState {
  acceptedAnalytics: boolean
  acceptedMarketing: boolean
  acceptedFunctional: boolean
  consentVersion: string
}

const DEFAULT: ConsentState = {
  acceptedAnalytics: false,
  acceptedMarketing: false,
  acceptedFunctional: true,
  consentVersion: 'v1',
}

export function CookieConsent() {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) setShown(true)
  }, [])

  function persist(state: ConsentState) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    void fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }).catch(() => {/* ignore */})
    setShown(false)
  }

  if (!shown) return null

  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      bg="bg.surface"
      borderTopWidth="1px"
      borderColor="border"
      zIndex={1000}
      shadow="lg"
    >
      <Container maxW="6xl" py={4}>
        <Stack gap={3} direction={{ base: 'column', md: 'row' }} align="center" justify="space-between">
          <Text fontSize="sm" color="fg.muted">
            Мы используем cookie для работы корзины и анонимной аналитики. Подробнее —{' '}
            <Box asChild color="brand.solid" _hover={{ textDecoration: 'underline' }} display="inline">
              <Link href="/privacy">в политике обработки ПДн</Link>
            </Box>.
          </Text>
          <HStack gap={2} flexShrink={0}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                persist({
                  acceptedAnalytics: false,
                  acceptedMarketing: false,
                  acceptedFunctional: true,
                  consentVersion: 'v1',
                })}
            >
              Только необходимые
            </Button>
            <Button
              size="sm"
              colorPalette="brand"
              onClick={() =>
                persist({
                  acceptedAnalytics: true,
                  acceptedMarketing: true,
                  acceptedFunctional: true,
                  consentVersion: 'v1',
                })}
            >
              Принять все
            </Button>
          </HStack>
        </Stack>
      </Container>
    </Box>
  )
}

export const CONSENT_DEFAULT = DEFAULT
