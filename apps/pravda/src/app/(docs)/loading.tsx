import { Box, Container, HStack, Skeleton } from '@chakra-ui/react'

import { DocumentSkeleton } from '../_components/skeletons'

/**
 * Loading state для страниц документации.
 * Показывается во время навигации между документами.
 */
export default function DocsLoading() {
  return (
    <Container maxW="container.lg" py={6} px={{ base: 4, md: 8 }}>
      {/* Breadcrumbs skeleton */}
      <HStack justify="space-between" align="center" mb={4}>
        <HStack gap={2}>
          <Skeleton h="16px" w="60px" />
          <Skeleton h="16px" w="8px" />
          <Skeleton h="16px" w="80px" />
          <Skeleton h="16px" w="8px" />
          <Skeleton h="16px" w="120px" />
        </HStack>
        <Skeleton h="32px" w="32px" borderRadius="md" />
      </HStack>

      {/* Document content skeleton */}
      <Box className="mdx-content">
        <DocumentSkeleton />
      </Box>
    </Container>
  )
}
