'use client'

import { Box, Button, Center, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

/** Error boundary каталога аниме — показывается при ошибке в /anime */
export default function AnimeCatalogError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const handleResetFilters = useCallback(() => {
    router.push('/anime')
  }, [router])

  const handleCopyDigest = useCallback(async () => {
    if (error.digest) {
      await navigator.clipboard.writeText(error.digest)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [error.digest])

  return (
    <Center minH="60vh" px={4}>
      <VStack gap={6} textAlign="center" maxW="480px">
        {/* Иллюстрация */}
        <Box
          w={24}
          h={24}
          rounded="full"
          bgGradient="to-br"
          gradientFrom="purple.900"
          gradientTo="brand.950"
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="4xl"
          borderWidth="1px"
          borderColor="purple.700"
          shadow="lg"
        >
          ⛩️
        </Box>

        <VStack gap={2}>
          <Heading size="lg" color="fg">
            Каталог провалился в другое измерение
          </Heading>
          <Text color="fg.muted" fontSize="md" lineHeight="tall">
            Фильтры могли запутать портал. Сбросьте параметры и попробуйте снова — там точно есть то, что ищете.
          </Text>
        </VStack>

        {/* Действия */}
        <HStack gap={3} flexWrap="wrap" justify="center">
          <Button colorPalette="brand" onClick={handleResetFilters} size="md">
            Сбросить фильтры
          </Button>
          <Button variant="outline" onClick={reset} size="md">
            Попробовать снова
          </Button>
          <Button asChild variant="ghost" size="md">
            <NextLink href="/">На главную</NextLink>
          </Button>
        </HStack>

        {/* Digest — для саппорта */}
        {error.digest && (
          <HStack
            gap={2}
            px={3}
            py={2}
            bg="bg.subtle"
            rounded="md"
            borderWidth="1px"
            borderColor="border.subtle"
            flexWrap="wrap"
            justify="center"
          >
            <Text fontSize="xs" fontFamily="mono" color="fg.muted" wordBreak="break-all">
              {error.digest}
            </Text>
            <Button variant="ghost" size="xs" onClick={handleCopyDigest} flexShrink={0}>
              {copied ? '✓ скопировано' : 'Скопировать код ошибки'}
            </Button>
          </HStack>
        )}
      </VStack>
    </Center>
  )
}
