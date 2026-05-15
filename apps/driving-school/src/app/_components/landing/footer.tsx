import { Box, Link as ChakraLink, Container, Grid, Heading, Stack, Text } from '@chakra-ui/react'
import { default as Link, type LinkProps } from 'next/link'
import type { PropsWithChildren } from 'react'

import packageJson from '../../../../package.json'

const NavLink = (props: PropsWithChildren<LinkProps>) => {
  return (
    <ChakraLink asChild>
      <Link {...props} />
    </ChakraLink>
  )
}

export function Footer() {
  return (
    <Box py={12} bg="bg.panel" borderTopWidth={1}>
      <Container maxW="container.xl">
        <Grid templateColumns={{ base: '1fr', md: '2fr 1fr 1fr 1fr' }} gap={8}>
          <Stack gap={4}>
            <Heading size="md">НаПрава.РФ</Heading>
            <Text color="fg.muted" maxW="sm">
              Современная платформа для эффективного обучения вождению.
            </Text>
            <Text color="fg.muted" fontSize="sm">
              © {new Date().getFullYear()} НаПрава.РФ. Все права защищены.
            </Text>
            <Text color="fg.subtle" fontSize="xs">
              v{packageJson.version}
            </Text>
          </Stack>

          <Stack gap={4}>
            <Heading size="sm">Платформа</Heading>
            <Stack gap={2} color="fg.muted" alignItems={'flex-start'}>
              <NavLink href="#features">Возможности</NavLink>
              <NavLink href="#how-it-works">Как это работает</NavLink>
              <NavLink href="#testimonials">Отзывы</NavLink>
            </Stack>
          </Stack>

          <Stack gap={4}>
            <Heading size="sm">Пользователям</Heading>
            <Stack gap={2} color="fg.muted" alignItems={'flex-start'}>
              <NavLink href="/sign-in">Вход</NavLink>
              <NavLink href="/sign-up">Регистрация</NavLink>
              <NavLink href="/instructors">Инструкторы</NavLink>
              <NavLink href="/schools">Автошколы</NavLink>
            </Stack>
          </Stack>

          <Stack gap={4}>
            <Heading size="sm">Информация</Heading>
            <Stack gap={2} color="fg.muted" alignItems={'flex-start'}>
              <NavLink href="/legal/offer">Договор-оферта</NavLink>
              <NavLink href="/legal/privacy">Политика конфиденциальности</NavLink>
              <NavLink href="/developers">API для разработчиков</NavLink>
            </Stack>
          </Stack>
        </Grid>
      </Container>
    </Box>
  )
}
