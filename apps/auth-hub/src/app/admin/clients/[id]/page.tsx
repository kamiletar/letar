import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Badge, Box, Button, Card, Code, HStack, Heading, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SecretBanner } from '../_components/secret-banner'
import { DeleteClientButton } from './_components/delete-client-button'
import { RotateSecretButton } from './_components/rotate-secret-button'

export const metadata: Metadata = { title: 'OAuth клиент' }

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ secret?: string }>
}

export default async function ClientDetailPage({ params, searchParams }: Props) {
  await requireAdmin()

  const { id } = await params
  const { secret } = await searchParams

  const client = await prisma.oauthApplication.findFirst({
    where: { clientId: id },
  })

  if (!client) {
    notFound()
  }

  const redirectList = client.redirectUrls
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)

  return (
    <Box maxW="3xl" mx="auto" p={6}>
      <HStack justify="space-between" mb={6} flexWrap="wrap" gap={3}>
        <HStack gap={3}>
          <Heading size="xl">{client.name}</Heading>
          <Badge colorPalette={client.disabled ? 'red' : 'green'} size="md">
            {client.disabled ? 'Отключён' : 'Активен'}
          </Badge>
        </HStack>
        <HStack gap={2}>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/admin/clients/${client.clientId}/edit`}>Редактировать</Link>
          </Button>
          <RotateSecretButton clientId={client.clientId} />
          <DeleteClientButton clientId={client.clientId} />
        </HStack>
      </HStack>

      {/* Secret banner — показывается только если ?secret= передан в URL */}
      {secret && <SecretBanner secret={secret} clientId={client.clientId} />}

      <Card.Root>
        <Card.Body>
          <Stack gap={4} divideY="1px">
            <HStack justify="space-between" py={2}>
              <Text color="fg.muted" fontSize="sm" minW="32">
                Client ID
              </Text>
              <Code fontSize="sm">{client.clientId}</Code>
            </HStack>
            <HStack justify="space-between" py={2}>
              <Text color="fg.muted" fontSize="sm" minW="32">
                Тип
              </Text>
              <Text fontSize="sm">{client.type ?? 'web'}</Text>
            </HStack>
            <HStack justify="space-between" py={2} alignItems="flex-start">
              <Text color="fg.muted" fontSize="sm" minW="32">
                Redirect URLs
              </Text>
              <Stack gap={1} textAlign="right">
                {redirectList.map((url) => (
                  <Code key={url} fontSize="xs">
                    {url}
                  </Code>
                ))}
              </Stack>
            </HStack>
            <HStack justify="space-between" py={2}>
              <Text color="fg.muted" fontSize="sm" minW="32">
                Skip Consent
              </Text>
              <Text fontSize="sm">{client.skipConsent ? 'Да' : 'Нет'}</Text>
            </HStack>
            <HStack justify="space-between" py={2}>
              <Text color="fg.muted" fontSize="sm" minW="32">
                Создан
              </Text>
              <Text fontSize="sm">{client.createdAt.toLocaleDateString('ru-RU')}</Text>
            </HStack>
          </Stack>
        </Card.Body>
      </Card.Root>

      <Box mt={4}>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/clients">← Все клиенты</Link>
        </Button>
      </Box>
    </Box>
  )
}
