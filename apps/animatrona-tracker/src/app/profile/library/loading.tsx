import { Box, Container, Grid, HStack, Skeleton, SkeletonText, VStack } from '@chakra-ui/react'

/** Skeleton для библиотеки */
export default function LibraryLoading() {
  return (
    <Container maxW="container.xl" py={8}>
      <VStack align="stretch" gap={6}>
        <HStack justify="space-between">
          <Skeleton h="32px" w="220px" />
          <Skeleton h="20px" w="80px" />
        </HStack>

        {/* Фильтры */}
        <HStack gap={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} h="32px" w="80px" borderRadius="md" />
          ))}
        </HStack>

        {/* Грид */}
        <Grid
          templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }}
          gap={4}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Box key={i} borderWidth="1px" borderRadius="xl" overflow="hidden">
              <Skeleton h="220px" w="100%" />
              <Box p={3}>
                <SkeletonText noOfLines={2} gap={2} />
              </Box>
            </Box>
          ))}
        </Grid>
      </VStack>
    </Container>
  )
}
