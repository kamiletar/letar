'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { type CompareItem, useCompare } from '@/hooks/use-compare'
import { Icon, IconButton } from '@chakra-ui/react'
import { Tooltip } from '@letar/ui'
import { FaBalanceScale, FaCheck } from 'react-icons/fa'

interface CompareButtonProps {
  /** ID варианта товара */
  variantId: string
  /** ID товара (Product) */
  productId: string
  /** Название товара */
  productName: string
  /** Цвет варианта */
  variantColor: string
  /** Состав */
  composition: string
  /** URL изображения */
  imageUrl?: string
  /** Цена (минимальная из доступных размеров) */
  price: number
  /** Доступные размеры */
  sizes: string[]
  /** Размер кнопки */
  size?: 'xs' | 'sm' | 'md'
  /** Вариант отображения */
  variant?: 'ghost' | 'outline' | 'subtle'
}

/**
 * Кнопка "Сравнить" для карточки товара.
 * Позволяет добавить товар в сравнение (до 4 штук).
 */
export function CompareButton({
  variantId,
  productId,
  productName,
  variantColor,
  composition,
  imageUrl,
  price,
  sizes,
  size = 'sm',
  variant = 'ghost',
}: CompareButtonProps) {
  const { toggleCompare, isInCompare, isFull, isLoading } = useCompare()

  const isComparing = isInCompare(variantId)

  const handleClick = async () => {
    const item: Omit<CompareItem, 'addedAt' | 'notes'> = {
      variantId,
      productId,
      productName,
      variantColor,
      composition,
      imageUrl,
      price,
      sizes,
    }

    const result = await toggleCompare(item)

    if (result.success) {
      if (isComparing) {
        toaster.success({ title: 'Убрано из сравнения' })
      } else {
        toaster.success({
          title: 'Добавлено в сравнение',
          description: `${productName} (${variantColor})`,
        })
      }
    } else if ('error' in result && result.error) {
      toaster.warning({ title: result.error })
    }
  }

  if (isLoading) {
    return null
  }

  const tooltipLabel = isComparing ? 'Убрать из сравнения' : isFull ? 'Максимум 4 товара' : 'Добавить в сравнение'

  return (
    <Tooltip content={tooltipLabel} positioning={{ placement: 'top' }}>
      <IconButton
        aria-label={tooltipLabel}
        variant={isComparing ? 'solid' : variant}
        colorPalette={isComparing ? 'green' : 'gray'}
        size={size}
        onClick={handleClick}
        disabled={!isComparing && isFull}
      >
        <Icon as={isComparing ? FaCheck : FaBalanceScale} />
      </IconButton>
    </Tooltip>
  )
}
