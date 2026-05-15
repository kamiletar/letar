'use client'

/**
 * DocumentCard — карточка документа ученика с версионированием (v0.206.0)
 *
 * Функции:
 * - Отображение информации о документе
 * - Превью файла (изображение/PDF)
 * - Индикатор срока действия (для медсправки)
 * - История версий
 * - Действия: загрузить, одобрить, отклонить
 */

import { Box, Button, Card, Collapsible, HStack, Icon, IconButton, Separator, Text, VStack } from '@chakra-ui/react'
import type { StudentDocumentStatus, StudentDocumentType } from '@letar/driving-school-db/prisma'
import { format, formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import Image from 'next/image'
import { useState } from 'react'
import {
  LuCheck,
  LuChevronDown,
  LuChevronUp,
  LuClock,
  LuDownload,
  LuEye,
  LuFile,
  LuFileText,
  LuHistory,
  LuUpload,
  LuX,
} from 'react-icons/lu'

import { DOCUMENT_TYPE_INFO } from '@/app/(school-admin)/school/progress/_actions/student-documents.action'
import { getFileUrl } from '@/lib/images'

import { DOCUMENT_STATUS_CONFIG, ExpirationIndicator } from './expiration-indicator'
import { StatusBadge } from './status-badge'

// Тип файла документа
interface DocumentFile {
  id: string
  filename: string
  path: string
  mimeType: string
  size: number
}

// Предыдущая версия
interface PreviousVersion {
  id: string
  version: number
  createdAt: Date | string
}

// Проверяющий
interface ReviewedBy {
  id: string
  name: string | null
}

// Полный тип документа
export interface DocumentData {
  id: string
  type: StudentDocumentType
  status: StudentDocumentStatus
  version: number
  file: DocumentFile | null
  expiresAt: Date | string | null
  validFrom: Date | string | null
  reviewedAt: Date | string | null
  reviewedBy: ReviewedBy | null
  reviewNote: string | null
  previousVersion: PreviousVersion | null
  createdAt: Date | string
}

export interface DocumentCardProps {
  /** Данные документа */
  document: DocumentData
  /** Можно ли управлять документом (одобрять/отклонять) */
  canManage?: boolean
  /** Callback загрузки нового документа */
  onUploadNew?: () => void
  /** Callback одобрения */
  onApprove?: (id: string) => void
  /** Callback отклонения */
  onReject?: (id: string) => void
  /** Callback просмотра файла */
  onView?: (id: string) => void
  /** Загрузка */
  loading?: boolean
}

/**
 * Форматирование размера файла
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Иконка типа файла
 */
function FileTypeIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === 'application/pdf') {
    return <LuFileText />
  }
  if (mimeType.startsWith('image/')) {
    return <LuFile />
  }
  return <LuFile />
}

/**
 * Превью файла
 */
function FilePreview({ file }: { file: DocumentFile }) {
  const url = getFileUrl(file.path)

  if (file.mimeType.startsWith('image/')) {
    return (
      <Box position="relative" width="100%" height="120px" borderRadius="md" overflow="hidden" bg="bg.muted">
        <Image src={url} alt={file.filename} fill style={{ objectFit: 'cover' }} />
      </Box>
    )
  }

  // PDF или другой файл
  return (
    <Box
      width="100%"
      height="120px"
      borderRadius="md"
      bg="bg.muted"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      gap={2}
    >
      <Icon boxSize={8} color="fg.muted">
        <FileTypeIcon mimeType={file.mimeType} />
      </Icon>
      <Text fontSize="xs" color="fg.muted" textAlign="center" px={2} truncate>
        {file.filename}
      </Text>
    </Box>
  )
}

/**
 * Placeholder для отсутствующего файла
 */
function FilePlaceholder({ type }: { type: StudentDocumentType }) {
  const info = DOCUMENT_TYPE_INFO[type]

  return (
    <Box
      width="100%"
      height="120px"
      borderRadius="md"
      borderWidth="2px"
      borderStyle="dashed"
      borderColor="border.muted"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      gap={2}
      bg="bg.subtle"
    >
      <Icon boxSize={8} color="fg.muted">
        <LuUpload />
      </Icon>
      <Text fontSize="xs" color="fg.muted" textAlign="center">
        {info.label}
      </Text>
    </Box>
  )
}

/**
 * Карточка документа ученика
 */
