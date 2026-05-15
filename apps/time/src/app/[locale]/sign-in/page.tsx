'use client'

import { Box, Spinner, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

import { useRouter } from '@/i18n/navigation'
import { signInWithLetarAuth, useSession } from '@/lib/auth-client'

/**
 * Страница входа — авто-редирект на OIDC
 */
export default function SignInPage() {
  const t = useTranslations('signIn')
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) {
      router.push('/')
    } else {
      signInWithLetarAuth()
    }
  }, [session, router])

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
      <VStack gap={3}>
        <Spinner size="md" />
        <Text fontWeight="100" letterSpacing="0.08em">
          {t('redirecting')}
        </Text>
      </VStack>
    </Box>
  )
}
