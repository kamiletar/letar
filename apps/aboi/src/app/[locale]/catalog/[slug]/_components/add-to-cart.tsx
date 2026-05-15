'use client'

import { addToCartAction } from '@/lib/cart'
import { Box, Button, HStack, Input, Stack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export function AddToCart({
  productId,
  minLengthMeters,
  pricePerMeter,
}: {
  productId: string
  minLengthMeters: number
  pricePerMeter: number
}) {
  const router = useRouter()
  const [length, setLength] = useState(minLengthMeters.toString())
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState(false)

  function handleAdd() {
    const num = Number(length)
    if (!Number.isFinite(num) || num <= 0) {
      setError('Введите длину больше 0')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await addToCartAction(productId, num)
      if (!result.ok) {
        setError(result.error ?? 'Не удалось добавить')
        return
      }
      setAdded(true)
      router.refresh()
      // Сбрасываем «добавлено» через 3 секунды
      setTimeout(() => setAdded(false), 3000)
    })
  }

  const total = Number(length) * pricePerMeter
  const totalLabel = Number.isFinite(total) && total > 0 ? `${(total / 100).toFixed(0)} ₽` : '—'

  return (
    <Stack gap={3}>
      <HStack gap={2} align="end">
        <Stack gap={1} flex="1">
          <Text fontSize="sm" color="fg.muted">
            Длина (м)
          </Text>
          <Input
            type="number"
            min={minLengthMeters}
            step={0.1}
            value={length}
            onChange={(e) => setLength(e.target.value)}
          />
        </Stack>
        <Stack gap={1}>
          <Text fontSize="sm" color="fg.muted">
            Итого
          </Text>
          <Box px={4} py={2.5} borderWidth="1px" borderColor="border" borderRadius="md" bg="bg.subtle">
            <Text fontWeight="semibold">{totalLabel}</Text>
          </Box>
        </Stack>
      </HStack>

      <Button colorPalette="brand" size="lg" onClick={handleAdd} loading={isPending}>
        {added ? 'Добавлено в корзину ✓' : 'В корзину'}
      </Button>

      {error && (
        <Text fontSize="sm" color="red.fg">
          {error}
        </Text>
      )}
    </Stack>
  )
}
