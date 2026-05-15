'use client'

import { signOut } from '@/lib/auth-client'
import { Button, Container, Heading, Stack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignOutPage() {
  const t = useTranslations('auth.signOut')
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <Container maxW="md" py={{ base: 12, md: 20 }}>
      <Stack gap={6}>
        <Heading as="h1" size="2xl">
          {t('title')}
        </Heading>
        <Button onClick={handleSignOut} colorPalette="red" size="lg" loading={loading}>
          {t('submit')}
        </Button>
      </Stack>
    </Container>
  )
}
