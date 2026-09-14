'use client'

import { Box, Button, Container, Heading, Icon, Spinner, Text, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { LuCircleCheck } from 'react-icons/lu'
import { type PinResendResult, type PinVerifyResult, usePinVerification } from './use-pin-verification'

/**
 * Тексты для компонента PIN-верификации.
 */
export interface PinVerificationTexts {
  /** Заголовок формы ввода PIN */
  title: string
  /** Подзаголовок под заголовком (обычно «Мы отправили код на &lt;email&gt;») */
  subtitle: ReactNode
  /** Заголовок при успешной верификации */
  verifiedTitle: string
  /** Сообщение при успешной верификации */
  verifiedMessage: string
  /** Заголовок когда завершено в другой вкладке */
  otherTabCompletedTitle: string
  /** Сообщение когда завершено в другой вкладке */
  otherTabCompletedMessage: string
  /** Заголовок когда открыто в другой вкладке (опционально — только для сброса пароля) */
  otherTabOpenedTitle?: string
  /** Сообщение когда открыто в другой вкладке */
  otherTabOpenedMessage?: string
  /** Дополнительные действия для экрана «завершено в другой вкладке» */
  otherTabCompletedActions?: ReactNode
  /** Дополнительные действия для экрана «открыто в другой вкладке» */
  otherTabOpenedActions?: ReactNode
}

/**
 * Props для компонента PIN-верификации.
 */
export interface PinVerificationFormProps {
  /** Email для верификации */
  email: string
  /** SSE endpoint для real-time уведомлений (URL с уже подставленным `streamToken`) */
  sseEndpoint: string
  /** Action для проверки PIN-кода */
  verifyAction: (email: string, pin: string) => Promise<PinVerifyResult>
  /** Action для повторной отправки PIN-кода */
  resendAction: (email: string) => Promise<PinResendResult>
  /** Callback при успешной верификации */
  onVerified: (result: { token?: string; resetToken?: string }) => void | Promise<void>
  /** Тексты для UI */
  texts: PinVerificationTexts
  /**
   * SSE события
   * - регистрация: `completedField='verified'`
   * - сброс пароля: `completedField='reset'`, `openedField='opened'`
   */
  sseEvents: {
    completedField: string
    openedField?: string
  }
  /**
   * Поле ввода кода — рендерит приложение своим инстансом `createForm` (либа не знает про формы
   * приложений, см. соседний паттерн у {@link EmailCodePanel}). Должен включать кнопку сабмита —
   * этот компонент своей не рендерит.
   */
  renderCodeForm: (props: { formKey: number; disabled: boolean; onComplete: (pin: string) => void }) => ReactNode
}

/**
 * Универсальный компонент для PIN-верификации.
 * Используется для регистрации и сброса пароля — сценарий определяют `sseEvents` и `texts`.
 */
export function PinVerificationForm(props: PinVerificationFormProps) {
  const { email, sseEndpoint, verifyAction, resendAction, onVerified, texts, sseEvents, renderCodeForm } = props

  const {
    error,
    isVerifying,
    isResending,
    resendCountdown,
    canResend,
    isVerified,
    completedInOtherTab,
    openedInOtherTab,
    formKey,
    handleVerify,
    handleResend,
  } = usePinVerification({
    email,
    sseEndpoint,
    verifyAction,
    resendAction,
    onVerified,
    sseEvents,
  })

  // Открыто в другой вкладке (только для сброса пароля)
  if (openedInOtherTab && texts.otherTabOpenedTitle) {
    return (
      <VStack gap={6} py={8}>
        <Icon color="info.solid" boxSize={16}>
          <LuCircleCheck />
        </Icon>
        <VStack gap={2}>
          <Heading size="lg" color="info.fg">
            {texts.otherTabOpenedTitle}
          </Heading>
          <Text color="fg.muted" textAlign="center">
            {texts.otherTabOpenedMessage}
          </Text>
        </VStack>
        {texts.otherTabOpenedActions}
      </VStack>
    )
  }

  // Завершено в другой вкладке — полноэкранное сообщение
  if (completedInOtherTab) {
    return (
      <Box position="fixed" inset={0} bg="bg" zIndex={9999} display="flex" alignItems="center" justifyContent="center">
        <Container maxW="md">
          <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
            <VStack gap={6}>
              <Icon color="success.solid" boxSize={16}>
                <LuCircleCheck />
              </Icon>
              <VStack gap={2}>
                <Heading size="lg" color="success.fg">
                  {texts.otherTabCompletedTitle}
                </Heading>
                <Text color="fg.muted" textAlign="center">
                  {texts.otherTabCompletedMessage}
                </Text>
              </VStack>
              {texts.otherTabCompletedActions}
            </VStack>
          </Box>
        </Container>
      </Box>
    )
  }

  // PIN верифицирован — спиннер и переход
  if (isVerified) {
    return (
      <VStack gap={6} py={8}>
        <Icon color="success.solid" boxSize={16}>
          <LuCircleCheck />
        </Icon>
        <VStack gap={2}>
          <Heading size="lg" color="success.fg">
            {texts.verifiedTitle}
          </Heading>
          <Text color="fg.muted" textAlign="center">
            {texts.verifiedMessage}
          </Text>
        </VStack>
        <Spinner size="lg" color="fg" />
      </VStack>
    )
  }

  // Форма ввода PIN
  return (
    <VStack gap={6} align="stretch">
      <Box textAlign="center">
        <Heading size="lg" mb={2}>
          {texts.title}
        </Heading>
        <Text color="fg.muted">{texts.subtitle}</Text>
      </Box>

      {renderCodeForm({ formKey, disabled: isVerifying, onComplete: handleVerify })}

      {error && (
        <Text color="fg.error" fontSize="sm" textAlign="center">
          {error}
        </Text>
      )}

      <Box textAlign="center">
        {canResend
          ? (
            <Button variant="ghost" size="sm" onClick={handleResend} loading={isResending}>
              Отправить код повторно
            </Button>
          )
          : (
            <Text color="fg.muted" fontSize="sm">
              Отправить повторно через {resendCountdown} сек
            </Text>
          )}
      </Box>

      <Text color="fg.muted" fontSize="xs" textAlign="center">
        Или перейдите по ссылке в письме
      </Text>
    </VStack>
  )
}
