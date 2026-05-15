import { Badge, HStack, Text } from '@chakra-ui/react'

interface StatBadgeProps {
  /** Метка статистики */
  label: string
  /** Значение */
  value: number
  /** Цветовая палитра */
  colorPalette: string
}

/**
 * Бейдж со статистикой для страницы Learning
 */
export function StatBadge({ label, value, colorPalette }: StatBadgeProps) {
  return (
    <HStack gap={2}>
      <Badge variant="solid" colorPalette={colorPalette} fontSize="lg" px={3} py={1}>
        {value}
      </Badge>
      <Text color="fg.muted">{label}</Text>
    </HStack>
  )
}
