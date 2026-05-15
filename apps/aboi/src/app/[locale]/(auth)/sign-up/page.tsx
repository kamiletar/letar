'use client'

import { authClient } from '@/lib/auth-client'
import { Box, Button, Container, Heading, Input, Stack, Text } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'

export default function SignUpPage() {
  const t = useTranslations('auth.signUp')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await authClient.signUp.email({ name, email, password })
    setLoading(false)

    if (result.error) {
      setError(result.error.message ?? 'Ошибка регистрации')
      return
    }

    setSubmittedEmail(email)
  }

  if (submittedEmail) {
    return (
      <Container maxW="md" py={{ base: 12, md: 20 }}>
        <Stack gap={4}>
          <Heading as="h1" size="2xl">
            {t('successTitle')}
          </Heading>
          <Text color="fg.muted">{t('successText', { email: submittedEmail })}</Text>
        </Stack>
      </Container>
    )
  }

  return (
    <Container maxW="md" py={{ base: 12, md: 20 }}>
      <Stack gap={6}>
        <Stack gap={2}>
          <Heading as="h1" size="2xl">
            {t('title')}
          </Heading>
          <Text color="fg.muted">{t('subtitle')}</Text>
        </Stack>

        <form onSubmit={handleSubmit}>
          <Stack gap={4}>
            <Stack gap={1}>
              <Text fontSize="sm" fontWeight="medium" asChild>
                <label htmlFor="name">{t('name')}</label>
              </Text>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </Stack>
            <Stack gap={1}>
              <Text fontSize="sm" fontWeight="medium" asChild>
                <label htmlFor="email">{t('email')}</label>
              </Text>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </Stack>
            <Stack gap={1}>
              <Text fontSize="sm" fontWeight="medium" asChild>
                <label htmlFor="password">{t('password')}</label>
              </Text>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <Text fontSize="xs" color="fg.muted">
                {t('passwordHint')}
              </Text>
            </Stack>

            {error && (
              <Box bg="red.subtle" color="red.fg" p={3} borderRadius="md" fontSize="sm">
                {error}
              </Box>
            )}

            <Button type="submit" colorPalette="brand" size="lg" loading={loading}>
              {t('submit')}
            </Button>
          </Stack>
        </form>

        <Text fontSize="sm" color="fg.muted">
          {t('haveAccount')}{' '}
          <Box asChild color="brand.solid" fontWeight="medium">
            <Link href="/sign-in">{t('signInLink')}</Link>
          </Box>
        </Text>
      </Stack>
    </Container>
  )
}
