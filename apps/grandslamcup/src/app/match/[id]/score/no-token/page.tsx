/**
 * Страница ошибки: scorer URL без токена
 *
 * Показывается когда пользователь открывает /match/[id]/score без ?token=.
 * Объясняет как получить корректную ссылку.
 */

import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuArrowLeft, LuLock } from 'react-icons/lu'

export default function ScorerNoTokenPage() {
  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={6}>
      <VStack gap={6} maxW="md" textAlign="center">
        <Box fontSize="5xl">🔒</Box>
        <Heading size="xl">Нужна ссылка со счётоводским токеном</Heading>
        <Text color="fg.muted">
          Интерфейс счётовода открывается только по специальной ссылке с токеном. Эта ссылка есть в
          административной панели матча.
        </Text>
        <Text fontSize="sm" color="fg.muted" fontFamily="mono" bg="bg.subtle" px={3} py={2} borderRadius="md">
          /match/[id]/score<Text as="span" color="green.fg" fontWeight="bold">?token=...</Text>
        </Text>
        <Button asChild colorPalette="blue" variant="outline" size="lg">
          <Link href="/admin/matches">
            <LuArrowLeft /> Перейти в админку
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <LuArrowLeft /> На главную
          </Link>
        </Button>
      </VStack>
    </Box>
  )
}
