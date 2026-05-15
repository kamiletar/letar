import { Box, Container, HStack, Skeleton, VStack } from '@chakra-ui/react'

/** Skeleton для лидерборда */
export default function LeaderboardLoading() {
  return (
    <Box minH="100vh" bg="bg">
      <Box bg="bg.panel" borderBottomWidth="1px" py={4}>
        <Container maxW="container.xl">
          <HStack gap={4}>
            <Skeleton h="32px" w="80px" />
            <Skeleton h="32px" w="160px" />
          </HStack>
        </Container>
      </Box>

      <Container maxW="container.xl" py={8}>
        <VStack align="stretch" gap={4}>
          {/* Табы */}
          <HStack gap={2} flexWrap="wrap">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} h="36px" w="100px" borderRadius="md" />
            ))}
          </HStack>

          {/* Таблица */}
          <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" overflow="hidden">
            {Array.from({ length: 10 }).map((_, i) => (
              <HStack key={i} px={4} py={3} borderBottomWidth="1px" gap={4}>
                <Skeleton h="20px" w="30px" />
                <Skeleton h="20px" w="200px" />
                <Skeleton h="20px" w="80px" ml="auto" />
              </HStack>
            ))}
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}
