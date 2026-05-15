'use client'

/**
 * DocumentUploadDialog — диалог загрузки документа ученика (v0.206.0)
 *
 * Функции:
 * - Загрузка файла (drag & drop, клик)
 * - Выбор типа документа
 * - Указание срока действия (для медсправки)
 * - Превью загруженного файла
 */

import { Box, Button, Dialog, Field, HStack, Icon, Input, NativeSelect, Portal, Text, VStack } from '@chakra-ui/react'
import type { StudentDocumentType } from '@letar/driving-school-db/prisma'
import { addYears, format } from 'date-fns'
import Image from 'next/image'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { LuFileText, LuUpload, LuX } from 'react-icons/lu'

import { DOCUMENT_TYPE_INFO } from '@/app/(school-admin)/school/progress/_actions/student-documents.action'
import { toaster } from '@/app/_components/ui/toaster'

export interface DocumentUploadDialogProps {
  /** Открыт ли диалог */
  open: boolean
  /** Callback закрытия */
  onClose: () => void
  /** ID прогресса ученика */
  progressId: string
  /** Предвыбранный тип документа (опционально) */
  defaultType?: StudentDocumentType
  /** Callback после успешной загрузки */
  onSuccess?: (fileId: string, documentType: StudentDocumentType, expiresAt?: string) => void
  /** Заголовок диалога */
  title?: string
}

// Допустимые MIME-типы
const ACCEPTED_MIME_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
}

const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB

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
 * Превью файла
 */
function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith('image/')
  const previewUrl = isImage ? URL.createObjectURL(file) : null

  return (
    <Box position="relative" borderRadius="md" overflow="hidden" borderWidth="1px" borderColor="border">
      {previewUrl ? (
        <Box position="relative" width="100%" height="200px">
          <Image
            src={previewUrl}
            alt={file.name}
            fill
            style={{ objectFit: 'contain' }}
            onLoad={() => URL.revokeObjectURL(previewUrl)}
          />
        </Box>
      ) : (
        <Box
          width="100%"
          height="200px"
          bg="bg.muted"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexDirection="column"
          gap={2}
        >
          <Icon boxSize={12} color="fg.muted">
            <LuFileText />
          </Icon>
          <Text fontSize="sm" color="fg.muted">
            {file.name}
          </Text>
        </Box>
      )}

      {/* Кнопка удаления */}
      <Button position="absolute" top={2} right={2} size="xs" colorPalette="red" variant="solid" onClick={onRemove}>
        <Icon boxSize={3}>
          <LuX />
        </Icon>
        Удалить
      </Button>

      {/* Информация о файле */}
      <Box p={2} bg="bg.subtle">
        <Text fontSize="xs" color="fg.muted" truncate>
          {file.name}
        </Text>
        <Text fontSize="xs" color="fg.muted">
          {formatFileSize(file.size)}
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Dropzone для загрузки файла
 */
function UploadDropzone({
  onFileSelect,
  acceptedMimeTypes,
}: {
  onFileSelect: (file: File) => void
  acceptedMimeTypes: string[]
}) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0])
      }
    },
    [onFileSelect]
  )

  // Фильтруем accept на основе допустимых типов
  const accept: Record<string, string[]> = {}
  for (const [mimeType, extensions] of Object.entries(ACCEPTED_MIME_TYPES)) {
    if (acceptedMimeTypes.includes(mimeType)) {
      accept[mimeType] = extensions
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    onDropRejected: (rejections) => {
      const error = rejections[0]?.errors[0]
      if (error?.code === 'file-too-large') {
        toaster.error({ title: 'Файл слишком большой', description: 'Максимальный размер: 15 MB' })
      } else if (error?.code === 'file-invalid-type') {
        toaster.error({ title: 'Неподдерживаемый формат', description: 'Допустимы: JPEG, PNG, WebP, PDF' })
      }
    },
  })

  return (
    <Box
      {...getRootProps()}
      p={8}
      borderWidth="2px"
      borderStyle="dashed"
      borderColor={isDragActive ? 'blue.solid' : 'border.muted'}
      borderRadius="lg"
      bg={isDragActive ? 'blue.subtle' : 'bg.subtle'}
      textAlign="center"
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        borderColor: 'blue.solid',
        bg: 'blue.subtle',
      }}
    >
      <input {...getInputProps()} />
      <VStack gap={2}>
        <Icon boxSize={10} color={isDragActive ? 'blue.fg' : 'fg.muted'}>
          <LuUpload />
        </Icon>
        <Text fontWeight="medium">{isDragActive ? 'Отпустите файл' : 'Перетащите файл или нажмите'}</Text>
        <Text fontSize="sm" color="fg.muted">
          JPEG, PNG, WebP или PDF до 15 MB
        </Text>
      </VStack>
    </Box>
  )
}

