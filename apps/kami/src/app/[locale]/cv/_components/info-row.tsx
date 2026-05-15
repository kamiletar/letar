import { Box, HStack, Text } from '@chakra-ui/react'

interface InfoRowProps {
  /** Иконка */
  icon: React.ReactNode
  /** Метка */
  label: string
  /** Значение */
  value: string
}

/**
 * Строка информации с иконкой для CV
 */
export function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <HStack gap={3}>
      <Box color="fg.500">{icon}</Box>
      <Text>
        <Text as="span" fontWeight="medium" color="fg.muted">
          {label}:
        </Text>{' '}
        {value}
      </Text>
    </HStack>
  )
}
