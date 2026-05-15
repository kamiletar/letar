import type { LoyaltyLevel } from '@/generated/prisma'
import { redirect } from '@/i18n/server-redirect'
import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Container, Heading, HStack, Separator, Text, VStack } from '@chakra-ui/react'
import { getCart } from '../cart/_actions/get-cart'
import { CheckoutForm } from './_components/checkout-form'

export const metadata = {
  title: 'Оформление заказа — Премиум РосСтиль',
  description: 'Оформление заказа с доставкой',
}

export default async function CheckoutPage() {
  // 1. Проверка авторизации
  const authUser = await requireAuth()

  // 2. Получение корзины
  const cart = await getCart()

  // 3. Если корзина пустая, редирект на страницу корзины
  if (!cart || cart.items.length === 0) {
    return redirect('/cart')
  }

  // 4. Подсчет итоговой суммы и количества товаров
  type CartItemType = (typeof cart.items)[number]
  const totalAmount = cart.items.reduce((sum: number, item: CartItemType) => {
    return sum + Number(item.productItem.price) * item.quantity
  }, 0)

  const totalItems = cart.items.reduce((sum: number, item: CartItemType) => sum + item.quantity, 0)

  // 5. Получение сохраненных адресов, профиля и лояльности
  const db = getEnhancedPrisma(authUser)
  const [savedAddresses, userProfile, loyaltyAccount] = await Promise.all([
    db.address.findMany({
      where: { userId: authUser.id },
      orderBy: [
        { isDefault: 'desc' }, // Сначала адрес по умолчанию
        { createdAt: 'desc' }, // Потом по дате создания
      ],
    }),
    db.userProfile.findUnique({
      where: { userId: authUser.id },
      select: { phoneNumber: true },
    }),
    db.loyaltyAccount.findUnique({
      where: { userId: authUser.id },
      select: { balance: true, level: true },
    }),
  ])

  // 6. Предзаполнение формы данными из профиля пользователя
  const defaultValues = {
    customerName: authUser.name || '',
    customerPhone: userProfile?.phoneNumber || '',
    customerEmail: authUser.email || '',
    deliveryAddress: '',
    saveToProfile: true, // По умолчанию сохраняем адрес в профиль
    notes: '',
    loyaltyPoints: 0,
  }

  return (
    <Container maxW="7xl" py={8}>
      <Heading size="3xl" mb={8} textTransform="none">
        Оформление заказа
      </Heading>

      <Box display="grid" gridTemplateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={8}>
        {/* Форма оформления заказа */}
        <Box>
          <CheckoutForm
            defaultValue={defaultValues}
            savedAddresses={savedAddresses}
            submitLabel="Оформить заказ"
            loyaltyBalance={loyaltyAccount?.balance ?? 0}
            loyaltyLevel={(loyaltyAccount?.level as LoyaltyLevel) ?? 'BRONZE'}
            subtotal={totalAmount}
          />
        </Box>

        {/* Сводка по заказу */}
        <Box borderWidth="1px" borderRadius="lg" p={6} h="fit-content" position="sticky" top={4}>
          <VStack align="stretch" gap={4}>
            <Text fontSize="xl" fontWeight="semibold">
              Ваш заказ
            </Text>

            <Separator />

            {/* Список товаров */}
            <VStack align="stretch" gap={3}>
              {cart.items.map((item: CartItemType) => (
                <Box key={item.id}>
                  <HStack justify="space-between" align="start">
                    <VStack align="start" gap={0} flex={1}>
                      <Text fontWeight="medium" fontSize="sm">
                        {item.productItem.variant.product.name}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {item.productItem.variant.color} / Размер: {item.productItem.size.ru}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {item.quantity} шт.
                      </Text>
                    </VStack>
                    <Text fontWeight="medium" fontSize="sm" whiteSpace="nowrap">
                      {(Number(item.productItem.price) * item.quantity).toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                      })}
                    </Text>
                  </HStack>
                </Box>
              ))}
            </VStack>

            <Separator />

            <HStack justify="space-between">
              <Text color="fg.muted">Товаров:</Text>
              <Text fontWeight="medium">
                {totalItems} {getItemsLabel(totalItems)}
              </Text>
            </HStack>

            <Separator />

            <HStack justify="space-between">
              <Text fontSize="lg" fontWeight="semibold">
                Итого:
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="fg">
                {totalAmount.toLocaleString('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                })}
              </Text>
            </HStack>

            <Text fontSize="sm" color="fg.muted">
              Стоимость доставки будет рассчитана после оформления заказа
            </Text>
          </VStack>
        </Box>
      </Box>
    </Container>
  )
}

/**
 * Возвращает правильное склонение слова "товар".
 */
function getItemsLabel(count: number): string {
  const lastDigit = count % 10
  const lastTwoDigits = count % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'товаров'
  }

  if (lastDigit === 1) {
    return 'товар'
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'товара'
  }

  return 'товаров'
}
