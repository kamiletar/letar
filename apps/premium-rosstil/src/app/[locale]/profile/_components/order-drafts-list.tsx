'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { type OrderDraft, useOrderDrafts } from '@/hooks/use-order-drafts'
import { Link } from '@/i18n/navigation'
import { Badge, Box, Button, Card, Collapsible, HStack, Icon, Skeleton, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'
import { useState } from 'react'
import {
  FaChevronDown,
  FaChevronUp,
  FaClipboardList,
  FaClock,
  FaEdit,
  FaShoppingBag,
  FaSync,
  FaTrash,
} from 'react-icons/fa'

/**
 * Список черновиков заказов в профиле пользователя.
 */
export function OrderDraftsList() {
  const { drafts, isLoading, deleteDraft, calculateDraftTotal, calculateDraftItemCount } = useOrderDrafts()
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null)

  if (isLoading) {
    return (
      <Card.Root>
        <Card.Body>
          <VStack gap={4}>
            <Skeleton height="80px" width="100%" />
            <Skeleton height="80px" width="100%" />
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  const handleDelete = async (id: string) => {
    const result = await deleteDraft(id)
    if (result.success) {
      toaster.success({ title: 'Черновик удалён' })
    }
  }

  // Форматирование даты
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Форматирование цены
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(price)
  }

  // Получить иконку статуса
  const getStatusBadge = (status: OrderDraft['status']) => {
    switch (status) {
      case 'draft':
        return (
          <Badge colorPalette="gray" size="sm">
            <Icon as={FaEdit} mr={1} />
            Черновик
          </Badge>
        )
      case 'pending_sync':
        return (
          <Badge colorPalette="orange" size="sm">
            <Icon as={FaSync} mr={1} />
            Ожидает отправки
          </Badge>
        )
      case 'synced':
        return (
          <Badge colorPalette="green" size="sm">
            <Icon as={FaSync} mr={1} />
            Отправлен
          </Badge>
        )
    }
  }

  if (drafts.length === 0) {
    return (
      <Card.Root>
        <Card.Header>
          <HStack gap={2}>
            <Icon as={FaClipboardList} color="fg.muted" />
            <Text fontWeight="medium">Черновики заказов</Text>
          </HStack>
        </Card.Header>
        <Card.Body>
          <VStack gap={2} py={4}>
            <Icon as={FaShoppingBag} boxSize={8} color="fg.muted" />
            <Text color="fg.muted">Нет сохранённых черновиков</Text>
            <Text fontSize="sm" color="fg.muted" textAlign="center">
              Вы можете сохранить корзину как черновик, чтобы вернуться к заказу позже
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <HStack gap={2}>
            <Icon as={FaClipboardList} color="fg.muted" />
            <Text fontWeight="medium">Черновики заказов</Text>
            <Badge colorPalette="fg">{drafts.length}</Badge>
          </HStack>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap={3}>
          {drafts.map((draft) => {
            const isExpanded = expandedDraft === draft.id
            const total = calculateDraftTotal(draft)
            const itemCount = calculateDraftItemCount(draft)

            return (
              <Box key={draft.id} borderWidth="1px" borderRadius="md" overflow="hidden">
                {/* Заголовок черновика */}
                <Box
                  p={3}
                  bg={isExpanded ? 'bg.muted' : 'transparent'}
                  cursor="pointer"
                  onClick={() => setExpandedDraft(isExpanded ? null : draft.id)}
                  _hover={{ bg: 'bg.muted' }}
                >
                  <HStack justify="space-between">
                    <VStack align="start" gap={1}>
                      <HStack gap={2}>
                        <Text fontWeight="medium" fontSize="sm">
                          {draft.name || `Заказ #${draft.id.slice(0, 8)}`}
                        </Text>
                        {getStatusBadge(draft.status)}
                      </HStack>
                      <HStack gap={3} fontSize="xs" color="fg.muted">
                        <HStack gap={1}>
                          <Icon as={FaClock} />
                          <Text>{formatDate(draft.updatedAt)}</Text>
                        </HStack>
                        <Text>
                          {itemCount} {itemCount === 1 ? 'товар' : itemCount < 5 ? 'товара' : 'товаров'}
                        </Text>
                        <Text fontWeight="medium">{formatPrice(total)}</Text>
                      </HStack>
                    </VStack>
                    <Icon as={isExpanded ? FaChevronUp : FaChevronDown} color="fg.muted" />
                  </HStack>
                </Box>

                {/* Содержимое черновика */}
                <Collapsible.Root open={isExpanded}>
                  <Collapsible.Content>
                    <Box p={3} borderTopWidth="1px">
                      {/* Товары */}
                      <VStack align="stretch" gap={2} mb={3}>
                        {draft.items.map((item, idx) => (
                          <HStack key={`${item.productSlug}-${item.size}-${idx}`} gap={3}>
                            {item.productImage && (
                              <Box width="40px" height="40px" position="relative" borderRadius="md" overflow="hidden">
                                <Image
                                  src={item.productImage}
                                  alt={item.productName}
                                  fill
                                  style={{ objectFit: 'cover' }}
                                />
                              </Box>
                            )}
                            <VStack align="start" flex={1} gap={0}>
                              <Link href={`/catalog/${item.productSlug}`}>
                                <Text fontSize="sm" _hover={{ textDecoration: 'underline' }}>
                                  {item.productName}
                                </Text>
                              </Link>
                              <HStack gap={2} fontSize="xs" color="fg.muted">
                                {item.size && <Text>Размер: {item.size}</Text>}
                                {item.color && <Text>Цвет: {item.color}</Text>}
                                <Text>x{item.quantity}</Text>
                              </HStack>
                            </VStack>
                            <Text fontSize="sm" fontWeight="medium">
                              {formatPrice(item.price * item.quantity)}
                            </Text>
                          </HStack>
                        ))}
                      </VStack>

                      {/* Информация о получателе */}
                      {draft.recipient && (
                        <Box mb={3} p={2} bg="bg.muted" borderRadius="md">
                          <Text fontSize="xs" fontWeight="medium" mb={1}>
                            Получатель:
                          </Text>
                          <Text fontSize="sm">
                            {draft.recipient.name}, {draft.recipient.phone}
                          </Text>
                        </Box>
                      )}

                      {/* Адрес доставки */}
                      {draft.address && (
                        <Box mb={3} p={2} bg="bg.muted" borderRadius="md">
                          <Text fontSize="xs" fontWeight="medium" mb={1}>
                            Адрес доставки:
                          </Text>
                          <Text fontSize="sm">
                            {draft.address.city}, {draft.address.street}, д. {draft.address.house}
                            {draft.address.apartment && `, кв. ${draft.address.apartment}`}
                          </Text>
                        </Box>
                      )}

                      {/* Заметка */}
                      {draft.note && (
                        <Box mb={3} p={2} bg="bg.muted" borderRadius="md">
                          <Text fontSize="xs" fontWeight="medium" mb={1}>
                            Заметка:
                          </Text>
                          <Text fontSize="sm">{draft.note}</Text>
                        </Box>
                      )}

                      {/* Действия */}
                      <HStack gap={2} justify="flex-end">
                        <Button
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(draft.id)
                          }}
                        >
                          <Icon as={FaTrash} mr={1} />
                          Удалить
                        </Button>
                        <Button size="xs" colorPalette="fg" asChild>
                          <Link href={`/cart?draft=${draft.id}`}>
                            <Icon as={FaEdit} mr={1} />
                            Продолжить
                          </Link>
                        </Button>
                      </HStack>
                    </Box>
                  </Collapsible.Content>
                </Collapsible.Root>
              </Box>
            )
          })}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
