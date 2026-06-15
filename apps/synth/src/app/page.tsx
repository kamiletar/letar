import { Box, Text, VStack } from '@chakra-ui/react'

/**
 * Главная страница synth — заглушка Фазы 0.
 * Здесь будет реактивный спин-граф и студия синтеза (Фаза 1).
 */
export default function HomePage() {
  return (
    <Box minH="100dvh" display="flex" alignItems="center" justifyContent="center" bg="bg.DEFAULT">
      <VStack gap={6} textAlign="center" px={8}>
        {/* Временный логотип — звезда Пенроуза появится в Фазе 1 */}
        <Text fontSize="5xl" lineHeight={1} color="accent.DEFAULT" fontWeight="100" letterSpacing="0.2em">
          ✦
        </Text>
        <VStack gap={2}>
          <Text
            fontSize={{ base: '2xl', md: '3xl' }}
            fontWeight="200"
            letterSpacing="0.15em"
            color="fg.DEFAULT"
            textTransform="uppercase"
          >
            Synth
          </Text>
          <Text fontSize="sm" color="fg.muted" letterSpacing="0.08em" maxW="360px">
            Звук становится геометрией и пространством
          </Text>
        </VStack>
        <Text fontSize="xs" color="fg.subtle" letterSpacing="0.05em" mt={4}>
          Фаза 1 — скоро
        </Text>
      </VStack>
    </Box>
  )
}
