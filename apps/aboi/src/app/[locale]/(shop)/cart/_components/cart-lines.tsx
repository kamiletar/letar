'use client'

import { type CartView, removeFromCartAction, updateCartItemAction } from '@/lib/cart'
import { Box, Button, Flex, HStack, IconButton, Input, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export function CartLines({ initial }: { initial: CartView }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      setError(null)
      const result = await fn()
      if (!result.ok && result.error) setError(result.error)
      router.refresh()
    })
  }

  return (
    <Stack gap={6}>
      {error && (
        <Box bg="red.subtle" color="red.fg" p={3} borderRadius="md" fontSize="sm">
          {error}
        </Box>
      )}

      <Stack gap={3}>
        {initial.items.map((line) => (
          <CartLine key={line.id} line={line} isPending={isPending} run={run} />
        ))}
      </Stack>

      <Flex justify="space-between" align="center" wrap="wrap" gap={4} p={5} bg="bg.subtle" borderRadius="xl">
        <Stack gap={0}>
          <Text fontSize="sm" color="fg.muted">
            Итого
          </Text>
          <Text fontSize="2xl" fontWeight="bold">
            {(initial.itemsTotal / 100).toFixed(0)} ₽
          </Text>
          <Text fontSize="xs" color="fg.muted">
            Без учёта доставки — рассчитает менеджер
          </Text>
        </Stack>
        <Button asChild colorPalette="brand" size="lg">
          <Link href="/checkout">Оформить заказ</Link>
        </Button>
      </Flex>
    </Stack>
  )
}

function CartLine({
  line,
  isPending,
  run,
}: {
  line: CartView['items'][number]
  isPending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void
}) {
  const [length, setLength] = useState(line.lengthMeters.toString())

  function handleBlur() {
    const num = Number(length)
    if (!Number.isFinite(num) || num <= 0) {
      setLength(line.lengthMeters.toString())
      return
    }
    if (num === line.lengthMeters) return
    run(() => updateCartItemAction(line.id, num))
  }

  return (
    <Flex
      gap={4}
      p={4}
      bg="bg.surface"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border"
      align="center"
      wrap={{ base: 'wrap', md: 'nowrap' }}
    >
      <Box w="80px" h="80px" bg="bg.muted" borderRadius="md" overflow="hidden" flexShrink={0}>
        {line.productImagePath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/files/${line.productImagePath}`}
            alt={line.productName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </Box>

      <Stack gap={0} flex="1" minW="200px">
        <Box asChild fontWeight="medium" _hover={{ color: 'brand.solid' }}>
          <Link href={`/catalog/${line.productSlug}`}>{line.productName}</Link>
        </Box>
        <Text fontSize="sm" color="fg.muted">
          {(line.unitPrice / 100).toFixed(0)} ₽ / пог. м
        </Text>
      </Stack>

      <HStack gap={2}>
        <Text fontSize="sm" color="fg.muted">
          Длина:
        </Text>
        <Input
          type="number"
          min={0.1}
          step={0.1}
          value={length}
          onChange={(e) => setLength(e.target.value)}
          onBlur={handleBlur}
          width="100px"
          size="sm"
        />
        <Text fontSize="sm" color="fg.muted">
          м
        </Text>
      </HStack>

      <Text fontWeight="semibold" minW="100px" textAlign="end">
        {(line.total / 100).toFixed(0)} ₽
      </Text>

      <IconButton
        size="sm"
        variant="ghost"
        colorPalette="red"
        loading={isPending}
        aria-label="Убрать из корзины"
        onClick={() => run(() => removeFromCartAction(line.id))}
      >
        ✕
      </IconButton>
    </Flex>
  )
}
