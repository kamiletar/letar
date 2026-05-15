/**
 * Компонент для скрытого профиля инструктора
 *
 * @module hidden-profile
 */

import { ColorModeButton } from '@/app/_components/ui/color-mode'
import { Box, Button, Card, Container, Heading, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuArrowLeft, LuEyeOff } from 'react-icons/lu'

/**
 * Сообщение о скрытом профиле инструктора
 */
export function HiddenProfile() {
  return (
    <Container maxW="container.md" py={8}>
      <Box position="absolute" top={4} right={4}>
        <ColorModeButton />
      </Box>

      <Button asChild variant="ghost" size="sm" mb={6}>
        <Link href="/instructors">
          <LuArrowLeft />
          Назад к списку
        </Link>
      </Button>

      <Card.Root>
        <Card.Body>
          <VStack py={12} gap={4}>
            <Box p={4} borderRadius="full" bg="bg.subtle" color="fg.muted">
              <LuEyeOff size={48} />
            </Box>
            <Heading size="lg" textAlign="center">
              Профиль скрыт
            </Heading>
            <Text color="fg.muted" textAlign="center" maxW="sm">
              Этот инструктор скрыл свой профиль из публичного доступа. Профиль доступен только его ученикам.
            </Text>
            <Button asChild colorPalette="brand" mt={4}>
              <Link href="/instructors">Найти другого инструктора</Link>
            </Button>
          </VStack>
        </Card.Body>
      </Card.Root>
    </Container>
  )
}