export function DocumentCard({
  document,
  canManage = false,
  onUploadNew,
  onApprove,
  onReject,
  onView,
  loading = false,
}: DocumentCardProps) {
  const [showVersions, setShowVersions] = useState(false)
  const info = DOCUMENT_TYPE_INFO[document.type]

  // URL файла для скачивания
  const fileUrl = document.file ? getFileUrl(document.file.path) : null

  return (
    <Card.Root variant="outline" overflow="hidden">
      {/* Превью */}
      {document.file ? <FilePreview file={document.file} /> : <FilePlaceholder type={document.type} />}

      <Card.Body p={3} gap={3}>
        {/* Заголовок и статус */}
        <HStack justify="space-between" align="start">
          <VStack align="start" gap={0}>
            <Text fontWeight="semibold" fontSize="sm">
              {info.label}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              {info.description}
            </Text>
          </VStack>
          <StatusBadge status={document.status} config={DOCUMENT_STATUS_CONFIG} size="sm" />
        </HStack>

        {/* Срок действия (только для документов с истечением) */}
        {info.hasExpiration && document.status === 'APPROVED' && (
          <ExpirationIndicator expiresAt={document.expiresAt} size="sm" />
        )}

        {/* Информация о файле */}
        {document.file && (
          <HStack fontSize="xs" color="fg.muted" gap={3}>
            <Text>{formatFileSize(document.file.size)}</Text>
            <Text>
              Загружен{' '}
              {formatDistanceToNow(new Date(document.createdAt), {
                locale: ru,
                addSuffix: true,
              })}
            </Text>
          </HStack>
        )}

        {/* Комментарий проверяющего */}
        {document.reviewNote && (
          <Box p={2} borderRadius="md" bg={document.status === 'REJECTED' ? 'red.subtle' : 'green.subtle'}>
            <Text fontSize="xs" fontWeight="medium">
              {document.reviewedBy?.name ?? 'Менеджер'}:
            </Text>
            <Text fontSize="xs" color="fg.muted">
              {document.reviewNote}
            </Text>
          </Box>
        )}

        {/* Версия */}
        {document.version > 1 && (
          <Collapsible.Root>
            <Collapsible.Trigger asChild>
              <Button
                variant="ghost"
                size="xs"
                width="full"
                justifyContent="space-between"
                onClick={() => setShowVersions(!showVersions)}
              >
                <HStack gap={1}>
                  <Icon boxSize={3}>
                    <LuHistory />
                  </Icon>
                  <Text>Версия {document.version}</Text>
                </HStack>
                <Icon boxSize={3}>{showVersions ? <LuChevronUp /> : <LuChevronDown />}</Icon>
              </Button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <Box mt={2} pl={4} borderLeftWidth="2px" borderColor="border.muted">
                {document.previousVersion && (
                  <Text fontSize="xs" color="fg.muted">
                    Предыдущая версия от{' '}
                    {format(new Date(document.previousVersion.createdAt), 'dd.MM.yyyy HH:mm', {
                      locale: ru,
                    })}
                  </Text>
                )}
              </Box>
            </Collapsible.Content>
          </Collapsible.Root>
        )}

        <Separator />

        {/* Действия */}
        <HStack justify="space-between">
          {/* Левая часть — просмотр и скачивание */}
          <HStack gap={1}>
            {document.file && (
              <>
                {onView && (
                  <IconButton aria-label="Просмотр" size="xs" variant="ghost" onClick={() => onView(document.id)}>
                    <LuEye />
                  </IconButton>
                )}
                {fileUrl && (
                  <IconButton asChild aria-label="Скачать" size="xs" variant="ghost">
                    {/* oxlint-disable-next-line nextjs/no-html-link-for-pages -- download атрибут требует обычную ссылку */}
                    <a href={fileUrl} download={document.file.filename}>
                      <LuDownload />
                    </a>
                  </IconButton>
                )}
              </>
            )}
          </HStack>

          {/* Правая часть — управление */}
          <HStack gap={1}>
            {/* Загрузка нового документа */}
            {(document.status === 'PENDING' || document.status === 'REJECTED') && onUploadNew && (
              <Button size="xs" colorPalette="blue" variant="outline" onClick={onUploadNew} disabled={loading}>
                <Icon boxSize={3} mr={1}>
                  <LuUpload />
                </Icon>
                Загрузить
              </Button>
            )}

            {/* Одобрение/отклонение для менеджера */}
            {canManage && document.status === 'UPLOADED' && (
              <>
                {onApprove && (
                  <IconButton
                    aria-label="Одобрить"
                    size="xs"
                    colorPalette="green"
                    variant="solid"
                    onClick={() => onApprove(document.id)}
                    disabled={loading}
                  >
                    <LuCheck />
                  </IconButton>
                )}
                {onReject && (
                  <IconButton
                    aria-label="Отклонить"
                    size="xs"
                    colorPalette="red"
                    variant="outline"
                    onClick={() => onReject(document.id)}
                    disabled={loading}
                  >
                    <LuX />
                  </IconButton>
                )}
              </>
            )}

            {/* Перезагрузка истёкшего документа */}
            {document.status === 'EXPIRED' && onUploadNew && (
              <Button size="xs" colorPalette="orange" variant="solid" onClick={onUploadNew} disabled={loading}>
                <Icon boxSize={3} mr={1}>
                  <LuUpload />
                </Icon>
                Обновить
              </Button>
            )}
          </HStack>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}

/**
 * Грид карточек документов
 */
export function DocumentCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <Box
      display="grid"
      gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }}
      gap={4}
    >
      {children}
    </Box>
  )
}

/**
 * Список требуемых документов с индикацией заполненности
 */
export function DocumentChecklist({ documents }: { documents: DocumentData[] }) {
  const allTypes = Object.entries(DOCUMENT_TYPE_INFO).filter(([_, info]) => info.required)

  return (
    <VStack align="stretch" gap={2}>
      {allTypes.map(([type, info]) => {
        const doc = documents.find((d) => d.type === type)
        const isComplete = doc?.status === 'APPROVED'
        const isUploaded = doc?.status === 'UPLOADED'

        return (
          <HStack key={type} justify="space-between" p={2} borderRadius="md" bg="bg.subtle">
            <HStack gap={2}>
              <Icon boxSize={4} color={isComplete ? 'green.fg' : isUploaded ? 'blue.fg' : 'fg.muted'}>
                {isComplete ? <LuCheck /> : <LuClock />}
              </Icon>
              <Text fontSize="sm">{info.label}</Text>
            </HStack>
            {doc && <StatusBadge status={doc.status} config={DOCUMENT_STATUS_CONFIG} size="xs" />}
          </HStack>
        )
      })}
    </VStack>
  )
}
