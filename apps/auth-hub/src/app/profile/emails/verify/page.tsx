import { Alert, Box, Button, Stack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import NextLink from 'next/link'

import { verifyAddedEmail } from '../_actions/emails.action'

export const metadata: Metadata = {
  title: 'Подтверждение email',
}

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams

  const result = token ? await verifyAddedEmail(token) : { error: 'Ссылка недействительна' }
  const success = !('error' in result) || !result.error

  return (
    <Box maxW="md" mx="auto" p={6}>
      <Stack gap={4}>
        <Alert.Root status={success ? 'success' : 'error'} variant="subtle">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{success ? 'Email подтверждён' : 'Не удалось подтвердить'}</Alert.Title>
            <Alert.Description>
              {success ? 'Адрес добавлен к вашему аккаунту.' : 'error' in result ? result.error : ''}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>

        <Button asChild>
          <NextLink href="/profile/emails">Вернуться к email-адресам</NextLink>
        </Button>
      </Stack>
    </Box>
  )
}
