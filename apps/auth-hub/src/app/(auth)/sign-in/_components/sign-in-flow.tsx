'use client'

import { Box, Button, Collapsible, Heading, Link, Stack, Tabs, Text } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { LuArrowLeft, LuChevronDown, LuMail } from 'react-icons/lu'
import { LoginForm } from './login-form'
import { MagicLinkForm } from './magic-link-form'
import { AuthOAuthButtons } from './oauth-buttons'
import { PasskeySignInButton } from './passkey-button'
import { TelegramSignInButton } from './telegram-button'

interface SignInFlowProps {
  otherProviders: ('google' | 'github' | 'facebook')[]
  hasTelegram: boolean
}

/** По одному решению на экране; адрес сохраняется при смене почтового способа. */
export function SignInFlow({ otherProviders, hasTelegram }: SignInFlowProps) {
  const [step, setStep] = useState<'methods' | 'email'>('methods')
  const [emailMethod, setEmailMethod] = useState('link')
  const [email, setEmail] = useState('')
  const titleRef = useRef<HTMLHeadingElement>(null)
  const emailButtonRef = useRef<HTMLButtonElement>(null)
  const mounted = useRef(false)
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('error')
  const linkError = errorCode !== null
    && ['INVALID_TOKEN', 'invalid_token', 'EXPIRED_TOKEN', 'INVALID_MAGIC_LINK'].includes(errorCode)

  useEffect(() => {
    if (mounted.current) {
      if (step === 'email') { titleRef.current?.focus() }
      else { emailButtonRef.current?.focus() }
    }
    mounted.current = true
  }, [step])

  return (
    <Stack gap={6}>
      <Stack gap={2}>
        <Text color="fg.muted" fontSize="sm" fontWeight="medium">LETAR · ЕДИНЫЙ АККАУНТ</Text>
        <Heading asChild size="2xl" outline="none">
          <h1 ref={titleRef} tabIndex={-1}>{step === 'methods' ? 'Вход в Letar' : 'Вход по почте'}</h1>
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          {step === 'methods'
            ? 'Выберите удобный способ. Он подойдёт и для первого входа.'
            : 'Получите ссылку или используйте свой пароль.'}
        </Text>
      </Stack>

      {errorCode && (
        <Text role="alert" color="fg.error" fontSize="sm">
          {linkError
            ? 'Ссылка могла устареть или уже была использована. Получите новую ссылку для входа.'
            : 'Не удалось завершить вход. Попробуйте ещё раз или выберите другой способ.'}
        </Text>
      )}

      {step === 'methods'
        ? (
          <Stack gap={3}>
            <AuthOAuthButtons providers={['vk', 'yandex']} />
            <Button ref={emailButtonRef} variant="outline" minH="48px" onClick={() => setStep('email')}>
              <LuMail aria-hidden="true" /> Продолжить с почтой
            </Button>
            <Collapsible.Root>
              <Collapsible.Trigger asChild>
                <Button variant="plain" color="fg.muted" fontSize="sm" minH="44px" w="full">
                  Другие способы <LuChevronDown aria-hidden="true" />
                </Button>
              </Collapsible.Trigger>
              <Collapsible.Content>
                <Stack gap={3} pt={2}>
                  <AuthOAuthButtons providers={otherProviders} />
                  <PasskeySignInButton alwaysVisible />
                  {hasTelegram && <TelegramSignInButton />}
                </Stack>
              </Collapsible.Content>
            </Collapsible.Root>
          </Stack>
        )
        : (
          <Stack gap={4}>
            <Tabs.Root
              value={emailMethod}
              onValueChange={({ value }) => setEmailMethod(value)}
              variant="enclosed"
              fitted
            >
              <Tabs.List aria-label="Способ входа по почте" mb={5}>
                <Tabs.Trigger value="link" minH="44px">По ссылке</Tabs.Trigger>
                <Tabs.Trigger value="password" minH="44px">С паролем</Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="link" p={0}>
                {emailMethod === 'link' && <MagicLinkForm initialEmail={email} onEmailChange={setEmail} />}
              </Tabs.Content>
              <Tabs.Content value="password" p={0}>
                {emailMethod === 'password' && <LoginForm initialEmail={email} onEmailChange={setEmail} />}
              </Tabs.Content>
            </Tabs.Root>
            <Button variant="plain" color="fg.muted" minH="44px" alignSelf="center" onClick={() => setStep('methods')}>
              <LuArrowLeft aria-hidden="true" /> Все способы входа
            </Button>
          </Stack>
        )}

      <Box borderTopWidth="1px" pt={5}>
        <Text color="fg.muted" fontSize="sm" lineHeight="tall">
          Впервые здесь? Создадим аккаунт автоматически при входе через сервис или по ссылке из письма.
        </Text>
        <Text color="fg.muted" fontSize="xs" mt={3}>
          Один аккаунт для всех сервисов Letar.{' '}
          <Link asChild textDecoration="underline">
            <NextLink href="/privacy">Конфиденциальность</NextLink>
          </Link>
        </Text>
      </Box>
    </Stack>
  )
}
