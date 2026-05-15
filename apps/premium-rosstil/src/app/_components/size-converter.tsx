'use client'

import { Gender } from '@/generated/prisma'
import {
  Box,
  Button,
  createListCollection,
  Field,
  Flex,
  Heading,
  Input,
  Portal,
  Select,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { findSizeByCode } from '../_actions/find-size'
import type { SizeInfo, SizeSystem } from '../_lib/size-utils'

/**
 * Gender select collection
 */
const genderCollection = createListCollection({
  items: [
    { value: Gender.FEMALE, label: 'Женский' },
    { value: Gender.MALE, label: 'Мужской' },
  ],
})

/**
 * Size system select collection
 */
const systemCollection = createListCollection({
  items: [
    { value: 'ru' as const, label: 'Российский (RU)' },
    { value: 'international' as const, label: 'Международный (INT)' },
    { value: 'de' as const, label: 'Немецкий (DE)' },
    { value: 'it' as const, label: 'Итальянский (IT)' },
    { value: 'fr' as const, label: 'Французский (FR)' },
    { value: 'uk' as const, label: 'Британский (UK)' },
    { value: 'us' as const, label: 'Американский (US)' },
  ],
})

/**
 * Size converter component
 * Allows converting size from one system to all others
 */
export function SizeConverter() {
  const [gender, setGender] = useState<Gender>(Gender.FEMALE)
  const [system, setSystem] = useState<SizeSystem>('ru')
  const [code, setCode] = useState('')
  const [result, setResult] = useState<SizeInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConvert = async () => {
    if (!code.trim()) {
      setError('Введите размер')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const sizes = await findSizeByCode(code.trim(), system, gender)

      if (sizes.length === 0) {
        setError(
          `Размер "${code}" не найден в системе ${systemCollection.items.find((s) => s.value === system)?.label}`
        )
      } else if (sizes.length === 1) {
        setResult(sizes[0])
      } else {
        // Multiple matches - use first one
        setResult(sizes[0])
      }
    } catch (err) {
      console.error('Failed to convert size:', err)
      setError('Ошибка при поиске размера')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConvert()
    }
  }

  return (
    <Box>
      <Heading size="lg" mb={4} textTransform="none">
        Конвертер размеров
      </Heading>
      <Text color="fg.muted" mb={6}>
        Узнайте эквиваленты размера в других системах измерения
      </Text>

      <VStack gap={4} align="stretch" mb={6}>
        {/* Gender selection */}
        <Field.Root>
          <Field.Label>Пол</Field.Label>
          <Select.Root
            collection={genderCollection}
            value={[gender]}
            onValueChange={({ value }) => {
              setGender(value[0] as Gender)
              setResult(null)
              setError(null)
            }}
          >
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText placeholder="Выберите пол" />
              </Select.Trigger>
            </Select.Control>
            <Portal>
              <Select.Positioner>
                <Select.Content>
                  {genderCollection.items.map((item) => (
                    <Select.Item key={item.value} item={item}>
                      {item.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Portal>
          </Select.Root>
        </Field.Root>

        {/* Size system selection */}
        <Field.Root>
          <Field.Label>Система размеров</Field.Label>
          <Select.Root
            collection={systemCollection}
            value={[system]}
            onValueChange={({ value }) => {
              setSystem(value[0] as SizeSystem)
              setCode('')
              setResult(null)
              setError(null)
            }}
          >
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText placeholder="Выберите систему" />
              </Select.Trigger>
            </Select.Control>
            <Portal>
              <Select.Positioner>
                <Select.Content>
                  {systemCollection.items.map((item) => (
                    <Select.Item key={item.value} item={item}>
                      {item.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Portal>
          </Select.Root>
        </Field.Root>

        {/* Size code input */}
        <Field.Root>
          <Field.Label>Размер</Field.Label>
          <Flex gap={2}>
            <Input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setError(null)
              }}
              onKeyPress={handleKeyPress}
              placeholder={
                system === 'ru'
                  ? '40, 42, 44...'
                  : system === 'international'
                    ? 'XS, S, M, L...'
                    : system === 'jeans'
                      ? '26, 28, 30...'
                      : 'Введите размер'
              }
            />
            <Button onClick={handleConvert} colorPalette="fg" loading={isLoading} minW="120px">
              Конвертировать
            </Button>
          </Flex>
        </Field.Root>
      </VStack>

      {/* Error message */}
      {error && (
        <Box p={4} bg="red.subtle" borderRadius="md" mb={4}>
          <Text color="red.fg">{error}</Text>
        </Box>
      )}

      {/* Result table */}
      {result && (
        <Box>
          <Heading size="md" mb={4} textTransform="none">
            Результат конвертации
          </Heading>
          <Box overflowX="auto" borderWidth="1px" borderRadius="md">
            <Table.Root size="sm">
              <Table.Body>
                <Table.Row>
                  <Table.Cell fontWeight="medium">Российский (RU)</Table.Cell>
                  <Table.Cell>{result.ru}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell fontWeight="medium">Международный (INT)</Table.Cell>
                  <Table.Cell>{result.international}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell fontWeight="medium">Немецкий (DE)</Table.Cell>
                  <Table.Cell>{result.de}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell fontWeight="medium">Итальянский (IT)</Table.Cell>
                  <Table.Cell>{result.it}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell fontWeight="medium">Французский (FR)</Table.Cell>
                  <Table.Cell>{result.fr}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell fontWeight="medium">Британский (UK)</Table.Cell>
                  <Table.Cell>{result.uk}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell fontWeight="medium">Американский (US)</Table.Cell>
                  <Table.Cell>{result.us}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell fontWeight="medium">Джинсы</Table.Cell>
                  <Table.Cell>
                    {result.jeansFrom} - {result.jeansTo}
                  </Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table.Root>
          </Box>

          {/* Measurements */}
          <Box mt={4} p={4} bg="bg.subtle" borderRadius="md">
            <Heading size="sm" mb={2} textTransform="none">
              Измерения (см)
            </Heading>
            <Flex gap={6} wrap="wrap">
              <Text fontSize="sm">
                <strong>Грудь:</strong> {result.bustMin} - {result.bustMax} см
              </Text>
              <Text fontSize="sm">
                <strong>Талия:</strong> {result.waistMin} - {result.waistMax} см
              </Text>
              <Text fontSize="sm">
                <strong>Бедра:</strong> {result.hipsMin} - {result.hipsMax} см
              </Text>
            </Flex>
          </Box>
        </Box>
      )}
    </Box>
  )
}
