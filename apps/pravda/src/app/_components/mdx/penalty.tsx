import { Badge, Box, HStack, Text, VStack } from '@chakra-ui/react'

interface PenaltyProps {
  /** Штраф (например: "10 000 000 руб.") */
  fine?: string
  /** Наказание (например: "понижение сословия") */
  punishment?: string
  /** Срок (например: "10 лет") */
  term?: string
}

/**
 * Блок наказания.
 * Выделенный блок с информацией о штрафе, наказании и сроке.
 * Server Component — нет хуков.
 */
export function Penalty({ fine, punishment, term }: PenaltyProps) {
  return (
    <Box
      role="note"
      aria-label="Информация о наказании"
      my={4}
      p={4}
      borderWidth="1px"
      borderColor="error.emphasized"
      borderRadius="md"
      bg="error.subtle"
      _dark={{ bg: 'error.subtle' }}
    >
      <HStack mb={2}>
        <Badge colorPalette="red" size="sm">
          Наказание
        </Badge>
      </HStack>
      <VStack align="start" gap={1}>
        {fine && (
          <Text fontSize="sm">
            <Text as="span" fontWeight="semibold">
              Штраф:
            </Text>{' '}
            {fine}
          </Text>
        )}
        {punishment && (
          <Text fontSize="sm">
            <Text as="span" fontWeight="semibold">
              Взыскание:
            </Text>{' '}
            {punishment}
          </Text>
        )}
        {term && (
          <Text fontSize="sm">
            <Text as="span" fontWeight="semibold">
              Срок:
            </Text>{' '}
            {term}
          </Text>
        )}
      </VStack>
    </Box>
  )
}
