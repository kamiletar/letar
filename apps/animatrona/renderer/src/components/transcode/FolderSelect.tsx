'use client'

import { Box, Button, Icon, Text, VStack } from '@chakra-ui/react'
import { LuFolderOpen, LuUpload } from 'react-icons/lu'

interface FolderSelectProps {
  onSelect: () => void
  isLoading?: boolean
}

/**
 * Компонент выбора папки для импорта
 */
export function FolderSelect({ onSelect, isLoading }: FolderSelectProps) {
  return (
    <Box
      p={12}
      borderRadius="xl"
      border="2px dashed"
      borderColor="border.subtle"
      bg="bg.panel"
      textAlign="center"
      _hover={{ borderColor: 'purple.500', bg: 'bg.subtle' }}
      transition="all 0.2s"
      cursor="pointer"
      onClick={onSelect}
    >
      <VStack gap={4}>
        <Box p={6} borderRadius="full" bg="purple.900">
          <Icon as={LuFolderOpen} boxSize={16} color="purple.400" />
        </Box>

        <VStack gap={2}>
          <Text fontSize="xl" fontWeight="semibold">
            Выберите папку с видео
          </Text>
          <Text color="fg.subtle" maxW="400px">
            Выберите папку с исходными файлами для транскодирования. Поддерживаются MKV, MP4, AVI, MOV и другие форматы.
          </Text>
        </VStack>

        <Button size="lg" colorPalette="purple" loading={isLoading} loadingText="Сканирование...">
          <Icon as={LuUpload} mr={2} />
          Выбрать папку
        </Button>
      </VStack>
    </Box>
  )
}
