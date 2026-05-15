import { Box, Container, HStack, Skeleton, VStack } from '@chakra-ui/react'

export default function ProductLoading() {
  return (
    <Container maxW="7xl" py={8}>
      <Skeleton height="20px" width="150px" mb={4} />

      <Box display="grid" gridTemplateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={8} mt={6}>
        {/* Left column - Image skeleton */}
        <Box>
          <Skeleton height="500px" borderRadius="lg" />
          <HStack gap={2} mt={4}>
            <Skeleton height="80px" width="80px" borderRadius="md" />
            <Skeleton height="80px" width="80px" borderRadius="md" />
            <Skeleton height="80px" width="80px" borderRadius="md" />
            <Skeleton height="80px" width="80px" borderRadius="md" />
          </HStack>
        </Box>

        {/* Right column - Details skeleton */}
        <VStack align="stretch" gap={6}>
          <Skeleton height="48px" width="300px" />
          <Skeleton height="40px" width="150px" />
          <Box>
            <Skeleton height="20px" width="80px" mb={3} />
            <HStack gap={3}>
              <Skeleton height="40px" width="100px" borderRadius="md" />
              <Skeleton height="40px" width="100px" borderRadius="md" />
              <Skeleton height="40px" width="100px" borderRadius="md" />
            </HStack>
          </Box>
          <Box>
            <Skeleton height="20px" width="80px" mb={2} />
            <Skeleton height="60px" width="100%" />
          </Box>
          <Box>
            <Skeleton height="20px" width="80px" mb={3} />
            <Skeleton height="80px" width="100%" />
          </Box>
          <Skeleton height="48px" width="100%" borderRadius="md" />
        </VStack>
      </Box>
    </Container>
  )
}
