'use client'

/**
 * Секция привязки поэта к аккаунту — на странице поэта в админке.
 * Три состояния: привязан, есть заявка (pending), нет привязки.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { approveClaimAction, rejectClaimAction } from '@/app/admin/_actions/player-link.action'
import { adminLinkPlayerToUserAction, adminUnlinkPlayerAction } from '@/app/admin/teams/_actions/roster-admin.action'
import { Badge, Box, Button, Flex, Heading, HStack, Input, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuCheck, LuLink, LuUnlink, LuX } from 'react-icons/lu'

interface PlayerLinkSectionProps {
  playerId: string
  /** Привязанный пользователь */
  user: { id: string; name: string | null; email: string } | null
  /** Пользователь, подавший заявку "Это я" */
  pendingUser: { id: string; name: string | null; email: string } | null
}

export function PlayerLinkSection({ playerId, user, pendingUser }: PlayerLinkSectionProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  /** Привязать по email */
  const handleLink = async () => {
    if (!email.trim()) {
      return
    }
    setLoading(true)
    try {
      const result = await adminLinkPlayerToUserAction({ playerId, email: email.trim() })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Профиль привязан' })
        setEmail('')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  /** Отвязать */
  const handleUnlink = async () => {
    setLoading(true)
    try {
      const result = await adminUnlinkPlayerAction({ playerId })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Привязка снята' })
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  /** Одобрить заявку */
  const handleApprove = async () => {
    setLoading(true)
    try {
      const result = await approveClaimAction({ playerId })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Заявка одобрена — профиль привязан' })
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  /** Отклонить заявку */
  const handleReject = async () => {
    setLoading(true)
    try {
      const result = await rejectClaimAction({ playerId })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Заявка отклонена' })
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px" borderColor="border.muted">
      <Heading size="sm" mb={3}>
        Привязка аккаунта
      </Heading>

      {/* Состояние: привязан */}
      {user && (
        <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
          <HStack gap={2}>
            <Badge colorPalette="green">Привязан</Badge>
            <Link href={`/admin/users/${user.id}`}>
              <Text fontSize="sm" color="brand.fg" _hover={{ textDecoration: 'underline' }}>
                {user.name ?? user.email}
              </Text>
            </Link>
            <Text fontSize="xs" color="fg.muted">
              {user.email}
            </Text>
          </HStack>
          <Button size="sm" variant="outline" colorPalette="red" onClick={handleUnlink} loading={loading}>
            <LuUnlink size={14} />
            Отвязать
          </Button>
        </Flex>
      )}

      {/* Состояние: есть pending заявка */}
      {!user && pendingUser && (
        <VStack align="stretch" gap={3}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
            <HStack gap={2}>
              <Badge colorPalette="yellow">Заявка &quot;Это я&quot;</Badge>
              <Link href={`/admin/users/${pendingUser.id}`}>
                <Text fontSize="sm" color="brand.fg" _hover={{ textDecoration: 'underline' }}>
                  {pendingUser.name ?? pendingUser.email}
                </Text>
              </Link>
              <Text fontSize="xs" color="fg.muted">
                {pendingUser.email}
              </Text>
            </HStack>
            <HStack gap={1}>
              <Button size="sm" colorPalette="green" onClick={handleApprove} loading={loading}>
                <LuCheck size={14} />
                Подтвердить
              </Button>
              <Button size="sm" colorPalette="red" variant="outline" onClick={handleReject} loading={loading}>
                <LuX size={14} />
                Отклонить
              </Button>
            </HStack>
          </Flex>
        </VStack>
      )}

      {/* Состояние: нет привязки */}
      {!user && !pendingUser && (
        <VStack align="stretch" gap={2}>
          <Text fontSize="sm" color="fg.muted">
            Профиль не привязан к аккаунту
          </Text>
          <Flex gap={2} align="center">
            <Input
              size="sm"
              placeholder="Email пользователя"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxW="300px"
              onKeyDown={(e) => e.key === 'Enter' && handleLink()}
            />
            <Button size="sm" colorPalette="brand" onClick={handleLink} loading={loading} disabled={!email.trim()}>
              <LuLink size={14} />
              Привязать
            </Button>
          </Flex>
        </VStack>
      )}
    </Box>
  )
}
