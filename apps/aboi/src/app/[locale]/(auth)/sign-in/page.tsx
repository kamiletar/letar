'use client'

import { signIn } from '@/lib/auth-client'
import { Box, Button, Container, Heading, Input, Stack, Text } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignInPage() {
  const t = useTranslations('auth.signIn')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await signIn.email({ email, password })
    setLoading(false)

    if (result.error) {
      const code = result.error.code
      if (code === 'EMAIL_NOT_VERIFIED') {
        setError(t('errorUnverified'))
      } else {
        setError(t('errorInvalid'))
      }
      return
    }

    router.push('/profile')
    router.refresh()
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
                autoComplete="current-password"
              />
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
          {t('noAccount')}{' '}
          <Box asChild color="brand.solid" fontWeight="medium">
            <Link href="/sign-up">{t('signUpLink')}</Link>
          </Box>
        </Text>
      </Stack>
    </Container>
  )
}
