'use client'

import { Button, Heading, HStack, Text, VStack } from '@chakra-ui/react'

import { FileUpload } from '../file-upload'
import { TemplateDownload } from '../template-download'
import type { ImportDataType } from './types'

interface StepUploadProps {
  dataType: ImportDataType
  selectedFile: File | null
  isLoading: boolean
  onFileSelect: (file: File) => void
  onFileClear: () => void
  onBack: () => void
}

/**
 * Шаг 2: Загрузка файла.
 */
export function StepUpload({ dataType, selectedFile, isLoading, onFileSelect, onFileClear, onBack }: StepUploadProps) {
  return (
    <VStack align="stretch" gap={6}>
      <VStack align="start" gap={2}>
        <Heading size="lg">Загрузите файл</Heading>
        <Text color="fg.muted">
          Загрузите Excel файл с данными {dataType === 'students' ? 'учеников' : 'инструкторов'}
        </Text>
      </VStack>

      <TemplateDownload dataType={dataType} />

      <FileUpload
        dataType={dataType}
        onFileSelect={onFileSelect}
        onFileClear={onFileClear}
        selectedFile={selectedFile}
        isLoading={isLoading}
      />

      <HStack justify="space-between">
        <Button variant="ghost" onClick={onBack}>
          Назад
        </Button>
      </HStack>
    </VStack>
  )
}
