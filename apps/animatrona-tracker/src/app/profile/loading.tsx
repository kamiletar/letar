import { Box, Container, Grid, HStack, Skeleton, SkeletonText, VStack } from '@chakra-ui/react'

/** Skeleton для профиля */
export default function ProfileLoading() {
  return (
    <Box minH="100vh" bg="bg">
      <Box bg="bg.panel" borderBottomWidth="1px" py={6}>
        <Container maxW="container.lg">
          <HStack gap={4}>
            <Skeleton boxSize="64px" borderRadius="full" />
            <VStack align="start" gap={2}>
              <Skeleton h="24px" w="160px" />
              <Skeleton h="16px" w="200px" />
            </VStack>
          </HStack>
        </Container>
      </Box>

      <Container maxW="container.lg" py={8}>
        <VStack align="stretch" gap={6}>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Box key={i} bg="bg.panel" p={6} borderRadius="xl" borderWidth="1px">
                <Skeleton h="20px" w="100px" mb={3} />
                <SkeletonText noOfLines={2} gap={2} />
              </Box>
            ))}
          </Grid>
        </VStack>
      </Container>
    </Box>
  )
}
