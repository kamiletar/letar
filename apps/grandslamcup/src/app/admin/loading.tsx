import { Box, Grid, Skeleton, VStack } from '@chakra-ui/react'

export default function AdminLoading() {
  return (
    <VStack gap={6} align="stretch">
      <Skeleton h="32px" w="200px" />
      <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }} gap={4}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Box key={i} bg="bg.panel" p={5} borderRadius="xl" borderWidth="1px">
            <Skeleton h="14px" w="80px" mb={2} />
            <Skeleton h="28px" w="50px" />
          </Box>
        ))}
      </Grid>
    </VStack>
  )
}
