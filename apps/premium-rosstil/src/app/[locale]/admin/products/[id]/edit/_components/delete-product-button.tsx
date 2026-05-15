'use client'

import { Badge, Box, Button, Dialog, List, Portal, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState, useTransition } from 'react'
import { deleteProduct } from '../_actions/delete-product'
import { getProductUsage, type ProductVariantInfo } from '../_actions/get-product-usage'

interface DeleteProductButtonProps {
  id: string
  productName: string
}

/**
 * Client component for deleting a Product with confirmation dialog.
 * Uses Chakra UI v3 Dialog and useTransition for pending state.
 * Checks product usage (variants) before allowing deletion.
 */
export function DeleteProductButton({ id, productName }: DeleteProductButtonProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isCheckingUsage, setIsCheckingUsage] = useState(false)
  const [usageInfo, setUsageInfo] = useState<{
    isUsed: boolean
    variants: ProductVariantInfo[]
    count: number
  } | null>(null)

  // Check usage when dialog opens
  useEffect(() => {
    if (!open || usageInfo || isCheckingUsage) {
      return
    }

    // Defer state update to avoid synchronous setState in effect
    let cancelled = false

    setTimeout(() => {
      if (cancelled) {
        return
      }

      setIsCheckingUsage(true)

      getProductUsage(id)
        .then((info) => {
          if (!cancelled) {
            setUsageInfo(info)
            setIsCheckingUsage(false)
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Не удалось проверить использование продукта')
            setIsCheckingUsage(false)
          }
        })
    }, 0)

    return () => {
      cancelled = true
    }
  }, [open, id, usageInfo, isCheckingUsage])

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      try {
        await deleteProduct(id)
        // On success, deleteProduct will redirect to /admin/products
      } catch (err) {
        // Handle errors (e.g., product has variants)
        const errorMessage = err instanceof Error ? err.message : 'Не удалось удалить продукт'
        setError(errorMessage)
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
      <Dialog.Trigger asChild>
        <Button colorPalette="red" variant="outline">
          Удалить продукт
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{usageInfo?.isUsed ? 'Невозможно удалить продукт' : 'Подтверждение удаления'}</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              {isCheckingUsage && <Text color="fg.muted">Проверка использования продукта...</Text>}

              {!isCheckingUsage && usageInfo && (
                <VStack gap={4} align="stretch">
                  {usageInfo.isUsed ? (
                    <>
                      <Box>
                        <Text>
                          Продукт <strong>{productName}</strong> нельзя удалить, так как у него есть{' '}
                          <Badge colorPalette="red" size="sm">
                            {usageInfo.count}{' '}
                            {usageInfo.count === 1 ? 'вариант' : usageInfo.count < 5 ? 'варианта' : 'вариантов'}
                          </Badge>
                          :
                        </Text>
                      </Box>

                      <Box maxH="300px" overflowY="auto" borderWidth="1px" borderRadius="md" p={3}>
                        <List.Root gap={2} variant="plain">
                          {usageInfo.variants.map((variant) => (
                            <List.Item key={variant.variantId}>
                              <Box>
                                <Text fontWeight="medium">{variant.variantColor}</Text>
                                <Text fontSize="sm" color="fg.muted">
                                  {variant.variantComposition} • Товаров: {variant.itemCount} • Изображений:{' '}
                                  {variant.imageCount}
                                </Text>
                              </Box>
                            </List.Item>
                          ))}
                        </List.Root>
                      </Box>

                      <Box p={3} bg="orange.subtle" borderRadius="md" borderWidth="1px" borderColor="orange.solid">
                        <Text fontSize="sm" color="orange.fg">
                          <strong>Совет:</strong> Сначала удалите все варианты этого продукта, затем вы сможете удалить
                          сам продукт.
                        </Text>
                      </Box>
                    </>
                  ) : (
                    <>
                      <Text>
                        Вы уверены, что хотите удалить продукт <strong>{productName}</strong>?
                      </Text>
                      <Text fontSize="sm" color="fg.muted">
                        Это действие нельзя отменить.
                      </Text>
                    </>
                  )}

                  {error && (
                    <Box p={3} bg="red.subtle" borderWidth="1px" borderColor="red.solid" borderRadius="md">
                      <Text fontSize="sm" color="red.fg">
                        {error}
                      </Text>
                    </Box>
                  )}
                </VStack>
              )}
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" disabled={isPending}>
                  {usageInfo?.isUsed ? 'Закрыть' : 'Отмена'}
                </Button>
              </Dialog.ActionTrigger>
              {!usageInfo?.isUsed && (
                <Button
                  colorPalette="red"
                  onClick={handleDelete}
                  loading={isPending}
                  disabled={isPending || isCheckingUsage || !usageInfo}
                >
                  Удалить
                </Button>
              )}
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
