'use client'

import type { ImportDataType } from '@/lib/excel'
import { Box, Button, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { LuFile, LuUpload, LuX } from 'react-icons/lu'

interface FileUploadProps {
  dataType: ImportDataType
  onFileSelect: (file: File) => void
  onFileClear: () => void
  selectedFile: File | null
  isLoading?: boolean
}

export function FileUpload({
  dataType: _dataType,
  onFileSelect,
  onFileClear,
  selectedFile,
  isLoading,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} Б`
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} КБ`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
  }

  if (selectedFile) {
    return (
      <Box p={4} bg="bg.muted" borderRadius="lg" borderWidth="1px" borderColor="border">
        <HStack justify="space-between">
          <HStack>
            <Icon color="fg.muted">
              <LuFile />
            </Icon>
            <VStack align="start" gap={0}>
              <Text fontWeight="medium" fontSize="sm">
                {selectedFile.name}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {formatFileSize(selectedFile.size)}
              </Text>
            </VStack>
          </HStack>
          <Button size="sm" variant="ghost" colorPalette="red" onClick={onFileClear} disabled={isLoading}>
            <LuX />
          </Button>
        </HStack>
      </Box>
    )
  }

  return (
    <Box
      p={8}
      borderWidth="2px"
      borderStyle="dashed"
      borderColor={isDragging ? 'colorPalette.500' : 'border'}
      borderRadius="lg"
      bg={isDragging ? 'colorPalette.50' : 'bg.muted'}
      transition="all 0.2s"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      cursor="pointer"
      _hover={{ borderColor: 'colorPalette.400' }}
      colorPalette="brand"
    >
      <VStack gap={4}>
        <Icon fontSize="3xl" color="fg.muted">
          <LuUpload />
        </Icon>
        <VStack gap={1}>
          <Text fontWeight="medium">Перетащите файл сюда</Text>
          <Text fontSize="sm" color="fg.muted">
            или
          </Text>
        </VStack>
        <Button as="label" variant="outline" colorPalette="brand" cursor="pointer">
          Выбрать файл
          <input type="file" accept=".xlsx,.xls,.csv,.ods" onChange={handleFileChange} style={{ display: 'none' }} />
        </Button>
        <Text fontSize="xs" color="fg.muted">
          Поддерживаемые форматы: .xlsx, .ods, .csv
        </Text>
      </VStack>
    </Box>
  )
}
