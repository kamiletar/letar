'use client'

import { Box, Button, Spinner, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

import { unsubscribeByToken } from '@/app/_actions/subscription.action'
import { Link } from '@/i18n/navigation'

/**
 * Содержимое страницы отписки (использует useSearchParams)
 */
function UnsubscribeContent() {
  const t = useTranslations('unsubscribe')
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }

    unsubscribeByToken(token).then((result) => {
      setStatus(result.error ? 'error' : 'success')
    })
  }, [token])

  return (
    <VStack gap={4} textAlign="center">
      <Text fontSize="xl" fontWeight="300" letterSpacing="0.08em">
        {t('title')}
      </Text>

      {status === 'loading' && <Spinner size="sm" />}

      {status === 'success' && (
        <Text fontWeight="100" color="fg.muted">
          {t('success')}
        </Text>
      )}

      {status === 'error' && (
        <Text fontWeight="100" color="error.fg">
          {t('error')}
        </Text>
      )}

      <Button variant="ghost" fontWeight="100" asChild>
        <Link href="/">{t('back')}</Link>
      </Button>
    </VStack>
  )
}

/**
 * Страница отписки по токену из email
 */
export default function UnsubscribePage() {
  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" px={4}>
      <Suspense fallback={<Text fontWeight="100">...</Text>}>
        <UnsubscribeContent />
      </Suspense>
    </Box>
  )
}
