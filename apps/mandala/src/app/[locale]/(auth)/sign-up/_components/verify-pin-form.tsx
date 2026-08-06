'use client'

import { resendVerificationPinAction } from '@/app/[locale]/(auth)/_actions/resend-pin.action'
import { verifyAndLoginUser } from '@/app/[locale]/(auth)/_actions/verify-login.action'
import { verifyPinAction } from '@/app/[locale]/(auth)/_actions/verify-pin.action'
import { Box, Button, Heading, Icon, PinInput, Spinner, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { LuCircleCheck } from 'react-icons/lu'

interface VerifyPinFormProps {
  email: string
}

export function VerifyPinForm({ email }: VerifyPinFormProps) {
  const router = useRouter()
  const t = useTranslations('auth.verifyPin')
  const tErrors = useTranslations('auth.errors')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [verifiedInOtherTab, setVerifiedInOtherTab] = useState(false)

  // Таймер для повторной отправки
  useEffect(() => {
    if (resendCountdown <= 0) {
      setCanResend(true)
      return
    }
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCountdown])

  // Polling для проверки верификации (когда юзер кликнет ссылку в письме)
  // Polling на клиенте вместо SSE на сервере — экономит память сервера
  useEffect(() => {
    let isMounted = true

    const checkVerification = async () => {
      try {
        const res = await fetch(`/api/auth/verification-stream/${encodeURIComponent(email)}`)
        if (!res.ok) {
          return
        }

        const data = await res.json()
        if (data.verified && isMounted) {
          setVerifiedInOtherTab(true)
        }
      } catch {
        // Ошибка сети — не критично, пользователь может использовать PIN-код
      }
    }

    // Проверяем каждые 2 секунды (как было с SSE)
    const interval = setInterval(checkVerification, 2000)

    // Первая проверка сразу
    checkVerification()

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [email])

  // Проверка PIN-кода
  const handleVerify = useCallback(
    async (pinValue: string) => {
      if (pinValue.length !== 6) {
        setError(tErrors('enterPinCode'))
        return
      }

      setIsVerifying(true)
      setError('')

      try {
        const result = await verifyPinAction(email, pinValue)

        if (result.success) {
          setIsVerified(true)
          // Авто-логин после верификации через server action
          const loginResult = await verifyAndLoginUser(email, result.token)
          if (loginResult.success) {
            router.push('/account')
            router.refresh()
          } else {
            setError(loginResult.error)
          }
        } else {
          switch (result.error) {
            case 'INVALID_PIN':
              setError(tErrors('invalidPin'))
              setPin('')
              break
            case 'PIN_EXPIRED':
              setError(tErrors('pinExpired'))
              setCanResend(true)
              break
            case 'TOO_MANY_ATTEMPTS':
              setError(tErrors('tooManyAttempts'))
              break
            default:
              setError(tErrors('unknownError'))
          }
        }
      } catch {
        setError(tErrors('unknownError'))
      } finally {
        setIsVerifying(false)
      }
    },
    [email, router, tErrors],
  )

  // Повторная отправка PIN-кода
  const handleResend = useCallback(async () => {
    setIsResending(true)
    setError('')

    try {
      const result = await resendVerificationPinAction(email)

      if (result.success) {
        setResendCountdown(60)
        setCanResend(false)
        setPin('')
      } else {
        if (result.error === 'RATE_LIMITED') {
          setError(tErrors('rateLimited'))
        } else {
          setError(tErrors('sendCodeFailed'))
        }
      }
    } catch {
      setError(tErrors('sendCodeFailed'))
    } finally {
      setIsResending(false)
    }
  }, [email, tErrors])

  // Верификация в другой вкладке — показываем сообщение
  if (verifiedInOtherTab) {
    return (
      <VStack gap={6} py={8}>
        <Icon color="green.500" boxSize={16}>
          <LuCircleCheck />
        </Icon>
        <VStack gap={2}>
          <Heading size="lg" color="green.400">
            {t('emailVerified')}
          </Heading>
          <Text color="fg.muted" textAlign="center">
            {t('verifiedInOtherTab')}
            <br />
            {t('canCloseTab')}
          </Text>
        </VStack>
      </VStack>
    )
  }

  // Верификация успешна — показываем спиннер и делаем авто-логин
  if (isVerified) {
    return (
      <VStack gap={6} py={8}>
        <Icon color="green.500" boxSize={16}>
          <LuCircleCheck />
        </Icon>
        <VStack gap={2}>
          <Heading size="lg" color="green.400">
            {t('emailVerified')}
          </Heading>
          <Text color="fg.muted" textAlign="center">
            {t('loggingIn')}
          </Text>
        </VStack>
        <Spinner size="lg" color="fg" />
      </VStack>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      <Box textAlign="center">
        <Heading size="lg" mb={2}>
          {t('title')}
        </Heading>
        <Text color="fg.muted">
          {t('codeSentTo')} <strong>{email}</strong>
        </Text>
      </Box>

      <VStack gap={4}>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <Text fontSize="sm" color="fg.muted" mb={2}>
            {t('enterCode')}
          </Text>
          <PinInput.Root
            value={pin.split('')}
            onValueChange={(e) => setPin(e.value.join(''))}
            onValueComplete={(e) => handleVerify(e.valueAsString)}
            otp
            disabled={isVerifying}
          >
            <PinInput.HiddenInput />
            <PinInput.Control>
              <PinInput.Input index={0} />
              <PinInput.Input index={1} />
              <PinInput.Input index={2} />
              <PinInput.Input index={3} />
              <PinInput.Input index={4} />
              <PinInput.Input index={5} />
            </PinInput.Control>
          </PinInput.Root>
          {error && (
            <Text color="red.300" fontSize="sm" textAlign="center">
              {error}
            </Text>
          )}
        </Box>

        <Button
          colorPalette="fg"
          size="lg"
          width="full"
          loading={isVerifying}
          disabled={isVerifying || pin.length !== 6}
          onClick={() => handleVerify(pin)}
        >
          {t('confirm')}
        </Button>
      </VStack>

      <Box textAlign="center">
        {canResend
          ? (
            <Button variant="ghost" size="sm" onClick={handleResend} loading={isResending}>
              {t('resendCode')}
            </Button>
          )
          : (
            <Text color="fg.muted" fontSize="sm">
              {t('resendIn', { seconds: resendCountdown })}
            </Text>
          )}
      </Box>

      <Text color="fg.muted" fontSize="xs" textAlign="center">
        {t('orClickLink')}
      </Text>
    </VStack>
  )
}
