'use client'

import { Badge, Box, Button, Flex, HStack, Input, Stack, Table, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  createCertificateAction,
  deactivateCertificateAction,
} from '../../_actions/certificates.action'

interface CertificateView {
  id: string
  code: string
  initialAmount: number
  currentBalance: number
  issuedToEmail: string | null
  expiresAt: string
  isActive: boolean
}

export function CertificatesManager({ certificates }: { certificates: CertificateView[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [creating, setCreating] = useState(false)
  const [amount, setAmount] = useState('5000')
  const [email, setEmail] = useState('')
  const [expiry, setExpiry] = useState('12')
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ code: string; pin: string } | null>(null)

  function create() {
    setError(null)
    setCreated(null)
    startTransition(async () => {
      const result = await createCertificateAction({
        amountRub: Number(amount),
        issuedToEmail: email || null,
        expiryMonths: Number(expiry),
        sendEmail: !!email,
      })
      if (!result.ok) {
        setError(result.error ?? 'Не удалось создать')
        return
      }
      setCreated({ code: result.code!, pin: result.pin! })
      router.refresh()
    })
  }

  return (
    <Stack gap={6}>
      {!creating && (
        <Button alignSelf="flex-start" colorPalette="brand" onClick={() => setCreating(true)}>
          + Выпустить сертификат
        </Button>
      )}

      {creating && (
        <Stack gap={3} p={5} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.surface">
          <Text fontWeight="semibold">Новый сертификат</Text>
          {error && (
            <Box bg="red.subtle" color="red.fg" p={3} borderRadius="md" fontSize="sm">
              {error}
            </Box>
          )}
          {created && (
            <Box bg="green.subtle" color="green.fg" p={4} borderRadius="md">
              <Text fontWeight="semibold" mb={2}>
                Сертификат выпущен — сохраните данные!
              </Text>
              <Text fontFamily="mono">Код: {created.code}</Text>
              <Text fontFamily="mono">PIN: {created.pin}</Text>
              <Text fontSize="xs" mt={2}>
                Из БД достать код и PIN потом нельзя — только хэш PIN-а.
              </Text>
            </Box>
          )}
          <Flex gap={3} wrap="wrap">
            <Stack gap={1}>
              <Text fontSize="xs" color="fg.muted">Номинал (₽)</Text>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Stack>
            <Stack gap={1} flex="1" minW="200px">
              <Text fontSize="xs" color="fg.muted">Email получателя (необязательно — отправит код+PIN)</Text>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Stack>
            <Stack gap={1}>
              <Text fontSize="xs" color="fg.muted">Срок (мес.)</Text>
              <Input type="number" min={1} max={60} value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </Stack>
          </Flex>
          <HStack gap={2}>
            <Button colorPalette="brand" onClick={create} loading={isPending}>Выпустить</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setCreating(false)
                setCreated(null)
                setError(null)
              }}
              disabled={isPending}
            >
              Закрыть
            </Button>
          </HStack>
        </Stack>
      )}

      {certificates.length === 0
        ? (
          <Box p={12} bg="bg.subtle" borderRadius="xl" textAlign="center">
            <Text color="fg.muted">Сертификатов нет</Text>
          </Box>
        )
        : (
          <Table.Root size="md" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Код</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Номинал</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Баланс</Table.ColumnHeader>
                <Table.ColumnHeader>Email</Table.ColumnHeader>
                <Table.ColumnHeader>Срок</Table.ColumnHeader>
                <Table.ColumnHeader>Статус</Table.ColumnHeader>
                <Table.ColumnHeader />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {certificates.map((c) => (
                <Table.Row key={c.id}>
                  <Table.Cell fontFamily="mono" fontSize="sm">{c.code}</Table.Cell>
                  <Table.Cell textAlign="end">{(c.initialAmount / 100).toFixed(0)} ₽</Table.Cell>
                  <Table.Cell textAlign="end" fontWeight="semibold">{(c.currentBalance / 100).toFixed(0)} ₽</Table.Cell>
                  <Table.Cell fontSize="sm" color="fg.muted">{c.issuedToEmail ?? '—'}</Table.Cell>
                  <Table.Cell fontSize="sm">{c.expiresAt}</Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={c.isActive ? 'green' : 'gray'}>
                      {c.isActive ? 'Активен' : 'Выключен'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {c.isActive && (
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette="red"
                        loading={isPending}
                        onClick={() => {
                          if (!confirm('Деактивировать сертификат?')) return
                          startTransition(async () => {
                            await deactivateCertificateAction(c.id)
                            router.refresh()
                          })
                        }}
                      >
                        Деактивировать
                      </Button>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
    </Stack>
  )
}
