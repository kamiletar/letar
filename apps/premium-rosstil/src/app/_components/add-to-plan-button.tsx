'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { ShoppingPriority } from '@/hooks/use-shopping-plan'
import { PRIORITY_CONFIG, useShoppingPlan } from '@/hooks/use-shopping-plan'
import { Badge, HStack, Icon, IconButton, Menu, Portal, Text } from '@chakra-ui/react'
import { FaCalendarCheck, FaCheck } from 'react-icons/fa'

interface AddToPlanButtonProps {
  /** ID варианта товара */
  variantId: string
  /** ID товара (Product) */
  productId: string
  /** Название товара */
  productName: string
  /** Цвет варианта */
  variantColor: string
  /** URL изображения */
  imageUrl?: string
  /** Цена */
  price: number
  /** Размер кнопки */
  size?: 'xs' | 'sm' | 'md'
  /** Вариант отображения */
  variant?: 'ghost' | 'outline' | 'subtle'
}

/**
 * Кнопка добавления товара в план покупок.
 * Показывает меню с выбором приоритета покупки.
 */
export function AddToPlanButton({
  variantId,
  productId,
  productName,
  variantColor,
  imageUrl,
  price,
  size = 'sm',
  variant = 'ghost',
}: AddToPlanButtonProps) {
  const { addItem, removeItem, updatePriority, isInPlan, getItem, isLoading } = useShoppingPlan()

  const inPlan = isInPlan(variantId)
  const currentItem = getItem(variantId)

  const handleAddWithPriority = async (priority: ShoppingPriority) => {
    if (inPlan) {
      // Если уже в плане - меняем приоритет
      await updatePriority(variantId, priority)
      toaster.success({ title: `Приоритет изменён: ${PRIORITY_CONFIG[priority].label}` })
    } else {
      // Добавляем новый товар
      const result = await addItem({
        variantId,
        productId,
        productName,
        variantColor,
        imageUrl,
        price,
        priority,
      })
      if (result.success) {
        toaster.success({ title: `Добавлено: ${PRIORITY_CONFIG[priority].label}` })
      } else if ('error' in result) {
        toaster.warning({ title: result.error })
      }
    }
  }

  const handleRemove = async () => {
    await removeItem(variantId)
    toaster.success({ title: 'Удалено из плана покупок' })
  }

  if (isLoading) {
    return null
  }

  return (
    <Menu.Root positioning={{ placement: 'bottom-start' }}>
      <Menu.Trigger asChild>
        <IconButton
          aria-label="Добавить в план покупок"
          variant={inPlan ? 'solid' : variant}
          colorPalette={inPlan ? 'green' : 'gray'}
          size={size}
        >
          <Icon as={FaCalendarCheck} />
          {inPlan && currentItem && (
            <Badge
              position="absolute"
              top={-1}
              right={-1}
              bg={PRIORITY_CONFIG[currentItem.priority].color + '.500'}
              color="white"
              size="xs"
              borderRadius="full"
              fontSize="10px"
            >
              {PRIORITY_CONFIG[currentItem.priority].emoji}
            </Badge>
          )}
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="200px">
            {/* Приоритеты */}
            {(Object.keys(PRIORITY_CONFIG) as ShoppingPriority[]).map((priority) => {
              const config = PRIORITY_CONFIG[priority]
              const isCurrentPriority = currentItem?.priority === priority
              return (
                <Menu.Item key={priority} value={priority} onClick={() => handleAddWithPriority(priority)}>
                  <HStack justify="space-between" w="full">
                    <HStack gap={2}>
                      <Text>{config.emoji}</Text>
                      <Text fontSize="sm">{config.label}</Text>
                    </HStack>
                    {isCurrentPriority && <Icon as={FaCheck} color="green.500" />}
                  </HStack>
                </Menu.Item>
              )
            })}

            {/* Удаление, если в плане */}
            {inPlan && (
              <>
                <Menu.Separator />
                <Menu.Item value="remove" onClick={handleRemove} color="red.500">
                  <Text fontSize="sm">Удалить из плана</Text>
                </Menu.Item>
              </>
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
