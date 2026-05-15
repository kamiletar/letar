import { LogoWithText } from '@/app/_components/logo-with-text'
import { Box, Button, Container, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuHouse } from 'react-icons/lu'

/**
 * Кастомная 404 страница
 * Показывается для несуществующих роутов
 */
export default function NotFound() {
  return (
    <Container maxW="lg" py={{ base: 12, md: 20 }}>
      <VStack gap={8}>
        {/* Логотип */}
        <LogoWithText size="lg" />

        {/* Большой код 404 */}
        <Box position="relative">
          <Text
            fontSize={{ base: '8rem', md: '12rem' }}
            fontWeight="black"
            lineHeight={1}
            bgGradient="to-r"
            gradientFrom="blue.500"
            gradientTo="teal.400"
            bgClip="text"
            opacity={0.15}
            userSelect="none"
          >
            404
          </Text>
          <Flex position="absolute" inset={0} align="center" justify="center" flexDirection="column" gap={2}>
            <Heading
              as="h1"
              size={{ base: '2xl', md: '3xl' }}
              bgGradient="to-r"
              gradientFrom="blue.600"
              gradientTo="teal.500"
              bgClip="text"
            >
              Упс!
            </Heading>
          </Flex>
        </Box>

        {/* Текст */}
        <VStack gap={3} textAlign="center" maxW="sm">
          <Heading as="h2" size="lg" color="fg">
            Страница не найдена
          </Heading>
          <Text color="fg.muted" fontSize="md">
            Похоже, вы свернули не туда. Запрашиваемая страница не существует или была перемещена.
          </Text>
        </VStack>

        {/* Кнопка */}
        <Link href="/">
          <Button
            size="lg"
            bgGradient="to-r"
            gradientFrom="blue.500"
            gradientTo="teal.400"
            color="white"
            _hover={{
              gradientFrom: 'blue.600',
              gradientTo: 'teal.500',
              transform: 'translateY(-2px)',
              shadow: 'lg',
            }}
            _active={{
              gradientFrom: 'blue.500 !important',
              gradientTo: 'teal.400 !important',
              transform: 'translateY(2px) !important',
            }}
            transition="all 0.2s"
          >
            <LuHouse />
            Вернуться на главную
          </Button>
        </Link>
      </VStack>
    </Container>
  )
}
