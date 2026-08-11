'use client'

/**
 * Модерация заявок на привязку профиля ("Это я") — админка.
 * Показывает поэтов с pendingUserId, позволяет одобрить или отклонить
 * через диалог подтверждения с деталями заявки.
 */

import { EmptyState } from '@/app/_components/empty-state'
import { toaster } from '@/app/_components/ui/toaster'
import { approveClaimAction, getPendingClaimsAction, rejectClaimAction } from '@/app/admin/_actions/player-link.action'
import { AdminCard, AdminCardRow } from '@/app/admin/_components/admin-card'
import { AdminResponsiveList } from '@/app/admin/_components/admin-responsive-list'
import { formatDateNumeric } from '@/lib/format-date'
import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  Separator,
  Spinner,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { LuArrowLeft, LuArrowRight, LuCheck, LuLink, LuUser, LuX } from 'react-icons/lu'

interface PendingClaim {
  id: string
  name: string
  slug: string
  photo: string | null
  pendingUserId: string | null
  updatedAt: string
  city: { name: string } | null
  pendingUser: { id: string; name: string | null; email: string } | null
}

/** Тип действия в диалоге подтверждения */
type ConfirmAction = { type: 'approve'; claim: PendingClaim } | { type: 'reject'; claim: PendingClaim }

