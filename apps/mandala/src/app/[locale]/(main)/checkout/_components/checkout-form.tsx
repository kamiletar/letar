'use client'

import { useCart } from '@/app/_components/cart'
import { EmptyState } from '@/app/_components/empty-state'
import { toaster } from '@/app/_components/ui/toaster'
import type { MandalaActionType } from '@/lib/offline'
import { MandalaForm } from '@/mandala-form'
import { Badge, Box, Card, Flex, Heading, Spinner, Stack, Text, VStack } from '@chakra-ui/react'
import { useOfflineForm } from '@letar/forms/offline'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useMemo } from 'react'
import { LuCloudOff, LuShoppingCart } from 'react-icons/lu'
import { createOrderAction } from '../_actions/create-order.action'
import { type CheckoutFormInput, CheckoutFormSchema } from '../_schemas/checkout.schema'

export function CheckoutForm() {
  const t = useTranslations('checkout')
  const tCart = useTranslations('cart')
  const { items, total, itemCount, clearCart } = useCart()

  // Оффлайн поддержка формы
  const { submit, isOffline, pendingCount, isProcessing } = useOfflineForm<CheckoutFormInput>({
    actionType: 'CREATE_ORDER' satisfies MandalaActionType,
    onlineSubmit: async (data) => {
      const result = await createOrderAction(data)
      if (result.success) {
        clearCart()
        return { success: true }
      }
      return { success: false, error: result.error }
    },
    onSuccess: () => {
      toaster.success({ title: t('toast.success') })
    },
    onQueued: () => {
      toaster.info({
        title: t('toast.queued.title'),
        description: t('toast.queued.description'),
      })
      clearCart() // Очищаем корзину даже при оффлайн сохранении
    },
    onError: (error) => {
      toaster.error({ title: error })
    },
  })

  // Сериализуем корзину для передачи в форму
  const cartItemsJson = useMemo(
    () =>
      JSON.stringify(
        items.map((item) => ({
          productId: item.productId,
          productSlug: item.productSlug,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        }))
      ),
    [items]
  )

  const defaultValues: CheckoutFormInput = {
    name: '',
    phone: '',
    email: '',
    address: '',
    comment: '',
    cartItems: cartItemsJson,
  }

  const handleSubmit = async (data: CheckoutFormInput) => {
    // Добавляем актуальные данные корзины и отправляем через offline submit
    await submit({ ...data, cartItems: cartItemsJson })
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<LuShoppingCart size={64} />}
        title={t('emptyState.title')}
        description={t('emptyState.description')}
        actionLabel={t('emptyState.action')}
        actionHref="/shop"
      />
    )
  }

  return (
    <MandalaForm initialValue={defaultValues} schema={CheckoutFormSchema} onSubmit={handleSubmit}>
      <Stack direction={{ base: 'column', lg: 'row' }} gap={8} align="flex-start">
        {/* Форма */}
        <Box flex={1}>
          <Card.Root bg={{ _light: 'blackAlpha.50', _dark: 'whiteAlpha.50' }} borderColor="border.subtle">
            <Card.Header>
              <Flex justify="space-between" align="center">
                <Heading size="md">{t('form.heading')}</Heading>
                {/* Оффлайн статус */}
                {isOffline && (
                  <Badge colorPalette="orange" size="sm">
                    <LuCloudOff />
                    {t('offline.badge')}
                  </Badge>
                )}
                {pendingCount > 0 && !isOffline && (
                  <Badge colorPalette="blue" size="sm">
                    {isProcessing ? <Spinner size="xs" /> : null}
                    {isProcessing ? t('offline.syncing') : t('offline.pending', { count: pendingCount })}
                  </Badge>
                )}
              </Flex>
            </Card.Header>
            <Card.Body>
              <MandalaForm.Errors />

              <Stack gap={4}>
                <MandalaForm.Field.String name="name" />
                <MandalaForm.Field.String name="phone" />
                <MandalaForm.Field.String name="email" />
                <MandalaForm.Field.Textarea name="address" rows={2} />
                <MandalaForm.Field.Textarea name="comment" rows={3} />
              </Stack>
            </Card.Body>
          </Card.Root>
        </Box>

        {/* Сводка заказа */}
        <Box w={{ base: 'full', lg: '350px' }}>
          <Card.Root
            bg={{ _light: 'blackAlpha.100', _dark: 'whiteAlpha.100' }}
            borderColor="border.subtle"
            position="sticky"
            top="100px"
          >
            <Card.Header>
              <Heading size="md">{t('orderSummary.heading')}</Heading>
            </Card.Header>
            <Card.Body>
              <VStack gap={3} align="stretch" mb={4}>
                {items.map((item) => (
                  <Flex key={item.productId} gap={3} align="center">
                    {item.imageUrl && (
                      <Box
                        position="relative"
                        width="40px"
                        height="40px"
                        borderRadius="sm"
                        overflow="hidden"
                        flexShrink={0}
                      >
                        <Image src={item.imageUrl} alt={item.name} fill style={{ objectFit: 'cover' }} />
                      </Box>
                    )}
                    <Box flex={1}>
                      <Text fontSize="sm" color="fg" lineClamp={1}>
                        {item.name}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {item.quantity} x {item.price} {tCart('priceUnit')}
                      </Text>
                    </Box>
                    <Text fontSize="sm" fontWeight="bold" color="fg">
                      {item.price * item.quantity} {tCart('priceUnit')}
                    </Text>
                  </Flex>
                ))}
              </VStack>

              <Box borderTopWidth="1px" borderColor="border.subtle" pt={4}>
                <Flex justify="space-between" align="center" mb={4}>
                  <Text color="fg.muted">{tCart('itemCount', { count: itemCount })}</Text>
                  <Text fontSize="xl" fontWeight="bold" color="fg">
                    {total} {tCart('priceUnit')}
                  </Text>
                </Flex>

                <MandalaForm.Button.Submit colorPalette="fg" size="lg" width="full">
                  {isOffline ? t('submitOffline') : t('submit')}
                </MandalaForm.Button.Submit>
              </Box>
            </Card.Body>
          </Card.Root>
        </Box>
      </Stack>
    </MandalaForm>
  )
}
