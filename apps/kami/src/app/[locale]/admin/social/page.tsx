import { prisma } from '@/lib/db'
import { Badge, Box, HStack, Switch, Table, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { AdminPageLayout } from '../_components'

export const metadata: Metadata = {
  title: 'Соцсети | Admin',
}

/** Иконки платформ */
const PLATFORM_ICONS: Record<string, string> = {
  TELEGRAM: '📨',
  VK: '📘',
  LINKEDIN: '💼',
  TWITTER: '🐦',
  FACEBOOK: '📱',
  INSTAGRAM: '📸',
  BLUESKY: '🦋',
  MASTODON: '🐘',
}

/**
 * Управление социальными платформами для кросс-постинга
 */
interface SocialPageProps {
  params: Promise<{ locale: string }>
}

export default async function SocialPage({ params }: SocialPageProps) {
  const { locale } = await params
  const platforms = await prisma.socialPlatform.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { crossPosts: true } },
    },
  })

  return (
    <AdminPageLayout title="Социальные платформы" total={platforms.length} basePath={`/${locale}/admin/social`}>
      {platforms.length === 0 ? (
        <Box p={8} textAlign="center">
          <Text color="fg.muted" mb={4}>
            Нет настроенных платформ. Добавьте платформу через сиды или базу данных.
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Поддерживаемые: Telegram, VK, LinkedIn, Twitter, Facebook, Instagram, Bluesky, Mastodon
          </Text>
        </Box>
      ) : (
        <Box overflowX="auto">
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Платформа</Table.ColumnHeader>
                <Table.ColumnHeader>Тип</Table.ColumnHeader>
                <Table.ColumnHeader>Статус</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Публикации</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {platforms.map((platform) => (
                <Table.Row key={platform.id}>
                  <Table.Cell>
                    <HStack gap={2}>
                      <Text fontSize="xl">{PLATFORM_ICONS[platform.type] || '🔗'}</Text>
                      <VStack gap={0} align="start">
                        <Text fontWeight="semibold">{platform.name}</Text>
                        <Text fontSize="xs" color="fg.muted">
                          {platform.id}
                        </Text>
                      </VStack>
                    </HStack>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant="subtle" colorPalette="blue">
                      {platform.type}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <HStack gap={2}>
                      <Switch.Root checked={platform.enabled} disabled>
                        <Switch.HiddenInput />
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch.Root>
                      <Text fontSize="sm">{platform.enabled ? 'Включена' : 'Выключена'}</Text>
                    </HStack>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text>{platform._count.crossPosts}</Text>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </AdminPageLayout>
  )
}
