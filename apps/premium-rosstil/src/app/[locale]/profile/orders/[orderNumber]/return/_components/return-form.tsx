'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Card, HStack, Input, RadioGroup, Text, Textarea, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createReturn } from '../_actions/create-return'

interface SubOrderOption {
  id: string
  sellerName: string
  totalAmount: number
  items: Array<{
    productName: string
    variantColor?: string
    sizeName?: string
    quantity: number
    price: number
  }>
}

interface ReturnFormProps {
  orderNumber: string
  subOrders: SubOrderOption[]
}

/** Причины возврата */
const RETURN_REASONS = [
  'Товар не соответствует описанию',
  'Товар повреждён при доставке',
  'Неправильный размер',
  'Брак или дефект',
  'Другая причина',
] as const

function formatPrice(price: number): string {
  return price.toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  })
}

export function ReturnForm({ orderNumber, subOrders }: ReturnFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedSubOrderId, setSelectedSubOrderId] = useState(subOrders.length === 1 ? subOrders[0].id : '')
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = () => {
    if (!selectedSubOrderId || !reason) {
      toaster.error({ title: 'Заполните все обязательные поля' })
      return
    }

    startTransition(async () => {
      const result = await createReturn({
        subOrderId: selectedSubOrderId,
        reason,
        description: description || undefined,
      })

      if (result.success) {
        toaster.success({ title: 'Запрос на возврат создан' })
        router.push(`/profile/orders/${orderNumber}`)
      } else {
        toaster.error({ title: result.error || 'Ошибка' })
      }
    })
  }

  return (
    <VStack gap={6} align="stretch">
      {/* Выбор подзаказа */}
      {subOrders.length > 1 && (
        <Card.Root>
          <Card.Header>
            <Text fontWeight="bold">Какой товар хотите вернуть?</Text>
          </Card.Header>
          <Card.Body>
            <RadioGroup.Root value={selectedSubOrderId} onValueChange={(e) => setSelectedSubOrderId(e.value ?? '')}>
              <VStack align="stretch" gap={3}>
                {subOrders.map((sub) => (
                  <RadioGroup.Item key={sub.id} value={sub.id}>
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemIndicator />
                    <Box>
                      <Text fontWeight="medium">{sub.sellerName}</Text>
                      {sub.items.map((item, i) => (
                        <Text key={i} fontSize="sm" color="fg.muted">
                          {item.productName}
                          {item.variantColor ? ` (${item.variantColor})` : ''}
                          {item.sizeName ? `, ${item.sizeName}` : ''}
                          {' × '}
                          {item.quantity} = {formatPrice(item.price * item.quantity)}
                        </Text>
                      ))}
                      <Text fontSize="sm" fontWeight="medium" mt={1}>
                        Итого: {formatPrice(sub.totalAmount)}
                      </Text>
                    </Box>
                  </RadioGroup.Item>
                ))}
              </VStack>
            </RadioGroup.Root>
          </Card.Body>
        </Card.Root>
      )}

      {/* Единственный подзаказ — показываем информацию */}
      {subOrders.length === 1 && (
        <Card.Root>
          <Card.Body>
            <Text fontWeight="bold" mb={2}>
              Товар для возврата:
            </Text>
            {subOrders[0].items.map((item, i) => (
              <Text key={i} fontSize="sm">
                {item.productName}
                {item.variantColor ? ` (${item.variantColor})` : ''}
                {item.sizeName ? `, ${item.sizeName}` : ''}
                {' × '}
                {item.quantity}
              </Text>
            ))}
          </Card.Body>
        </Card.Root>
      )}

      {/* Причина возврата */}
      <Card.Root>
        <Card.Header>
          <Text fontWeight="bold">
            Причина возврата{' '}
            <Text as="span" color="red.500">
              *
            </Text>
          </Text>
        </Card.Header>
        <Card.Body>
          <VStack align="stretch" gap={2}>
            {RETURN_REASONS.map((r) => (
              <HStack
                key={r}
                p={3}
                borderWidth="1px"
                borderRadius="md"
                cursor="pointer"
                bg={reason === r ? 'bg.emphasized' : undefined}
                borderColor={reason === r ? 'fg' : 'border'}
                onClick={() => setReason(r)}
              >
                <Box
                  w={4}
                  h={4}
                  borderRadius="full"
                  borderWidth="2px"
                  borderColor={reason === r ? 'fg' : 'border.emphasized'}
                  bg={reason === r ? 'fg' : 'transparent'}
                />
                <Text fontSize="sm">{r}</Text>
              </HStack>
            ))}
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Описание */}
      <Card.Root>
        <Card.Header>
          <Text fontWeight="bold">Описание проблемы</Text>
          <Text fontSize="sm" color="fg.muted">
            Опишите проблему подробнее — это поможет ускорить рассмотрение
          </Text>
        </Card.Header>
        <Card.Body>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опишите проблему..."
            rows={4}
          />
        </Card.Body>
      </Card.Root>

      {/* Фотографии — упрощённая версия (поле для ID) */}
      <Card.Root>
        <Card.Header>
          <Text fontWeight="bold">Фотографии</Text>
          <Text fontSize="sm" color="fg.muted">
            Приложите фотографии дефекта или проблемы (необязательно)
          </Text>
        </Card.Header>
        <Card.Body>
          <Input placeholder="Загрузка фотографий будет доступна в ближайшее время" disabled />
        </Card.Body>
      </Card.Root>

      {/* Кнопка отправки */}
      <HStack justify="space-between">
        <Button variant="outline" onClick={() => router.back()} disabled={isPending}>
          Отмена
        </Button>
        <Button colorPalette="fg" onClick={handleSubmit} loading={isPending} disabled={!selectedSubOrderId || !reason}>
          Отправить запрос на возврат
        </Button>
      </HStack>
    </VStack>
  )
}
