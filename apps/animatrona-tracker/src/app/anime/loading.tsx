import { Box, Container, Grid, Skeleton, SkeletonText, VStack } from '@chakra-ui/react'

/** Skeleton для каталога аниме */
export default function AnimeLoading() {
  return (
    <Container maxW="container.xl" py={8}>
      <VStack align="stretch" gap={6}>
        {/* Заголовок + поиск */}
        <Skeleton h="40px" w="200px" />
        <Skeleton h="40px" w="100%" maxW="600px" />

        {/* Грид карточек */}
        <Grid
          templateColumns={{ base: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(5, 1fr)' }}
          gap={4}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <Box key={i} borderWidth="1px" borderRadius="xl" overflow="hidden">
              <Skeleton h="240px" w="100%" />
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
