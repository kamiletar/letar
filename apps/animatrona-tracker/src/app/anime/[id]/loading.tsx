import { Box, Container, Flex, HStack, Skeleton, SkeletonText, VStack } from '@chakra-ui/react'

/** Skeleton для страницы аниме */
export default function AnimeDetailLoading() {
  return (
    <Box minH="100vh" bg="bg">
      {/* Hero секция */}
      <Box position="relative" h={{ base: '300px', md: '400px' }} bg="bg.subtle">
        <Container maxW="container.xl" h="100%">
          <Flex align="end" h="100%" pb={8} gap={6}>
            {/* Постер */}
            <Skeleton
              w={{ base: '140px', md: '180px' }}
              h={{ base: '200px', md: '260px' }}
              borderRadius="xl"
              flexShrink={0}
            />
            {/* Информация */}
            <VStack align="start" gap={3} flex={1}>
              <Skeleton h="32px" w="60%" />
              <Skeleton h="20px" w="40%" />
              <HStack gap={2}>
                <Skeleton h="24px" w="60px" borderRadius="full" />
                <Skeleton h="24px" w="80px" borderRadius="full" />
                <Skeleton h="24px" w="70px" borderRadius="full" />
              </HStack>
              <Skeleton h="36px" w="160px" />
            </VStack>
          </Flex>
        </Container>
      </Box>

      {/* Контент */}
      <Container maxW="container.xl" py={8}>
        <VStack align="stretch" gap={6}>
          {/* Табы */}
          <HStack gap={4}>
            <Skeleton h="32px" w="100px" />
            <Skeleton h="32px" w="100px" />
            <Skeleton h="32px" w="100px" />
          </HStack>
          {/* Описание */}
          <SkeletonText noOfLines={4} gap={3} />
        </VStack>
      </Container>
    </Box>
  )
}
