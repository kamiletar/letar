import { Box, Container, Flex, HStack, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'

export function Footer() {
  return (
    <Box as="footer" bg="bg.subtle" borderTopWidth="1px" borderColor="border" mt={20}>
      <Container maxW="6xl" py={10}>
        <Stack gap={6}>
          <Flex justify="space-between" wrap="wrap" gap={6}>
            <Stack gap={1}>
              <Text fontWeight="semibold">НейроАбоИ</Text>
              <Text fontSize="sm" color="fg.muted">
                Декоративные обои с зашитыми аффирмациями. Печать под заказ на флизелине.
              </Text>
            </Stack>
            <HStack gap={6} align="start" wrap="wrap">
              <Stack gap={2}>
                <Text fontSize="xs" color="fg.muted" textTransform="uppercase">Магазин</Text>
                <Box asChild fontSize="sm" _hover={{ color: 'brand.solid' }}>
                  <Link href="/catalog">Каталог</Link>
                </Box>
                <Box asChild fontSize="sm" _hover={{ color: 'brand.solid' }}>
                  <Link href="/profile/orders">Мои заказы</Link>
                </Box>
              </Stack>
              <Stack gap={2}>
                <Text fontSize="xs" color="fg.muted" textTransform="uppercase">Информация</Text>
                <Box asChild fontSize="sm" _hover={{ color: 'brand.solid' }}>
                  <Link href="/delivery">Доставка</Link>
                </Box>
                <Box asChild fontSize="sm" _hover={{ color: 'brand.solid' }}>
                  <Link href="/payment">Оплата</Link>
                </Box>
                <Box asChild fontSize="sm" _hover={{ color: 'brand.solid' }}>
                  <Link href="/offer">Оферта</Link>
                </Box>
                <Box asChild fontSize="sm" _hover={{ color: 'brand.solid' }}>
                  <Link href="/privacy">Политика ПДн</Link>
                </Box>
              </Stack>
            </HStack>
          </Flex>

          <Box borderTopWidth="1px" borderColor="border" pt={4}>
            <Text fontSize="xs" color="fg.muted">
              ИП Гаев Виталий Викторович · ИНН 246603783032 · © {new Date().getFullYear()} НейроАбоИ
            </Text>
            <Text fontSize="xs" color="fg.muted" mt={1}>
              НейроАбоИ — декоративный продукт. Не является медицинским изделием. Не предназначен
              для диагностики, лечения, реабилитации или профилактики заболеваний.
            </Text>
          </Box>
        </Stack>
      </Container>
    </Box>
  )
}
