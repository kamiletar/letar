import { Box, Button, Container, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import { TouchLink } from '@letar/ui'
import NextLink from 'next/link'
import { LuArrowLeft, LuHouse, LuSearch } from 'react-icons/lu'

import { Footer } from './_components/footer'
import { Header } from './_components/header'

/**
 * Страница 404 — документ не найден.
 * Стилизована под тему законодательного портала.
 */
export default function NotFound() {
  return (
    <Flex direction="column" minH="100vh">
      <Header />

      <Container maxW="container.md" flex="1" py={{ base: 12, md: 20 }}>
        <VStack gap={8} textAlign="center">
          {/* Декоративный номер статьи */}
          <Box>
            <Text fontSize="sm" color="fg.muted" fontWeight="medium" letterSpacing="wide" textTransform="uppercase">
              Статья
            </Text>
            <Text
              fontSize={{ base: '8xl', md: '9xl' }}
              fontWeight="bold"
              lineHeight="1"
              bgGradient="to-r"
              gradientFrom="brand.600"
              gradientTo="brand.400"
              bgClip="text"
            >
              404
            </Text>
          </Box>

          {/* Заголовок и описание */}
          <VStack gap={4}>
            <Heading as="h1" size="xl">
              Документ не найден
            </Heading>
            <Text color="fg.muted" fontSize="lg" maxW="md">
              Запрашиваемая страница отсутствует в Своде законов. Возможно, она была перемещена или никогда не
              существовала.
            </Text>
          </VStack>

          {/* Декоративная цитата */}
          <Box
            bg="bg.subtle"
            borderLeftWidth="4px"
            borderColor="brand.500"
            px={6}
            py={4}
            borderRadius="md"
            maxW="sm"
            textAlign="left"
          >
            <Text fontStyle="italic" color="fg.muted" fontSize="sm">
              «Незнание закона не освобождает от ответственности, но отсутствие закона — освобождает от его исполнения»
            </Text>
            <Text fontSize="xs" color="fg.subtle" mt={2}>
              — Древняя мудрость
            </Text>
          </Box>

          {/* Кнопки навигации */}
          <Flex gap={4} direction={{ base: 'column', sm: 'row' }} w={{ base: 'full', sm: 'auto' }}>
            <Button asChild colorPalette="brand" size="lg">
              <NextLink href="/">
                <LuHouse />
                На главную
              </NextLink>
            </Button>
            <Button asChild variant="outline" size="lg">
              <NextLink href="/search">
                <LuSearch />
                Поиск по законам
              </NextLink>
            </Button>
          </Flex>

          {/* Ссылка назад */}
          <TouchLink
            href="javascript:history.back()"
            color="fg.muted"
            fontSize="sm"
            display="inline-flex"
            gap={1}
            _hover={{ color: 'brand.600' }}
          >
            <LuArrowLeft />
            Вернуться назад
          </TouchLink>
        </VStack>
      </Container>

      <Footer />
    </Flex>
  )
}
