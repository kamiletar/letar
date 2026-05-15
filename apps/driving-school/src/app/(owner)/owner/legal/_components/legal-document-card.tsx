'use client'

import { Badge, Box, Button, Card, HStack, Icon, Stack, Text } from '@chakra-ui/react'
import type { LegalDocumentType } from '@letar/driving-school-db/prisma'
import Link from 'next/link'
import { LuExternalLink, LuFileText, LuPlus, LuShield } from 'react-icons/lu'

// Конфигурация документов
const documentConfig: Record<LegalDocumentType, { title: string; description: string; slug: string }> = {
  OFFER: {
    title: 'Договор-оферта',
    description: 'Публичный договор об оказании услуг платформы',
    slug: 'offer',
  },
  PRIVACY_POLICY: {
    title: 'Политика конфиденциальности',
    description: 'Политика обработки персональных данных',
    slug: 'privacy-policy',
  },
}

const typeIcons: Record<LegalDocumentType, typeof LuFileText> = {
  OFFER: LuFileText,
  PRIVACY_POLICY: LuShield,
}

interface LegalDocumentCardProps {
  type: LegalDocumentType
  document: {
    currentVersion: {
      version: string
      effectiveAt: Date
    } | null
    currentVersionId: string | null
    _count: {
      versions: number
    }
  } | null
  agreementCount: number
}

export function LegalDocumentCard({ type, document, agreementCount }: LegalDocumentCardProps) {
  const config = documentConfig[type]
  const IconComponent = typeIcons[type]

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <HStack gap={3}>
            <Icon as={IconComponent} boxSize={6} color="fg.muted" />
            <Box>
              <Card.Title>{config.title}</Card.Title>
              <Text fontSize="sm" color="fg.muted">
                {config.description}
              </Text>
            </Box>
          </HStack>
          {document?.currentVersion ? (
            <Badge colorPalette="green">v{document.currentVersion.version}</Badge>
          ) : (
            <Badge colorPalette="orange">Не создан</Badge>
          )}
        </HStack>
      </Card.Header>
      <Card.Body>
        <Stack gap={4}>
          {document?.currentVersion ? (
            <>
              <HStack justify="space-between" fontSize="sm">
                <Text color="fg.muted">Версий:</Text>
                <Text fontWeight="medium">{document._count.versions}</Text>
              </HStack>
              <HStack justify="space-between" fontSize="sm">
                <Text color="fg.muted">Принятий текущей версии:</Text>
                <Text fontWeight="medium">{agreementCount}</Text>
              </HStack>
              <HStack justify="space-between" fontSize="sm">
                <Text color="fg.muted">Дата публикации:</Text>
                <Text fontWeight="medium">
                  {new Date(document.currentVersion.effectiveAt).toLocaleDateString('ru-RU')}
                </Text>
              </HStack>
            </>
          ) : (
            <Text color="fg.muted" fontSize="sm">
              Документ ещё не создан. Создайте первую версию.
            </Text>
          )}
        </Stack>
      </Card.Body>
      <Card.Footer>
        <HStack gap={2} width="full">
          <Button asChild variant="outline" size="sm" flex={1}>
            <Link href={`/legal/${config.slug}`} target="_blank">
              <Icon as={LuExternalLink} mr={2} />
              Просмотр
            </Link>
          </Button>
          <Button asChild colorPalette="brand" size="sm" flex={1}>
            <Link href={`/owner/legal/${type.toLowerCase()}`}>
              <Icon as={document ? LuFileText : LuPlus} mr={2} />
              {document ? 'Управление' : 'Создать'}
            </Link>
          </Button>
        </HStack>
      </Card.Footer>
    </Card.Root>
  )
}
