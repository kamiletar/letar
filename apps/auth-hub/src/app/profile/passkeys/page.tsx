import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Box, Heading, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import NextLink from 'next/link'
import { LuChevronLeft } from 'react-icons/lu'
import { PasskeysManager } from './_components/passkeys-manager'

export const metadata: Metadata = {
  title: 'Ключи доступа',
}

/**
 * Страница управления passkeys пользователя
 */
export default async function PasskeysPage() {
  const session = await requireAuth()

  const passkeys = await prisma.passkey.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      deviceType: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <Box maxW="lg" mx="auto" p={6}>
      <Stack gap={6}>
        <Stack gap={1}>
          <Box asChild color="fg.muted" fontSize="sm">
            <NextLink href="/profile">
              <LuChevronLeft size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Профиль
            </NextLink>
          </Box>
          <Heading size="xl">Ключи доступа</Heading>
          <Text color="fg.muted" fontSize="sm">
            Touch ID / Face ID / Windows Hello — вход без пароля
          </Text>
        </Stack>

        <PasskeysManager passkeys={passkeys} />
      </Stack>
    </Box>
  )
}
