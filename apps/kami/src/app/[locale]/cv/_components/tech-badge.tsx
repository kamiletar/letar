import { Box } from '@chakra-ui/react'

interface TechBadgeProps {
  children: React.ReactNode
}

/**
 * Бейдж технологии для CV
 */
export function TechBadge({ children }: TechBadgeProps) {
  return (
    <Box
      px={4}
      py={2}
      borderRadius="full"
      bg={{ base: 'white', _dark: 'gray.800' }}
      border="1px solid"
      borderColor={{ base: 'gray.200', _dark: 'gray.700' }}
      fontSize="sm"
      fontFamily="mono"
      _hover={{ borderColor: 'fg.500' }}
      transition="all 0.2s"
    >
      {children}
    </Box>
  )
}
