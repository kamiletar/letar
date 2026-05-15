'use client'

import { Box, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { LuUsers } from 'react-icons/lu'

import type { ImportDataType } from './types'

interface StepTypeSelectProps {
  schoolName: string
  onSelect: (type: ImportDataType) => void
}

/**
 * Шаг 1: Выбор типа данных для импорта.
 */
export function StepTypeSelect({ schoolName, onSelect }: StepTypeSelectProps) {
  return (
    <VStack align="stretch" gap={6}>
      <VStack align="start" gap={2}>
        <Heading size="lg">Что импортируем?</Heading>
        <Text color="fg.muted">Выберите тип данных для импорта в школу «{schoolName}»</Text>
      </VStack>

      <HStack gap={4} wrap="wrap">
        <Box
          p={6}
          borderWidth="2px"
          borderRadius="lg"
          cursor="pointer"
          _hover={{ borderColor: 'colorPalette.500', bg: 'colorPalette.50' }}
          onClick={() => onSelect('students')}
          flex="1"
          minW="200px"
          colorPalette="brand"
          data-testid="import-type-students"
        >
          <VStack gap={3}>
            <Icon fontSize="3xl">
              <LuUsers />
            </Icon>
            <Text fontWeight="medium">Ученики</Text>
            <Text fontSize="sm" color="fg.muted" textAlign="center">
              Импорт учеников: ФИО, email, телефон, категория прав
            </Text>
          </VStack>
        </Box>

        <Box
          p={6}
          borderWidth="2px"
          borderRadius="lg"
          cursor="pointer"
          _hover={{ borderColor: 'colorPalette.500', bg: 'colorPalette.50' }}
          onClick={() => onSelect('instructors')}
          flex="1"
          minW="200px"
          colorPalette="brand"
          data-testid="import-type-instructors"
        >
          <VStack gap={3}>
            <Icon fontSize="3xl">
              <LuUsers />
            </Icon>
            <Text fontWeight="medium">Инструкторы</Text>
            <Text fontSize="sm" color="fg.muted" textAlign="center">
              Импорт инструкторов: ФИО, email, телефон, категории, описание
            </Text>
          </VStack>
        </Box>
      </HStack>
    </VStack>
  )
}
