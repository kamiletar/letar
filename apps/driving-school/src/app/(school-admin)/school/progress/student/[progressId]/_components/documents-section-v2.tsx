'use client'

/**
 * DocumentsSectionV2 — секция документов ученика с карточками (v0.207.0)
 *
 * Функции:
 * - Карточки документов с превью файлов
 * - Загрузка через DocumentUploadDialog
 * - Индикатор истечения срока (медсправка)
 * - Одобрение/отклонение документов менеджером
 * - Диалог отклонения с комментарием
 */

import {
  Badge,
  Button,
  Card,
  Dialog,
  Field,
  HStack,
  Icon,
  Portal,
  Spinner,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import type { StudentDocumentStatus, StudentDocumentType } from '@letar/driving-school-db/prisma'
import { useCallback, useEffect, useState } from 'react'
import { LuCheck, LuFileText, LuTriangleAlert, LuUpload, LuX } from 'react-icons/lu'

import { DocumentCard, DocumentCardGrid, type DocumentData } from '@/app/_components/document-card'
import { DocumentUploadDialog } from '@/app/_components/document-upload-dialog'
import { toaster } from '@/app/_components/ui/toaster'
import type { StudentProgressDetails } from '../../../_actions/progress.action'
import {
  approveDocumentAction,
  createStudentDocumentAction,
  DOCUMENT_TYPE_INFO,
  getStudentDocumentsAction,
  rejectDocumentAction,
  type StudentDocumentWithRelations,
} from '../../../_actions/student-documents.action'

interface DocumentsSectionV2Props {
  progress: StudentProgressDetails
  canManage?: boolean
  onRefresh?: () => void
}

/**
 * Преобразование данных из API в формат для DocumentCard
 */
function mapToDocumentData(doc: StudentDocumentWithRelations): DocumentData {
  return {
    id: doc.id,
    type: doc.type,
    status: doc.status,
    version: doc.version,
    file: doc.file,
    expiresAt: doc.expiresAt,
    validFrom: doc.validFrom,
    reviewedAt: doc.reviewedAt,
    reviewedBy: doc.reviewedBy,
    reviewNote: doc.reviewNote,
    previousVersion: doc.previousVersion,
    createdAt: doc.createdAt,
  }
}

/**
 * Создание placeholder документов для типов, которые ещё не загружены
 */
function createPlaceholders(
  existingDocs: StudentDocumentWithRelations[],
  requiredTypes: StudentDocumentType[]
): DocumentData[] {
  const existingTypes = new Set(existingDocs.map((d) => d.type))

  return requiredTypes
    .filter((type) => !existingTypes.has(type))
    .map((type) => ({
      id: `placeholder-${type}`,
      type,
      status: 'PENDING' as StudentDocumentStatus,
      version: 0,
      file: null,
      expiresAt: null,
      validFrom: null,
      reviewedAt: null,
      reviewedBy: null,
      reviewNote: null,
      previousVersion: null,
      createdAt: new Date(),
    }))
}

/**
 * Диалог отклонения документа
 */
function RejectDialog({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (note: string) => void
  loading: boolean
}) {
  const [note, setNote] = useState('')

  const handleConfirm = () => {
    if (!note.trim()) {
      toaster.error({ title: 'Укажите причину отклонения' })
      return
    }
    onConfirm(note)
  }

  const handleClose = () => {
    setNote('')
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && handleClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxWidth="md">
            <Dialog.Header>
              <Dialog.Title>Отклонить документ</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <Button variant="ghost" size="sm" position="absolute" right={4} top={4}>
                  <LuX />
                </Button>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body>
              <Field.Root required>
                <Field.Label>Причина отклонения</Field.Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Укажите, что нужно исправить..."
                  rows={4}
                />
                <Field.HelperText>Ученик увидит этот комментарий и сможет загрузить новую версию</Field.HelperText>
              </Field.Root>
            </Dialog.Body>

            <Dialog.Footer>
              <HStack gap={2}>
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  Отмена
                </Button>
                <Button colorPalette="red" onClick={handleConfirm} disabled={!note.trim()} loading={loading}>
                  <LuX />
                  Отклонить
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

/**
 * Секция документов ученика v2
 */
export function DocumentsSectionV2({ progress, canManage = false, onRefresh }: DocumentsSectionV2Props) {
  const [documents, setDocuments] = useState<StudentDocumentWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)

  // Состояние диалогов
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadType, setUploadType] = useState<StudentDocumentType | undefined>()
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectDocId, setRejectDocId] = useState<string | null>(null)

  // Загрузка документов
  const loadDocuments = useCallback(async () => {
    setIsLoading(true)
    const result = await getStudentDocumentsAction(progress.id)
    if (result.success) {
      setDocuments(result.data)
    } else {
      toaster.error({ title: 'Ошибка загрузки документов' })
    }
    setIsLoading(false)
  }, [progress.id])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // Открытие диалога загрузки
  const handleOpenUpload = (type?: StudentDocumentType) => {
    setUploadType(type)
    setUploadDialogOpen(true)
  }

  // Успешная загрузка файла
  const handleUploadSuccess = async (fileId: string, documentType: StudentDocumentType, expiresAt?: string) => {
    setIsActionLoading(true)

    // Создаём запись документа
    const result = await createStudentDocumentAction({
      progressId: progress.id,
      type: documentType,
      fileId,
      expiresAt: expiresAt || undefined, // Для медсправки обязательно
    })

    setIsActionLoading(false)

    if (result.success) {
      toaster.success({ title: 'Документ загружен' })
      loadDocuments()
      onRefresh?.()
    } else {
      toaster.error({ title: 'Ошибка', description: result.message })
    }
  }

  // Одобрение документа
  const handleApprove = async (id: string) => {
    setIsActionLoading(true)
    const result = await approveDocumentAction(id)
    setIsActionLoading(false)

    if (result.success) {
      toaster.success({ title: 'Документ одобрен' })
      loadDocuments()
      onRefresh?.()
    } else {
      toaster.error({ title: 'Ошибка', description: result.message })
    }
  }

  // Открытие диалога отклонения
  const handleOpenReject = (id: string) => {
    setRejectDocId(id)
    setRejectDialogOpen(true)
  }

  // Отклонение документа
  const handleReject = async (note: string) => {
    if (!rejectDocId) {
      return
    }

    setIsActionLoading(true)
    const result = await rejectDocumentAction(rejectDocId, note)
    setIsActionLoading(false)

    if (result.success) {
      toaster.success({ title: 'Документ отклонён' })
      setRejectDialogOpen(false)
      setRejectDocId(null)
      loadDocuments()
      onRefresh?.()
    } else {
      toaster.error({ title: 'Ошибка', description: result.message })
    }
  }

  // Просмотр файла (открыть в новой вкладке)
  const handleView = (id: string) => {
    const doc = documents.find((d) => d.id === id)
    if (doc?.file) {
      window.open(`/uploads/${doc.file.path}`, '_blank')
    }
  }

  // Получаем требуемые типы документов
  const requiredTypes = Object.entries(DOCUMENT_TYPE_INFO)
    .filter(([_, info]) => info.required)
    .map(([type]) => type as StudentDocumentType)

  // Формируем список документов с placeholders
  const documentCards = [...documents.map(mapToDocumentData), ...createPlaceholders(documents, requiredTypes)].sort(
    (a, b) => {
      // Сортировка: требуемые сначала, затем по типу
      const aInfo = DOCUMENT_TYPE_INFO[a.type]
      const bInfo = DOCUMENT_TYPE_INFO[b.type]
      if (aInfo.required !== bInfo.required) {
        return aInfo.required ? -1 : 1
      }
      return a.type.localeCompare(b.type)
    }
  )

  // Статистика
  const stats = {
    total: documentCards.length,
    approved: documents.filter((d) => d.status === 'APPROVED').length,
    pending: documents.filter((d) => d.status === 'UPLOADED').length,
    rejected: documents.filter((d) => d.status === 'REJECTED').length,
    expired: documents.filter((d) => d.status === 'EXPIRED').length,
  }

  if (isLoading) {
    return (
      <Card.Root>
        <Card.Header>
          <HStack gap={2}>
            <Icon boxSize={5}>
              <LuFileText />
            </Icon>
            <Text fontWeight="semibold">Документы</Text>
          </HStack>
        </Card.Header>
        <Card.Body>
          <HStack justify="center" py={8}>
            <Spinner />
            <Text>Загрузка документов...</Text>
          </HStack>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <>
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <HStack gap={2}>
              <Icon boxSize={5}>
                <LuFileText />
              </Icon>
              <Text fontWeight="semibold">Документы</Text>
            </HStack>

            {/* Статистика */}
            <HStack gap={2} wrap="wrap">
              <Badge colorPalette="green" variant="subtle">
                <LuCheck />
                {stats.approved} одобрено
              </Badge>
              {stats.pending > 0 && (
                <Badge colorPalette="blue" variant="subtle">
                  {stats.pending} на проверке
                </Badge>
              )}
              {stats.rejected > 0 && (
                <Badge colorPalette="red" variant="subtle">
                  {stats.rejected} отклонено
                </Badge>
              )}
              {stats.expired > 0 && (
                <Badge colorPalette="orange" variant="subtle">
                  <LuTriangleAlert />
                  {stats.expired} истекло
                </Badge>
              )}
            </HStack>

            {/* Кнопка загрузки */}
            <Button size="sm" colorPalette="blue" onClick={() => handleOpenUpload()}>
              <Icon boxSize={4}>
                <LuUpload />
              </Icon>
              Загрузить документ
            </Button>
          </HStack>
        </Card.Header>

        <Card.Body>
          {documentCards.length === 0 ? (
            <VStack py={8} gap={4}>
              <Icon boxSize={12} color="fg.muted">
                <LuFileText />
              </Icon>
              <Text color="fg.muted">Документы ещё не загружены</Text>
              <Button colorPalette="blue" onClick={() => handleOpenUpload()}>
                <LuUpload />
                Загрузить первый документ
              </Button>
            </VStack>
          ) : (
            <DocumentCardGrid>
              {documentCards.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  canManage={canManage}
                  loading={isActionLoading}
                  onUploadNew={() => handleOpenUpload(doc.type)}
                  onApprove={handleApprove}
                  onReject={handleOpenReject}
                  onView={handleView}
                />
              ))}
            </DocumentCardGrid>
          )}
        </Card.Body>
      </Card.Root>

      {/* Диалог загрузки документа */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        progressId={progress.id}
        defaultType={uploadType}
        onSuccess={handleUploadSuccess}
      />

      {/* Диалог отклонения */}
      <RejectDialog
        open={rejectDialogOpen}
        onClose={() => {
          setRejectDialogOpen(false)
          setRejectDocId(null)
        }}
        onConfirm={handleReject}
        loading={isActionLoading}
      />
    </>
  )
}
