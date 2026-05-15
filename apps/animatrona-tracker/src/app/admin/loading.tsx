import { Box, Container, Grid, HStack, Skeleton, SkeletonText, VStack } from '@chakra-ui/react'

/** Skeleton для админ-панели */
export default function AdminLoading() {
  return (
    <Box minH="100vh" bg="bg">
      <Box bg="bg.panel" borderBottomWidth="1px" py={4}>
        <Container maxW="container.xl">
          <Skeleton h="32px" w="200px" />
        </Container>
      </Box>

      <Container maxW="container.xl" py={8}>
        <VStack align="stretch" gap={6}>
          {/* Статбар */}
          <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={4}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Box key={i} bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px">
                <Skeleton h="16px" w="80px" mb={2} />
                <Skeleton h="28px" w="60px" />
              </Box>
            ))}
          </Grid>

          {/* Табы */}
          <HStack gap={2}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} h="36px" w="100px" borderRadius="md" />
            ))}
          </HStack>

          {/* Контент */}
          <Box bg="bg.panel" p={6} borderRadius="xl" borderWidth="1px">
            <SkeletonText noOfLines={6} gap={4} />
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}