/**
 * Диалог загрузки документа
 */
export function DocumentUploadDialog({
  open,
  onClose,
  progressId,
  defaultType,
  onSuccess,
  title = 'Загрузка документа',
}: DocumentUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<StudentDocumentType | ''>(defaultType ?? '')
  const [expiresAt, setExpiresAt] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  // Получаем информацию о выбранном типе документа
  const typeInfo = documentType ? DOCUMENT_TYPE_INFO[documentType] : null

  // Сброс формы
  const resetForm = () => {
    setSelectedFile(null)
    setDocumentType(defaultType ?? '')
    setExpiresAt('')
    setIsUploading(false)
  }

  // Закрытие диалога
  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Обработка выбора файла
  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
  }

  // Удаление файла
  const handleRemoveFile = () => {
    setSelectedFile(null)
  }

  // Обработка изменения типа документа
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as StudentDocumentType
    setDocumentType(newType)

    // Автоматически устанавливаем срок действия +1 год для медсправки
    if (newType === 'MEDICAL_CERT' && !expiresAt) {
      const oneYearFromNow = addYears(new Date(), 1)
      setExpiresAt(format(oneYearFromNow, 'yyyy-MM-dd'))
    }
  }

  // Загрузка файла
  const handleUpload = async () => {
    if (!selectedFile || !documentType) {
      toaster.error({ title: 'Выберите файл и тип документа' })
      return
    }

    // Валидация срока действия для медсправки
    if (typeInfo?.hasExpiration && !expiresAt) {
      toaster.error({ title: 'Укажите срок действия медсправки' })
      return
    }

    setIsUploading(true)

    try {
      // 1. Загружаем файл через API
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('progressId', progressId)
      formData.append('documentType', documentType)

      const uploadResponse = await fetch('/api/upload/student-document', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json()
        throw new Error(error.error || 'Ошибка загрузки файла')
      }

      const { fileId } = await uploadResponse.json()

      // 2. Вызываем callback успеха с expiresAt для медсправки
      if (onSuccess) {
        onSuccess(fileId, documentType, expiresAt || undefined)
      }

      toaster.success({ title: 'Документ загружен' })
      handleClose()
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      toaster.error({
        title: 'Ошибка загрузки',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Список типов документов для select
  const documentTypes = Object.entries(DOCUMENT_TYPE_INFO).map(([value, info]) => ({
    value,
    label: info.label,
  }))

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && handleClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxWidth="md">
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <Button variant="ghost" size="sm" position="absolute" right={4} top={4}>
                  <LuX />
                </Button>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body>
              <VStack gap={4} align="stretch">
                {/* Выбор типа документа */}
                <Field.Root>
                  <Field.Label>Тип документа</Field.Label>
                  <NativeSelect.Root size="md">
                    <NativeSelect.Field
                      value={documentType}
                      onChange={handleTypeChange}
                      placeholder="Выберите тип документа"
                    >
                      <option value="" disabled>
                        Выберите тип документа
                      </option>
                      {documentTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                  {typeInfo && <Field.HelperText>{typeInfo.description}</Field.HelperText>}
                </Field.Root>

                {/* Срок действия (только для медсправки) */}
                {typeInfo?.hasExpiration && (
                  <Field.Root required>
                    <Field.Label>Срок действия</Field.Label>
                    <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                    <Field.HelperText>Медсправка действительна 1 год с даты выдачи</Field.HelperText>
                  </Field.Root>
                )}

                {/* Dropzone или превью */}
                {selectedFile ? (
                  <FilePreview file={selectedFile} onRemove={handleRemoveFile} />
                ) : (
                  <UploadDropzone
                    onFileSelect={handleFileSelect}
                    acceptedMimeTypes={typeInfo?.acceptedMimeTypes ?? Object.keys(ACCEPTED_MIME_TYPES)}
                  />
                )}
              </VStack>
            </Dialog.Body>

            <Dialog.Footer>
              <HStack gap={2}>
                <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                  Отмена
                </Button>
                <Button
                  colorPalette="blue"
                  onClick={handleUpload}
                  disabled={!selectedFile || !documentType || isUploading}
                  loading={isUploading}
                >
                  Загрузить
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
