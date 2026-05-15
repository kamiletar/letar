import { Box, Container, Grid, Skeleton } from '@chakra-ui/react'

export default function CatalogLoading() {
  return (
    <Box>
      <Container maxW="7xl">
        <Grid
          templateColumns={{
            base: 'repeat(1, 1fr)',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          }}
          gap={6}
          p={6}
        >
          {/* oxlint-disable-next-line eslint-plugin-react(no-array-index-key) -- skeleton элементы без уникальных ID */}
          {Array.from({ length: 8 }).map((_, i) => (
            <Box key={`skeleton-${i}`}>
              <Skeleton height="400px" borderRadius="md" mb={3} />
              <Skeleton height="24px" width="80%" mb={2} />
              <Skeleton height="20px" width="40%" mb={2} />
              <Skeleton height="20px" width="60%" />
            </Box>
          ))}
        </Grid>
      </Container>
    </Box>
  )
}
