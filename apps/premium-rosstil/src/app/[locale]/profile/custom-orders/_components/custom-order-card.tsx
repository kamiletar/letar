'use client'

import type { CustomOrderStatus, CustomOrderType } from '@/generated/prisma'
import { Link } from '@/i18n/navigation'
import { Box, Card, Grid, HStack, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'
import { CustomOrderStatusBadge, CustomOrderTypeBadge } from './custom-order-status-badge'

interface CustomOrderCardProps {
  order: {
    id: string
    orderNumber: string
    type: CustomOrderType
    status: CustomOrderStatus
    createdAt: Date | string
    productName: string
    variantColor?: string | null
    sizeName?: string | null
    quantity?: number | null
    // Custom size measurements
    customBust?: number | null
    customWaist?: number | null
    customHips?: number | null
    customHeight?: number | null
    // Wholesale
    companyName?: string | null
    // Custom design
    designDescription?: string | null
    referenceImageUrls?: string[] | null
  }
}

/**
 * Card component for displaying custom order in user's profile.
 * Shows order type, status, product info and type-specific details.
 */
export function CustomOrderCard({ order }: CustomOrderCardProps) {
  const createdDate = new Date(order.createdAt)

  return (
    <Link href={`/profile/custom-orders/${order.id}`} style={{ textDecoration: 'none' }}>
      <Card.Root _hover={{ borderColor: 'fg.muted', shadow: 'md' }} transition="all 0.2s" cursor="pointer">
        <Card.Body>
          <VStack align="stretch" gap={4}>
            {/* Header with order number and badges */}
            <HStack justify="space-between" align="start" flexWrap="wrap" gap={2}>
              <VStack align="start" gap={1}>
                <Text fontWeight="semibold" fontSize="lg">
                  Заказ {order.orderNumber}
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  {createdDate.toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </VStack>

              <HStack gap={2} flexWrap="wrap">
                <CustomOrderTypeBadge type={order.type} />
                <CustomOrderStatusBadge status={order.status} />
              </HStack>
            </HStack>

            {/* Product info */}
            <HStack justify="space-between" pt={2} borderTopWidth="1px" flexWrap="wrap" gap={2}>
              <VStack align="start" gap={1}>
                <Text fontSize="sm" color="fg.muted">
                  Товар:
                </Text>
                <Text fontWeight="medium">{order.productName}</Text>
                {order.variantColor && (
                  <Text fontSize="sm" color="fg.muted">
                    Цвет: {order.variantColor}
                  </Text>
                )}
              </VStack>

              {/* Type-specific info */}
              {order.type === 'MADE_TO_ORDER' && (
                <VStack align="end" gap={1}>
                  <Text fontSize="sm" color="fg.muted">
                    Мерки:
                  </Text>
                  <Grid templateColumns="repeat(2, auto)" gap={2} fontSize="sm">
                    {order.customBust && <Text>Грудь: {order.customBust} см</Text>}
                    {order.customWaist && <Text>Талия: {order.customWaist} см</Text>}
                    {order.customHips && <Text>Бёдра: {order.customHips} см</Text>}
                    {order.customHeight && <Text>Рост: {order.customHeight} см</Text>}
                  </Grid>
                </VStack>
              )}

              {order.type === 'CUSTOM_DESIGN' && (
                <VStack align="end" gap={2} maxW="60%">
                  {order.designDescription && (
                    <>
                      <Text fontSize="sm" color="fg.muted">
                        Описание дизайна:
                      </Text>
                      <Text fontSize="sm" textAlign="right" lineClamp={2}>
                        {order.designDescription}
                      </Text>
                    </>
                  )}
                  {order.referenceImageUrls && order.referenceImageUrls.length > 0 && (
                    <HStack gap={2} flexWrap="wrap" justify="flex-end">
                      {order.referenceImageUrls.slice(0, 3).map((url) => (
                        <Box
                          key={url}
                          position="relative"
                          boxSize="60px"
                          borderRadius="md"
                          overflow="hidden"
                          borderWidth={1}
                          borderColor="border.muted"
                        >
                          <Image src={url} alt="Фото-ориентир" fill style={{ objectFit: 'cover' }} sizes="60px" />
                        </Box>
                      ))}
                      {order.referenceImageUrls.length > 3 && (
                        <Text fontSize="xs" color="fg.muted">
                          +{order.referenceImageUrls.length - 3}
                        </Text>
                      )}
                    </HStack>
                  )}
                </VStack>
              )}

              {order.type === 'B2B_PARTNERSHIP' && order.companyName && (
                <VStack align="end" gap={1}>
                  <Text fontSize="sm" color="fg.muted">
                    Компания:
                  </Text>
                  <Text fontWeight="medium">{order.companyName}</Text>
                </VStack>
              )}
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>
    </Link>
  )
}
