'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { signIn, signUp } from '@/lib/auth-client'
import { Box, Button, Container, Heading, HStack, Icon, Input, Separator, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FaGoogle, FaVk, FaYandex } from 'react-icons/fa'
import { LuBookOpen, LuFilm, LuUserPlus } from 'react-icons/lu'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signUp.email({
        email,
        password,
        name,
      })

      // Сохраняем birthDate отдельным запросом (Better Auth не поддерживает кастомные поля в signUp)
      if (birthDate) {
        await fetch('/api/user/birth-date', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ birthDate }),
        })
      }

      router.push('/browse')
      router.refresh()
    } catch {
      toaster.error({
        title: 'Ошибка регистрации',
        description: 'Попробуйте другой email',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: 'google' | 'yandex' | 'vk' | 'shikimori') => {
    try {
      if (provider === 'google') {
        await signIn.social({ provider: 'google' })
      } else {
        // Yandex, VK, Shikimori через genericOAuth плагин (oauth2, не oauth!)
        await signIn.oauth2({ providerId: provider })
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
            <Text color="fg.muted">Создайте аккаунт</Text>
          </VStack>

          {/* OAuth Buttons */}
          <VStack gap={3} w="100%">
            <Button w="100%" variant="outline" onClick={() => handleOAuthSignIn('google')}>
              <Icon as={FaGoogle} mr={2} />
              Продолжить с Google
            </Button>
            <Button w="100%" variant="outline" onClick={() => handleOAuthSignIn('yandex')}>
              <Icon as={FaYandex} mr={2} />
              Продолжить с Яндекс
            </Button>
            <Button w="100%" variant="outline" onClick={() => handleOAuthSignIn('vk')}>
              <Icon as={FaVk} mr={2} />
              Продолжить с VK
            </Button>
            <Button w="100%" variant="outline" onClick={() => handleOAuthSignIn('shikimori')}>
              <Icon as={LuBookOpen} mr={2} />
              Продолжить с Shikimori
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
          <Box as="form" onSubmit={handleEmailSignUp} w="100%">
            <VStack gap={4}>
              <Input placeholder="Имя" value={name} onChange={(e) => setName(e.target.value)} />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Пароль (минимум 8 символов)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              <Input
                type="date"
                placeholder="Дата рождения"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                min="1920-01-01"
              />
              <Button type="submit" w="100%" colorPalette="brand" loading={loading}>
                <Icon as={LuUserPlus} mr={2} />
                Зарегистрироваться
              </Button>
            </VStack>
          </Box>

          {/* Links */}
          <VStack gap={2}>
            <Text fontSize="sm" color="fg.muted">
              Уже есть аккаунт?{' '}
              <NextLink href="/sign-in">
                <Text as="span" color="brand.500" fontWeight="medium">
                  Войти
                </Text>
              </NextLink>
            </Text>
            <NextLink href="/browse">
              <Text fontSize="sm" color="fg.muted">
                Продолжить без регистрации →
              </Text>
            </NextLink>
          </VStack>
        </VStack>
      </Container>
    </Box>
  )
}
