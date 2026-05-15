'use client'

import { Gender } from '@/generated/prisma'
import {
  Badge,
  Box,
  Button,
  createListCollection,
  Field,
  Heading,
  HStack,
  Input,
  Portal,
  Select,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { findSizeByMeasurements } from '../_actions/find-size'
import type { MatchType, SizeMatch } from '../_lib/size-utils'

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
 * Helper to get badge color based on match type
 */
function getMatchBadge(matchType: MatchType) {
  switch (matchType) {
    case 'exact':
      return { colorPalette: 'green', text: 'Точное совпадение' }
    case 'partial':
      return { colorPalette: 'yellow', text: 'Частичное совпадение' }
    case 'nearest':
      return { colorPalette: 'orange', text: 'Ближайший размер' }
  }
}

/**
 * Measurement calculator component
 * Helps find size by body measurements
 */
export function MeasurementCalculator() {
  const [gender, setGender] = useState<Gender>(Gender.FEMALE)
  const [bust, setBust] = useState('')
  const [waist, setWaist] = useState('')
  const [hips, setHips] = useState('')
  const [results, setResults] = useState<SizeMatch[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCalculate = async () => {
    const bustNum = parseInt(bust)
    const waistNum = parseInt(waist)
    const hipsNum = parseInt(hips)

    if (!bust || !waist || !hips) {
      setError('Заполните все измерения')
      return
    }

    if (isNaN(bustNum) || isNaN(waistNum) || isNaN(hipsNum)) {
      setError('Введите корректные числовые значения')
      return
    }

    if (bustNum < 50 || bustNum > 200 || waistNum < 40 || waistNum > 180 || hipsNum < 50 || hipsNum > 200) {
      setError('Проверьте правильность введенных измерений')
      return
    }

    setIsLoading(true)
    setError(null)
    setResults([])

    try {
      const sizes = await findSizeByMeasurements(bustNum, waistNum, hipsNum, gender)

      if (sizes.length === 0) {
        setError(
          'К сожалению, не найдено размеров, подходящих под ваши измерения. Попробуйте обратиться к нам для индивидуального подбора.'
        )
      } else {
        setResults(sizes)
      }
    } catch (err) {
      console.error('Failed to calculate size:', err)
      setError('Ошибка при расчете размера')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box>
      <Heading size="lg" mb={4} textTransform="none">
        Подбор размера по измерениям
      </Heading>
      <Text color="fg.muted" mb={6}>
        Введите свои измерения, чтобы узнать подходящий размер
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
              setResults([])
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

        {/* Measurements */}
        <Field.Root>
          <Field.Label>Обхват груди (см)</Field.Label>
          <Input
            type="number"
            value={bust}
            onChange={(e) => {
              setBust(e.target.value)
              setError(null)
            }}
            placeholder="например, 84"
          />
          <Field.HelperText>Измерьте обхват груди по самым выступающим точкам</Field.HelperText>
        </Field.Root>

        <Field.Root>
          <Field.Label>Обхват талии (см)</Field.Label>
          <Input
            type="number"
            value={waist}
            onChange={(e) => {
              setWaist(e.target.value)
              setError(null)
            }}
            placeholder="например, 66"
          />
          <Field.HelperText>Измерьте обхват талии в самом узком месте</Field.HelperText>
        </Field.Root>

        <Field.Root>
          <Field.Label>Обхват бедер (см)</Field.Label>
          <Input
            type="number"
            value={hips}
            onChange={(e) => {
              setHips(e.target.value)
              setError(null)
            }}
            placeholder="например, 92"
          />
          <Field.HelperText>Измерьте обхват бедер по самым выступающим точкам</Field.HelperText>
        </Field.Root>

        <Button onClick={handleCalculate} colorPalette="fg" loading={isLoading} size="lg">
          Рассчитать размер
        </Button>
      </VStack>

      {/* Error message */}
      {error && (
        <Box p={4} bg="red.subtle" borderRadius="md" mb={4}>
          <Text color="red.fg">{error}</Text>
        </Box>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Box>
          <Heading size="md" mb={4} textTransform="none">
            {results.length === 1 ? 'Ваш размер' : `Подходящие размеры (${results.length})`}
          </Heading>

          {results.length > 1 && results[0].matchType !== 'exact' && (
            <Box p={4} bg="blue.subtle" borderRadius="md" mb={4}>
              <Text fontSize="sm">
                Найдено несколько близких размеров. Рекомендуем обратить внимание на указанные рекомендации для каждого
                размера или проконсультироваться с нами для индивидуального подбора.
              </Text>
            </Box>
          )}

          {results.length > 1 && results[0].matchType === 'exact' && (
            <Box p={4} bg="blue.subtle" borderRadius="md" mb={4}>
              <Text fontSize="sm">
                Найдено несколько подходящих размеров. Рекомендуем выбрать наиболее комфортный для вас или
                проконсультироваться с нами.
              </Text>
            </Box>
          )}

          <VStack gap={4} align="stretch">
            {results.map((match) => {
              const badge = getMatchBadge(match.matchType)
              return (
                <Box
                  key={match.size.id}
                  p={4}
                  borderWidth="2px"
                  borderColor={
                    match.matchType === 'exact'
                      ? 'green.solid'
                      : match.matchType === 'partial'
                        ? 'yellow.solid'
                        : 'orange.solid'
                  }
                  borderRadius="md"
                  bg="bg.subtle"
                >
                  <HStack mb={3} justify="space-between" wrap="wrap">
                    <Heading size="sm" textTransform="none">
                      Размер: {match.size.ru} (RU) / {match.size.international}
                    </Heading>
                    <Badge colorPalette={badge.colorPalette}>{badge.text}</Badge>
                  </HStack>

                  {match.recommendation && (
                    <Box p={3} bg="orange.subtle" borderRadius="md" mb={3}>
                      <Text fontSize="sm" fontWeight="medium">
                        💡 {match.recommendation}
                      </Text>
                    </Box>
                  )}

                  {match.matchedParams.length > 0 && match.matchType !== 'exact' && (
                    <Box p={3} bg="green.subtle" borderRadius="md" mb={3}>
                      <Text fontSize="sm">
                        ✓ Совпадают:{' '}
                        {match.matchedParams
                          .map((p) => (p === 'bust' ? 'грудь' : p === 'waist' ? 'талия' : 'бёдра'))
                          .join(', ')}
                      </Text>
                    </Box>
                  )}

                  <Box overflowX="auto" mb={3}>
                    <Table.Root size="sm" variant="outline">
                      <Table.Body>
                        <Table.Row>
                          <Table.Cell fontWeight="medium">Российский (RU)</Table.Cell>
                          <Table.Cell>{match.size.ru}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell fontWeight="medium">Международный (INT)</Table.Cell>
                          <Table.Cell>{match.size.international}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell fontWeight="medium">Немецкий (DE)</Table.Cell>
                          <Table.Cell>{match.size.de}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell fontWeight="medium">Итальянский (IT)</Table.Cell>
                          <Table.Cell>{match.size.it}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell fontWeight="medium">Французский (FR)</Table.Cell>
                          <Table.Cell>{match.size.fr}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell fontWeight="medium">Британский (UK)</Table.Cell>
                          <Table.Cell>{match.size.uk}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell fontWeight="medium">Американский (US)</Table.Cell>
                          <Table.Cell>{match.size.us}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell fontWeight="medium">Джинсы</Table.Cell>
                          <Table.Cell>
                            {match.size.jeansFrom} - {match.size.jeansTo}
                          </Table.Cell>
                        </Table.Row>
                      </Table.Body>
                    </Table.Root>
                  </Box>

                  <Text fontSize="sm" color="fg.muted">
                    Измерения этого размера: Грудь {match.size.bustMin}-{match.size.bustMax} см, Талия{' '}
                    {match.size.waistMin}-{match.size.waistMax} см, Бедра {match.size.hipsMin}-{match.size.hipsMax} см
                  </Text>
                </Box>
              )
            })}
          </VStack>
        </Box>
      )}
    </Box>
  )
}
