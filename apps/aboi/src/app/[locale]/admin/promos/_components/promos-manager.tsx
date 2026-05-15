'use client'

import { Badge, Box, Button, Flex, HStack, Input, NativeSelect, Stack, Table, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createPromoAction, deletePromoAction, setPromoActiveAction } from '../../_actions/promos.action'

interface PromoView {
  id: string
  code: string
  type: 'PERCENT' | 'FIXED'
  value: number
  minOrderAmount: number | null
  maxUses: number | null
  usedCount: number
  validUntil: string | null
  isActive: boolean
}

export function PromosManager({ promos }: { promos: PromoView[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [code, setCode] = useState('')
  const [type, setType] = useState<'PERCENT' | 'FIXED'>('PERCENT')
  const [value, setValue] = useState('10')
  const [minOrderAmount, setMinOrderAmount] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [validUntil, setValidUntil] = useState('')

  function reset() {
    setCode('')
    setType('PERCENT')
    setValue('10')
    setMinOrderAmount('')
    setMaxUses('')
    setValidUntil('')
    setError(null)
  }

  function create() {
    setError(null)
    startTransition(async () => {
      const result = await createPromoAction({
        code,
        type,
        value: type === 'FIXED' ? Number(value) * 100 : Number(value),
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) * 100 : null,
        maxUses: maxUses ? Number(maxUses) : null,
        validUntil: validUntil || null,
      })
      if (!result.ok) {
        setError(result.error ?? 'Не удалось создать')
        return
      }
      reset()
      setCreating(false)
      router.refresh()
    })
  }

  return (
    <Stack gap={6}>
      {!creating && (
        <Button alignSelf="flex-start" colorPalette="brand" onClick={() => setCreating(true)}>
          + Новый промокод
        </Button>
      )}

      {creating && (
        <Stack gap={3} p={5} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.surface">
          <Text fontWeight="semibold">Новый промокод</Text>
          {error && (
            <Box bg="red.subtle" color="red.fg" p={3} borderRadius="md" fontSize="sm">
              {error}
            </Box>
          )}
          <Flex gap={3} wrap="wrap">
            <Stack gap={1} flex="1" minW="200px">
              <Text fontSize="xs" color="fg.muted">Код</Text>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WELCOME10" />
            </Stack>
            <Stack gap={1}>
              <Text fontSize="xs" color="fg.muted">Тип</Text>
              <NativeSelect.Root size="sm">
                <NativeSelect.Field value={type} onChange={(e) => setType(e.target.value as 'PERCENT' | 'FIXED')}>
                  <option value="PERCENT">Процент (%)</option>
                  <option value="FIXED">Сумма (₽)</option>
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Stack>
            <Stack gap={1}>
              <Text fontSize="xs" color="fg.muted">{type === 'PERCENT' ? 'Процент 1-100' : 'Сумма в ₽'}</Text>
              <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} />
            </Stack>
          </Flex>
          <Flex gap={3} wrap="wrap">
            <Stack gap={1}>
              <Text fontSize="xs" color="fg.muted">Мин. заказ (₽), необязательно</Text>
              <Input type="number" value={minOrderAmount} onChange={(e) => setMinOrderAmount(e.target.value)} />
            </Stack>
            <Stack gap={1}>
              <Text fontSize="xs" color="fg.muted">Макс. использований, необязательно</Text>
              <Input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
            </Stack>
            <Stack gap={1}>
              <Text fontSize="xs" color="fg.muted">Срок действия до</Text>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </Stack>
          </Flex>
          <HStack gap={2}>
            <Button colorPalette="brand" onClick={create} loading={isPending}>Создать</Button>
            <Button
              variant="ghost"
              onClick={() => {
                reset()
                setCreating(false)
              }}
              disabled={isPending}
            >
              Отмена
            </Button>
          </HStack>
        </Stack>
      )}

      {promos.length === 0
        ? (
          <Box p={12} bg="bg.subtle" borderRadius="xl" textAlign="center">
            <Text color="fg.muted">Промокодов нет</Text>
          </Box>
        )
        : (
          <Table.Root size="md" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Код</Table.ColumnHeader>
                <Table.ColumnHeader>Скидка</Table.ColumnHeader>
                <Table.ColumnHeader>Использований</Table.ColumnHeader>
                <Table.ColumnHeader>До</Table.ColumnHeader>
                <Table.ColumnHeader>Статус</Table.ColumnHeader>
                <Table.ColumnHeader />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {promos.map((p) => (
                <Table.Row key={p.id}>
                  <Table.Cell fontFamily="mono" fontWeight="semibold">{p.code}</Table.Cell>
                  <Table.Cell>
                    {p.type === 'PERCENT' ? `${p.value}%` : `${(p.value / 100).toFixed(0)} ₽`}
                  </Table.Cell>
                  <Table.Cell>
                    {p.usedCount}
                    {p.maxUses ? ` / ${p.maxUses}` : ''}
                  </Table.Cell>
                  <Table.Cell>{p.validUntil ?? '—'}</Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={p.isActive ? 'green' : 'gray'}>
                      {p.isActive ? 'Активен' : 'Выключен'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <HStack gap={1}>
                      <Button
                        size="xs"
                        variant="outline"
                        loading={isPending}
                        onClick={() => {
                          startTransition(async () => {
                            await setPromoActiveAction(p.id, !p.isActive)
                            router.refresh()
                          })
                        }}
                      >
                        {p.isActive ? 'Выключить' : 'Включить'}
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="red"
                        loading={isPending}
                        onClick={() => {
                          if (!confirm('Удалить промокод?')) return
                          startTransition(async () => {
                            await deletePromoAction(p.id)
                            router.refresh()
                          })
                        }}
                      >
                        ✕
                      </Button>
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
    </Stack>
  )
}
