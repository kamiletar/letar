'use client'

import { Badge, Box, Button, Dialog, List, Portal, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState, useTransition } from 'react'
import { deleteProductSize } from '../_actions/delete-product-size'
import { getSizeUsage, type SizeUsageInfo } from '../_actions/get-size-usage'

interface DeleteSizeButtonProps {
  id: string
  sizeName: string
}

/**
 * Client component for deleting a ProductSize with confirmation dialog.
 * Uses Chakra UI v3 Dialog and useTransition for pending state.
 * Checks size usage before allowing deletion.
 */
export function DeleteSizeButton({ id, sizeName }: DeleteSizeButtonProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isCheckingUsage, setIsCheckingUsage] = useState(false)
  const [usageInfo, setUsageInfo] = useState<{
    isUsed: boolean
    items: SizeUsageInfo[]
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

      getSizeUsage(id)
        .then((info) => {
          if (!cancelled) {
            setUsageInfo(info)
            setIsCheckingUsage(false)
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Не удалось проверить использование размера')
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
        await deleteProductSize(id)
        // On success, deleteProductSize will redirect to /admin/sizes
      } catch (err) {
        // Handle errors (e.g., size is in use)
        const errorMessage = err instanceof Error ? err.message : 'Не удалось удалить размер'
        setError(errorMessage)
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
      <Dialog.Trigger asChild>
        <Button colorPalette="red" variant="outline">
          Удалить размер
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{usageInfo?.isUsed ? 'Невозможно удалить размер' : 'Подтверждение удаления'}</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              {isCheckingUsage && <Text color="fg.muted">Проверка использования размера...</Text>}

              {!isCheckingUsage && usageInfo && (
                <VStack gap={4} align="stretch">
                  {usageInfo.isUsed ? (
                    <>
                      <Box>
                        <Text>
                          Размер <strong>{sizeName}</strong> нельзя удалить, так как он используется в{' '}
                          <Badge colorPalette="red" size="sm">
                            {usageInfo.count}{' '}
                            {usageInfo.count === 1 ? 'товаре' : usageInfo.count < 5 ? 'товарах' : 'товарах'}
                          </Badge>
                          :
                        </Text>
                      </Box>

                      <Box maxH="300px" overflowY="auto" borderWidth="1px" borderRadius="md" p={3}>
                        <List.Root gap={2} variant="plain">
                          {usageInfo.items.map((item) => (
                            <List.Item key={item.itemId}>
                              <Box>
                                <Text fontWeight="medium">{item.productName}</Text>
                                <Text fontSize="sm" color="fg.muted">
                                  {item.variantColor} • {item.variantComposition} • Цена: {item.itemPrice} ₽
                                  {item.itemAvailable > 0 && ` • В наличии: ${item.itemAvailable}`}
                                </Text>
                              </Box>
                            </List.Item>
                          ))}
                        </List.Root>
                      </Box>

                      <Box p={3} bg="orange.subtle" borderRadius="md" borderWidth="1px" borderColor="orange.solid">
                        <Text fontSize="sm" color="orange.fg">
                          <strong>Совет:</strong> Сначала удалите или измените размер в этих товарах, затем вы сможете
                          удалить сам размер.
                        </Text>
                      </Box>
                    </>
                  ) : (
                    <>
                      <Text>
                        Вы уверены, что хотите удалить размер <strong>{sizeName}</strong>?
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
