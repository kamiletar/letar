import { InstructorHeader } from '@/app/(instructor)/_components/instructor-header'
import { Box, Button, Container, Heading, HStack, Input, QrCode, Text, VStack } from '@chakra-ui/react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getInvitation } from '../_actions/invite.action'
import { CopyButton } from './_components/copy-button'

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function InviteSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams
  const token = params.token

  if (!token) {
    redirect('/students/invite')
  }

  const invitation = await getInvitation(token)

  if (!invitation.success) {
    redirect('/students/invite')
  }

  // Получаем базовый URL из env или заголовков
  let baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (!baseUrl) {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3003'
    const protocol = headersList.get('x-forwarded-proto') || 'http'
    baseUrl = `${protocol}://${host}`
  }

  const inviteLink = `${baseUrl}/join-instructor/${token}`

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        <InstructorHeader />

        <Box>
          <Heading size="xl">Приглашение создано!</Heading>
          <Text color="fg.muted" mt={2}>
            Покажите QR-код ученику или отправьте ссылку
          </Text>
        </Box>

        <Box layerStyle="panel.success" p={6} borderRadius="lg">
          <VStack gap={6} align="center">
            {/* QR-код для сканирования */}
            <Box bg="white" p={4} borderRadius="lg">
              <QrCode.Root value={inviteLink} size="2xl">
                <QrCode.Frame>
                  <QrCode.Pattern fill="black" />
                </QrCode.Frame>
              </QrCode.Root>
            </Box>

            <Box textAlign="center">
              <Text fontWeight="bold" color="success.fg">
                Ученик может отсканировать QR-код
              </Text>
              <Text fontSize="sm" color="success.fg" mt={1}>
                Действительно до: {new Date(invitation.invitation.expiresAt).toLocaleDateString('ru-RU')}
              </Text>
            </Box>

            <Box w="full">
              <Text fontSize="sm" color="fg.muted" mb={2}>
                Или скопируйте ссылку:
              </Text>
              <HStack>
                <Input value={inviteLink} readOnly flex={1} bg="bg.panel" />
                <CopyButton text={inviteLink} />
              </HStack>
            </Box>
          </VStack>
        </Box>

        <HStack gap={3} justify="center">
          <Button asChild variant="outline" size="lg">
            <Link href="/students/invite">Создать ещё</Link>
          </Button>
          <Button asChild colorPalette="brand" size="lg">
            <Link href="/students">К ученикам</Link>
          </Button>
        </HStack>
      </VStack>
    </Container>
  )
}
