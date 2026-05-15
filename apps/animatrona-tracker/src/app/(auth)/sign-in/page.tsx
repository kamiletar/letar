'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { signIn, signInWithLetarAuth } from '@/lib/auth-client'
import { Box, Button, Container, Heading, HStack, Icon, Input, Separator, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { FaGoogle, FaVk, FaYandex } from 'react-icons/fa'
import { LuBookOpen, LuFilm, LuKeyRound, LuMail } from 'react-icons/lu'

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Если страница открыта через редирект из защищённого роута — returnTo
  // задан прокси, иначе фоллбэк на /browse
  const returnTo = searchParams.get('returnTo') ?? '/browse'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn.email({
        email,
        password,
      })
      router.push(returnTo)
      router.refresh()
    } catch {
      toaster.error({
        title: 'Ошибка входа',
        description: 'Неверный email или пароль',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: 'google' | 'yandex' | 'vk' | 'shikimori') => {
    try {
      if (provider === 'google') {
        await signIn.social({ provider: 'google', callbackURL: returnTo })
      } else {
        // Yandex, VK, Shikimori через genericOAuth плагин (oauth2, не oauth!)
        await signIn.oauth2({ providerId: provider, callbackURL: returnTo })
      }
    } catch {
      toaster.error({ title: 'Ошибка входа' })
    }
  }

  return (
    <Box minH="100vh" bg="bg" display="flex" alignItems="center">
      <Container maxW="400px">
        <VStack gap={8}>
          {/* Logo */}
          <VStack gap={2}>
            <HStack gap={2}>
              <Icon as={LuFilm} boxSize={8} color="brand.500" />
              <Heading size="xl">Animatrona</Heading>
            </HStack>
            <Text color="fg.muted">Войдите в аккаунт</Text>
          </VStack>

          {/* Вход через Ключницу */}
          <VStack gap={3} w="100%">
            <Button w="100%" colorPalette="brand" onClick={() => signInWithLetarAuth(returnTo)}>
              <Icon as={LuKeyRound} mr={2} />
              Войти через Ключницу
            </Button>
          </VStack>

          <HStack w="100%">
            <Separator flex={1} />
            <Text color="fg.muted" fontSize="sm">
              или напрямую
            </Text>
            <Separator flex={1} />
          </HStack>

          {/* OAuth Buttons */}
          <VStack gap={3} w="100%">
            <Button w="100%" variant="outline" onClick={() => handleOAuthSignIn('google')}>
              <Icon as={FaGoogle} mr={2} />
              Войти через Google
            </Button>
            <Button w="100%" variant="outline" onClick={() => handleOAuthSignIn('yandex')}>
              <Icon as={FaYandex} mr={2} />
              Войти через Яндекс
            </Button>
            <Button w="100%" variant="outline" onClick={() => handleOAuthSignIn('vk')}>
              <Icon as={FaVk} mr={2} />
              Войти через VK
            </Button>
            <Button w="100%" variant="outline" onClick={() => handleOAuthSignIn('shikimori')}>
              <Icon as={LuBookOpen} mr={2} />
              Войти через Shikimori
            </Button>
          </VStack>

          <HStack w="100%">
            <Separator flex={1} />
            <Text color="fg.muted" fontSize="sm">
              или
            </Text>
            <Separator flex={1} />
          </HStack>

          {/* Email Form */}
          <Box as="form" onSubmit={handleEmailSignIn} w="100%">
            <VStack gap={4}>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" w="100%" colorPalette="brand" loading={loading}>
                <Icon as={LuMail} mr={2} />
                Войти
              </Button>
            </VStack>
          </Box>

          {/* Links */}
          <VStack gap={2}>
            <Text fontSize="sm" color="fg.muted">
              Нет аккаунта?{' '}
              <NextLink href="/sign-up">
                <Text as="span" color="brand.500" fontWeight="medium">
                  Зарегистрироваться
                </Text>
              </NextLink>
            </Text>
            <NextLink href="/browse">
              <Text fontSize="sm" color="fg.muted">
                Продолжить без входа →
              </Text>
            </NextLink>
          </VStack>
        </VStack>
      </Container>
    </Box>
  )
}

/**
 * Next.js требует Suspense-boundary для useSearchParams в client-компоненте
 * при static rendering, иначе prerender падает.
 */
export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  )
}
