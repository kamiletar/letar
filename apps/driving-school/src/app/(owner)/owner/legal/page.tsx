import { prisma } from '@/lib/db'
import { Box, Card, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'

import type { LegalDocumentType } from '@letar/driving-school-db/prisma'

import { LegalDocumentCard } from './_components/legal-document-card'

const documentTypes: LegalDocumentType[] = ['OFFER', 'PRIVACY_POLICY']

export default async function LegalDocumentsPage() {
  // Получаем все документы с текущими версиями и статистикой
  const documents = await prisma.legalDocument.findMany({
    include: {
      currentVersion: true,
      _count: {
        select: { versions: true },
      },
    },
  })

  // Создаём карту документов по типу
  // Cast для совместимости типов с _count между ZenStack и Prisma
  type DocumentWithCount = (typeof documents)[number] & { _count: { versions: number } }
  const documentsByType = new Map((documents as DocumentWithCount[]).map((doc: DocumentWithCount) => [doc.type, doc]))

  // Получаем количество принятий для каждого документа
  const agreementCounts = await prisma.userAgreement.groupBy({
    by: ['versionId'],
    _count: { _all: true },
  })

  const agreementCountMap = new Map<string, number>(agreementCounts.map((a) => [a.versionId, a._count._all]))

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок */}
      <HStack justify="space-between">
        <Box>
          <Heading size="lg">Юридические документы</Heading>
          <Text color="fg.muted" mt={1}>
            Управление офертой и политикой конфиденциальности
          </Text>
        </Box>
      </HStack>

      {/* Карточки документов */}
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
        {documentTypes.map((type) => {
          const document = documentsByType.get(type)
          const agreementCount = document?.currentVersionId
            ? (agreementCountMap.get(document.currentVersionId) ?? 0)
            : 0

          return (
            <LegalDocumentCard key={type} type={type} document={document ?? null} agreementCount={agreementCount} />
          )
        })}
      </SimpleGrid>

      {/* Инструкция */}
      <Card.Root>
        <Card.Body>
          <VStack align="start" gap={2}>
            <Text fontWeight="medium">Важно:</Text>
            <Text fontSize="sm" color="fg.muted">
              • При создании новой версии документа все пользователи увидят уведомление о необходимости принять новые
              условия
            </Text>
            <Text fontSize="sm" color="fg.muted">
              • Документы поддерживают базовое форматирование: **жирный**, *курсив*, заголовки (#, ##, ###), списки (-,
              1.)
            </Text>
            <Text fontSize="sm" color="fg.muted">
              • Версионирование следует формату semver (1.0.0, 1.1.0, 2.0.0)
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
