'use client'

import { useCartActions } from '@/app/_components/cart'
import { Link as LocalizedLink } from '@/i18n/navigation'
import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { LuCircleCheck } from 'react-icons/lu'

export function SuccessContent() {
  const t = useTranslations('checkout.successPage')
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  // useCartActions — не вызывает ре-рендер при изменении корзины
  const { clearCart } = useCartActions()

  // Очищаем корзину при успешном заказе
  useEffect(() => {
    clearCart()
  }, [clearCart])

  return (
    <Box minH="100vh" py={16}>
      <Container maxW="container.md">
        <VStack gap={6} textAlign="center">
          <Box color="green.400">
            <LuCircleCheck size={80} />
          </Box>

          <Heading size="xl" color="fg">
            {t('title')}
          </Heading>

          <Text color="fg.muted" fontSize="lg">
            {t('message')}
          </Text>

          {orderId && (
            <Box p={4} bg={{ _light: 'blackAlpha.100', _dark: 'whiteAlpha.100' }} borderRadius="md">
              <Text color="fg.muted" fontSize="sm">
                {t('orderNumber')}
              </Text>
              <Text color="fg" fontSize="lg" fontWeight="bold" fontFamily="mono">
                {orderId}
              </Text>
            </Box>
          )}

          <VStack gap={3} pt={4}>
            <Button colorPalette="fg" size="lg" asChild>
              <LocalizedLink href="/shop">{t('continueShopping')}</LocalizedLink>
            </Button>
            <Button variant="ghost" asChild>
              <LocalizedLink href="/">{t('goHome')}</LocalizedLink>
            </Button>
          </VStack>
        </VStack>
      </Container>
    </Box>
  )
}