export default function ClaimsPage() {
  const [claims, setClaims] = useState<PendingClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadClaims = useCallback(async () => {
    setLoading(true)
    const result = await getPendingClaimsAction()
    if ('data' in result) {
      setClaims(result.data as PendingClaim[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadClaims()
  }, [loadClaims])

  const handleConfirm = async () => {
    if (!confirmAction) { return }
    setProcessing(true)
    try {
      if (confirmAction.type === 'approve') {
        const result = await approveClaimAction({ playerId: confirmAction.claim.id })
        if ('error' in result) {
          toaster.error({ title: String(result.error) })
        } else {
          toaster.success({ title: 'Заявка одобрена — профиль привязан' })
        }
      } else {
        const result = await rejectClaimAction({ playerId: confirmAction.claim.id })
        if ('error' in result) {
          toaster.error({ title: String(result.error) })
        } else {
          toaster.success({ title: 'Заявка отклонена' })
        }
      }
      setConfirmAction(null)
      setRejectReason('')
      loadClaims()
    } finally {
      setProcessing(false)
    }
  }

  const closeDialog = () => {
    setConfirmAction(null)
    setRejectReason('')
  }

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <HStack gap={3}>
          <Link href="/admin/moderation">
            <Button variant="ghost" size="sm" minW="44px" minH="44px">
              <LuArrowLeft size={16} />
            </Button>
          </Link>
          <Heading size="lg">Заявки на привязку профиля</Heading>
          {claims.length > 0 && (
            <Badge colorPalette="yellow" size="sm">
              {claims.length}
            </Badge>
          )}
        </HStack>
      </Flex>

      {/* Диалог подтверждения */}
      {confirmAction && (
        <Box bg="bg.panel" borderWidth="1px" borderColor="border.muted" borderRadius="xl" p={5}>
          <Flex justify="space-between" align="center" mb={4}>
            <HStack gap={2}>
              {confirmAction.type === 'approve' ? <LuLink size={18} /> : <LuX size={18} />}
              <Text fontWeight="bold">
                {confirmAction.type === 'approve' ? 'Подтверждение привязки' : 'Отклонение заявки'}
              </Text>
            </HStack>
            <Button variant="ghost" size="sm" onClick={closeDialog}>
              <LuX size={16} />
            </Button>
          </Flex>

          {/* Карточка: Поэт → Пользователь */}
          <Flex
            direction={{ base: 'column', sm: 'row' }}
            gap={4}
            align={{ base: 'stretch', sm: 'center' }}
            bg="bg.subtle"
            borderRadius="lg"
            p={4}
            mb={4}
          >
            {/* Поэт */}
            <VStack gap={2} flex={1} align="center">
              {confirmAction.claim.photo
                ? (
                  <Image
                    src={`/api/files/${confirmAction.claim.photo}`}
                    alt={confirmAction.claim.name}
                    width={64}
                    height={64}
                    style={{ borderRadius: '50%', objectFit: 'cover', width: 64, height: 64 }}
                  />
                )
                : (
                  <Avatar.Root size="lg">
                    <Avatar.Fallback name={confirmAction.claim.name} />
                  </Avatar.Root>
                )}
              <VStack gap={0}>
                <Text fontWeight="medium" textAlign="center">
                  {confirmAction.claim.name}
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  {confirmAction.claim.city?.name ?? 'Без города'}
                </Text>
              </VStack>
            </VStack>

            {/* Стрелка */}
            <Flex justify="center" align="center" display={{ base: 'none', sm: 'flex' }}>
              <LuArrowRight size={24} />
            </Flex>

            {/* Пользователь */}
            <VStack gap={2} flex={1} align="center">
              <Avatar.Root size="lg">
                <Avatar.Fallback>
                  <LuUser size={24} />
                </Avatar.Fallback>
              </Avatar.Root>
              <VStack gap={0}>
                <Text fontWeight="medium" textAlign="center">
                  {confirmAction.claim.pendingUser?.name ?? 'Без имени'}
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  {confirmAction.claim.pendingUser?.email ?? '—'}
                </Text>
              </VStack>
            </VStack>
          </Flex>

          {/* Дата заявки */}
          <Text fontSize="sm" color="fg.muted" mb={3}>
            Заявка подана: {formatDateNumeric(confirmAction.claim.updatedAt)}
          </Text>

          <Separator mb={4} />

          {/* Причина отклонения (только для reject) */}
          {confirmAction.type === 'reject' && (
            <Box mb={4}>
              <Text fontSize="sm" fontWeight="medium" mb={1}>
                Причина отказа (необязательно)
              </Text>
              <Input
                placeholder="Например: профиль принадлежит другому человеку"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                size="sm"
              />
            </Box>
          )}

          {/* Предупреждение для approve */}
          {confirmAction.type === 'approve' && (
            <Box bg="green.subtle" borderRadius="md" px={3} py={2} mb={4}>
              <Text fontSize="sm" color="green.fg">
                Профиль поэта будет привязан к аккаунту пользователя. Поэт получит доступ к личному кабинету.
              </Text>
            </Box>
          )}

          {/* Кнопки */}
          <Flex gap={2} justify="flex-end">
            <Button variant="outline" size="sm" onClick={closeDialog} disabled={processing}>
              Отмена
            </Button>
            <Button
              colorPalette={confirmAction.type === 'approve' ? 'green' : 'red'}
              size="sm"
              onClick={handleConfirm}
              loading={processing}
            >
              {confirmAction.type === 'approve' ? 'Подтвердить привязку' : 'Отклонить заявку'}
            </Button>
          </Flex>
        </Box>
      )}

      {loading
        ? (
          <Flex justify="center" py={12}>
            <Spinner size="lg" />
          </Flex>
        )
        : claims.length === 0
        ? (
          <EmptyState>
            <Text color="fg.muted">Нет заявок на привязку</Text>
          </EmptyState>
        )
        : (
          <AdminResponsiveList
            items={claims}
            renderCard={(claim) => (
              <AdminCard key={claim.id}>
                <Flex gap={3} align="center" mb={2}>
                  {claim.photo
                    ? (
                      <Image
                        src={`/api/files/${claim.photo}`}
                        alt={claim.name}
                        width={40}
                        height={40}
                        style={{ borderRadius: '50%', objectFit: 'cover', width: 40, height: 40 }}
                      />
                    )
                    : (
                      <Avatar.Root size="sm">
                        <Avatar.Fallback name={claim.name} />
                      </Avatar.Root>
                    )}
                  <Box flex={1}>
                    <Link href={`/admin/players/${claim.id}`}>
                      <Text fontWeight="semibold" color="brand.fg" _hover={{ textDecoration: 'underline' }}>
                        {claim.name}
                      </Text>
                    </Link>
                    {claim.city && (
                      <Text fontSize="xs" color="fg.muted">
                        {claim.city.name}
                      </Text>
                    )}
                  </Box>
                </Flex>
                {claim.pendingUser && (
                  <AdminCardRow label="Пользователь">
                    <VStack align="end" gap={0}>
                      <Text fontSize="sm">{claim.pendingUser.name ?? '—'}</Text>
                      <Text fontSize="xs" color="fg.muted">
                        {claim.pendingUser.email}
                      </Text>
                    </VStack>
                  </AdminCardRow>
                )}
                <AdminCardRow label="Дата">
                  <Text fontSize="sm" color="fg.muted">
                    {formatDateNumeric(claim.updatedAt)}
                  </Text>
                </AdminCardRow>
                <Flex gap={2} pt={3} mt={2} borderTopWidth="1px" borderColor="border.muted" justify="flex-end">
                  <Button
                    size="sm"
                    colorPalette="green"
                    onClick={() => setConfirmAction({ type: 'approve', claim })}
                    disabled={processing || confirmAction !== null}
                  >
                    <LuCheck size={14} /> Принять
                  </Button>
                  <Button
                    size="sm"
                    colorPalette="red"
                    variant="outline"
                    onClick={() => setConfirmAction({ type: 'reject', claim })}
                    disabled={processing || confirmAction !== null}
                  >
                    <LuX size={14} />
                  </Button>
                </Flex>
              </AdminCard>
            )}
            tableContent={
              <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" overflow="hidden">
                <Box overflowX="auto">
                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>Поэт</Table.ColumnHeader>
                        <Table.ColumnHeader>Пользователь</Table.ColumnHeader>
                        <Table.ColumnHeader display={{ base: 'none', md: 'table-cell' }}>Город</Table.ColumnHeader>
                        <Table.ColumnHeader display={{ base: 'none', md: 'table-cell' }}>Дата</Table.ColumnHeader>
                        <Table.ColumnHeader w="180px" />
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {claims.map((claim) => (
                        <Table.Row key={claim.id}>
                          <Table.Cell>
                            <HStack gap={2}>
                              {claim.photo
                                ? (
                                  <Image
                                    src={`/api/files/${claim.photo}`}
                                    alt={claim.name}
                                    width={32}
                                    height={32}
                                    style={{ borderRadius: '50%', objectFit: 'cover', width: 32, height: 32 }}
                                  />
                                )
                                : (
                                  <Avatar.Root size="sm">
                                    <Avatar.Fallback name={claim.name} />
                                  </Avatar.Root>
                                )}
                              <Link href={`/admin/players/${claim.id}`}>
                                <Text fontWeight="medium" color="brand.fg" _hover={{ textDecoration: 'underline' }}>
                                  {claim.name}
                                </Text>
                              </Link>
                            </HStack>
                          </Table.Cell>
                          <Table.Cell>
                            {claim.pendingUser
                              ? (
                                <VStack align="start" gap={0}>
                                  <Link href={`/admin/users/${claim.pendingUser.id}`}>
                                    <Text fontSize="sm" color="brand.fg" _hover={{ textDecoration: 'underline' }}>
                                      {claim.pendingUser.name ?? '—'}
                                    </Text>
                                  </Link>
                                  <Text fontSize="xs" color="fg.muted">
                                    {claim.pendingUser.email}
                                  </Text>
                                </VStack>
                              )
                              : (
                                <Text fontSize="sm" color="fg.muted">
                                  —
                                </Text>
                              )}
                          </Table.Cell>
                          <Table.Cell display={{ base: 'none', md: 'table-cell' }}>
                            <Text fontSize="sm" color="fg.muted">
                              {claim.city?.name ?? '—'}
                            </Text>
                          </Table.Cell>
                          <Table.Cell display={{ base: 'none', md: 'table-cell' }}>
                            <Text fontSize="sm" color="fg.muted">
                              {formatDateNumeric(claim.updatedAt)}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <HStack gap={1}>
                              <Button
                                size="sm"
                                colorPalette="green"
                                onClick={() => setConfirmAction({ type: 'approve', claim })}
                                disabled={processing || confirmAction !== null}
                              >
                                <LuCheck size={14} />
                                <Text display={{ base: 'none', md: 'inline' }}>Принять</Text>
                              </Button>
                              <Button
                                size="sm"
                                colorPalette="red"
                                variant="outline"
                                onClick={() =>
                                  setConfirmAction({ type: 'reject', claim })}
                                disabled={processing || confirmAction !== null}
                              >
                                <LuX size={14} />
                              </Button>
                            </HStack>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              </Box>
            }
          />
        )}
    </VStack>
  )
}
