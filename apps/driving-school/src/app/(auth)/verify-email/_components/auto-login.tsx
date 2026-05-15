'use client'

import { verifyAndLoginUser } from '@/app/(auth)/_actions/verify-login.action'
import { Box, Icon, Spinner, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuCircleCheck } from 'react-icons/lu'

interface AutoLoginProps {
  email: string
  autoLoginToken: string
}

export function AutoLogin({ email, autoLoginToken }: AutoLoginProps) {
  const [status, setStatus] = useState<'logging_in' | 'success' | 'error'>('logging_in')

  useEffect(() => {
    async function performAutoLogin() {
      try {
        const result = await verifyAndLoginUser({
          email,
          verificationToken: autoLoginToken,
        })

        if (result.success) {
          setStatus('success')
          // Редирект на onboarding
          window.location.href = '/onboarding'
        } else {
          setStatus('error')
          // Редирект на страницу входа при ошибке
          setTimeout(() => {
            window.location.href = '/sign-in'
          }, 2000)
        }
      } catch {
        setStatus('error')
        setTimeout(() => {
          window.location.href = '/sign-in'
        }, 2000)
      }
    }

    performAutoLogin()
  }, [email, autoLoginToken])

  return (
    <VStack gap={6}>
      {status === 'logging_in' && (
        <>
          <Spinner size="xl" color="fg" />
          <VStack gap={2}>
            <Text fontSize="xl" fontWeight="semibold" color="success.fg">
              Email подтверждён!
            </Text>
            <Text color="fg.muted" textAlign="center">
              Выполняется вход в аккаунт...
            </Text>
          </VStack>
        </>
      )}

      {status === 'success' && (
        <>
          <Icon color="success.solid" boxSize={16}>
            <LuCircleCheck />
          </Icon>
          <VStack gap={2}>
            <Text fontSize="xl" fontWeight="semibold" color="success.fg">
              Вход выполнен!
            </Text>
            <Text color="fg.muted" textAlign="center">
              Перенаправляем...
            </Text>
          </VStack>
        </>
      )}

      {status === 'error' && (
        <>
          <Box layerStyle="panel.warning">
            <Text color="warning.fg">
              Не удалось выполнить автоматический вход. Перенаправляем на страницу входа...
            </Text>
          </Box>
        </>
      )}
    </VStack>
  )
}
