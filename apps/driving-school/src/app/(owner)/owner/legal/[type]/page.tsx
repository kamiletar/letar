import { prisma } from '@/lib/db'
import { Badge, Box, Button, Card, Heading, HStack, Icon, Table, Text, VStack } from '@chakra-ui/react'
import type { LegalDocumentType } from '@letar/driving-school-db/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LuArrowLeft, LuPlus } from 'react-icons/lu'
import { CreateVersionForm } from '../_components/create-version-form'

// Конфигурация документов
const documentConfig: Record<string, { type: LegalDocumentType; title: string; slug: string }> = {
  offer: { type: 'OFFER', title: 'Договор-оферта', slug: 'offer' },
  privacy_policy: { type: 'PRIVACY_POLICY', title: 'Политика конфиденциальности', slug: 'privacy-policy' },
}

interface PageProps {
  params: Promise<{ type: string }>
}

export default async function LegalDocumentEditPage({ params }: PageProps) {
  const { type } = await params
  const config = documentConfig[type]

  if (!config) {
    notFound()
  }

  // Получаем документ с версиями
  const document = await prisma.legalDocument.findUnique({
    where: { type: config.type },
    include: {
      currentVersion: true,
      versions: {
        orderBy: { effectiveAt: 'desc' },
        take: 10,
      },
    },
  })

  // Получаем статистику принятий для каждой версии
  const versionIds = document?.versions.map((v) => v.id) ?? []
  const agreementCounts =
    versionIds.length > 0
      ? await prisma.userAgreement.groupBy({
          by: ['versionId'],
          where: { versionId: { in: versionIds } },
          _count: { _all: true },
        })
      : []

  const agreementCountMap = new Map<string, number>(agreementCounts.map((a) => [a.versionId, a._count._all]))

  // Определяем следующую версию
  const suggestedVersion = getNextVersion(document?.currentVersion?.version)

  return (
    <VStack gap={6} align="stretch">
      {/* Навигация */}
      <HStack>
        <Button asChild variant="ghost" size="sm">
          <Link href="/owner/legal">
            <Icon as={LuArrowLeft} mr={2} />
            Назад
          </Link>
        </Button>
      </HStack>

      {/* Заголовок */}
      <HStack justify="space-between">
        <Box>
          <Heading size="lg">{config.title}</Heading>
          <Text color="fg.muted" mt={1}>
            {document?.currentVersion ? `Текущая версия: ${document.currentVersion.version}` : 'Документ ещё не создан'}
          </Text>
        </Box>
        {document?.currentVersion && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/legal/${config.slug}`} target="_blank">
              Просмотр на сайте
            </Link>
          </Button>
        )}
      </HStack>

      {/* История версий */}
      {document && document.versions.length > 0 && (
        <Card.Root>
          <Card.Header>
            <Card.Title>История версий</Card.Title>
          </Card.Header>
          <Card.Body>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Версия</Table.ColumnHeader>
                  <Table.ColumnHeader>Дата публикации</Table.ColumnHeader>
                  <Table.ColumnHeader>Описание</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Принятий</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {document.versions.map((version) => (
                  <Table.Row key={version.id}>
                    <Table.Cell>
                      <HStack gap={2}>
                        <Text fontFamily="mono">{version.version}</Text>
                        {version.id === document.currentVersionId && (
                          <Badge colorPalette="green" size="sm">
                            текущая
                          </Badge>
                        )}
                      </HStack>
                    </Table.Cell>
                    <Table.Cell>{new Date(version.effectiveAt).toLocaleDateString('ru-RU')}</Table.Cell>
                    <Table.Cell color="fg.muted">{version.summary || '—'}</Table.Cell>
                    <Table.Cell textAlign="right">{agreementCountMap.get(version.id) ?? 0}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card.Body>
        </Card.Root>
      )}

      {/* Форма создания новой версии */}
      <Card.Root>
        <Card.Header>
          <HStack gap={2}>
            <Icon as={LuPlus} />
            <Card.Title>{document ? 'Создать новую версию' : 'Создать документ'}</Card.Title>
          </HStack>
        </Card.Header>
        <Card.Body>
          <CreateVersionForm
            documentType={config.type}
            suggestedVersion={suggestedVersion}
            currentContent={document?.currentVersion?.content}
          />
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

/**
 * Получить следующую версию документа
 */
function getNextVersion(currentVersion?: string): string {
  if (!currentVersion) {
    return '1.0.0'
  }

  const parts = currentVersion.split('.').map(Number)
  if (parts.length !== 3) {
    return '1.0.0'
  }

  // Увеличиваем patch версию по умолчанию
  parts[2]++
  return parts.join('.')
}
