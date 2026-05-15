import { Box, Container, Heading, HStack, Skeleton, VStack } from '@chakra-ui/react'

/**
 * Loading UI для /cart.
 * Показывается мгновенно при SPA-навигации, пока Server Component грузит данные.
 * Без этого файла Next.js ждёт весь page.tsx (включая тяжёлые JOIN в getCart)
 * и юзер думает «корзина не открывается».
 */
export default function CartLoading() {
  return (
    <Container maxW="7xl" py={8}>
      <Heading textAlign="center" size="3xl" mb={8} textTransform="none">
        Корзина
      </Heading>

      <Box display="grid" gridTemplateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={8}>
        {/* Список товаров */}
        <VStack align="stretch" gap={4}>
          {/* oxlint-disable-next-line eslint-plugin-react(no-array-index-key) -- skeleton элементы */}
          {Array.from({ length: 3 }).map((_, i) => (
            <HStack key={`cart-skel-${i}`} gap={4} p={4} borderWidth="1px" borderRadius="lg">
              <Skeleton height="120px" width="120px" borderRadius="md" flexShrink={0} />
              <VStack align="stretch" gap={2} flex={1}>
                <Skeleton height="24px" width="70%" />
                <Skeleton height="18px" width="40%" />
                <Skeleton height="18px" width="30%" />
                <Skeleton height="32px" width="160px" mt={2} />
              </VStack>
            </HStack>
          ))}
        </VStack>

        {/* Сводка */}
        <Box borderWidth="1px" borderRadius="lg" p={6} h="fit-content">
          <VStack align="stretch" gap={3}>
            <Skeleton height="28px" width="50%" />
            <Skeleton height="20px" width="100%" />
            <Skeleton height="20px" width="100%" />
            <Skeleton height="20px" width="100%" />
            <Skeleton height="48px" width="100%" mt={4} />
          </VStack>
        </Box>
      </Box>
    </Container>
  )
}
