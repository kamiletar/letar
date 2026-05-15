'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Button, Card, Checkbox, HStack, Text, VStack } from '@chakra-ui/react'
import type { DocumentsStatus } from '@letar/driving-school-db/prisma'
import { useState } from 'react'
import { LuCheck, LuFileText, LuSave } from 'react-icons/lu'

import { updateDocumentsStatusAction } from '../../../_actions/documents.action'
import type { StudentProgressDetails } from '../../../_actions/progress.action'

// Список документов для чеклиста
const DOCUMENTS_LIST = [
  { key: 'passport', label: 'Паспорт (копия)' },
  { key: 'snils', label: 'СНИЛС' },
  { key: 'medcert', label: 'Мед. справка' },
  { key: 'photos', label: 'Фотографии 3x4' },
  { key: 'application', label: 'Заявление' },
  { key: 'contract', label: 'Договор' },
]

const DOCUMENTS_STATUS_CONFIG: Record<DocumentsStatus, { label: string; color: string }> = {
  NOT_STARTED: { label: 'Не начато', color: 'gray' },
  IN_PROGRESS: { label: 'В процессе', color: 'yellow' },
  READY: { label: 'Готовы', color: 'green' },
}

interface DocumentsSectionProps {
  progress: StudentProgressDetails
  onRefresh: () => void
}

export function DocumentsSection({ progress, onRefresh }: DocumentsSectionProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    (progress.documentsChecklist as Record<string, boolean>) || {}
  )

  const statusConfig = DOCUMENTS_STATUS_CONFIG[progress.documentsStatus]

  const handleChecklistChange = (key: string, checked: boolean) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: checked,
    }))
  }

  const handleSaveChecklist = async () => {
    setIsUpdating(true)
    const result = await updateDocumentsStatusAction({
      progressId: progress.id,
      checklist,
    })
    setIsUpdating(false)

    if (result.success) {
      toaster.success({ title: 'Чеклист обновлён' })
      onRefresh()
    } else {
      toaster.error({ title: 'Ошибка', description: result.message })
    }
  }

  const handleMarkReady = async () => {
    setIsUpdating(true)
    const result = await updateDocumentsStatusAction({
      progressId: progress.id,
      status: 'READY',
    })
    setIsUpdating(false)

    if (result.success) {
      toaster.success({ title: 'Документы отмечены как готовые' })
      onRefresh()
    } else {
      toaster.error({ title: 'Ошибка', description: result.message })
    }
  }

  const allDocsReady = DOCUMENTS_LIST.every((doc) => checklist[doc.key])

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <HStack gap={2}>
            <LuFileText size={20} />
            <Text fontWeight="semibold">Документы</Text>
          </HStack>
          <Badge colorPalette={statusConfig.color} size="lg">
            {statusConfig.label}
          </Badge>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap={4}>
          {/* Чеклист документов */}
          <VStack align="stretch" gap={2}>
            {DOCUMENTS_LIST.map((doc) => (
              <Checkbox.Root
                key={doc.key}
                checked={checklist[doc.key] || false}
                onCheckedChange={(e) => handleChecklistChange(doc.key, !!e.checked)}
                disabled={progress.documentsStatus === 'READY'}
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control>
                  <Checkbox.Indicator>
                    <LuCheck />
                  </Checkbox.Indicator>
                </Checkbox.Control>
                <Checkbox.Label>{doc.label}</Checkbox.Label>
              </Checkbox.Root>
            ))}
          </VStack>

          {/* Филиал документов */}
          {progress.documentsLocation && (
            <Text fontSize="sm" color="fg.muted">
              Филиал: {progress.documentsLocation.name}
            </Text>
          )}

          {/* Дата готовности */}
          {progress.documentsReadyAt && (
            <Text fontSize="sm" color="fg.muted">
              Готовы: {new Date(progress.documentsReadyAt).toLocaleDateString('ru-RU')}
            </Text>
          )}

          {/* Кнопки действий */}
          {progress.documentsStatus !== 'READY' && (
            <HStack gap={3} pt={2}>
              <Button size="sm" variant="outline" onClick={handleSaveChecklist} disabled={isUpdating}>
                <LuSave />
                Сохранить чеклист
              </Button>
              {allDocsReady && (
                <Button size="sm" colorPalette="green" onClick={handleMarkReady} disabled={isUpdating}>
                  <LuCheck />
                  Документы готовы
                </Button>
              )}
            </HStack>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
