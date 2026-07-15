import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Badge, Box, Card, Flex, Heading, HStack, Separator, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import NextLink from 'next/link'
import { LuArrowLeft, LuMail } from 'react-icons/lu'
import { AddEmailForm } from './_components/add-email-form'
import { EmailRow } from './_components/email-row'

export const metadata: Metadata = {
  title: 'Email-адреса',
}

export default async function EmailsPage() {
  const session = await requireAuth()

  const additionalEmails = await prisma.userEmail.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <Box maxW="lg" mx="auto" p={6}>
      <Stack gap={6}>
        <HStack gap={2}>
          <NextLink href="/profile">
            <LuArrowLeft size={18} />
          </NextLink>
          <LuMail size={22} />
          <Heading size="lg">Email-адреса</Heading>
        </HStack>

        <Text color="fg.muted" fontSize="sm">
          Дополнительные адреса привязываются к вашему аккаунту после подтверждения. Основным (для входа и уведомлений)
          можно назначить любой подтверждённый адрес.
        </Text>

        <Card.Root>
          <Card.Body>
            <Stack gap={3}>
              <Flex justify="space-between" align="center">
                <Box>
                  <Text fontWeight="medium">{session.user.email}</Text>
                  <Text fontSize="xs" color="fg.muted">
                    Основной адрес
                  </Text>
                </Box>
                <Badge colorPalette={session.user.emailVerified ? 'green' : 'yellow'} size="sm">
                  {session.user.emailVerified ? 'подтверждён' : 'не подтверждён'}
                </Badge>
              </Flex>

              {additionalEmails.length > 0 && <Separator />}

              {additionalEmails.map((entry) => (
                <EmailRow key={entry.id} id={entry.id} email={entry.email} verified={entry.verified} />
              ))}
            </Stack>
          </Card.Body>
        </Card.Root>

        <AddEmailForm />
      </Stack>
    </Box>
  )
}
