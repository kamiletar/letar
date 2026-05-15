'use client'

import { Box, Button, HStack, Spinner, Tabs, Text, VStack } from '@chakra-ui/react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { LuHandshake, LuInbox, LuPlus } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

import {
  getIncomingRequestsAction,
  getPartnershipsAction,
  type PartnershipSummary,
  respondPartnershipAction,
  updatePartnershipStatusAction,
} from '../_actions/partnership.action'
import { IncomingRequestCard } from './_components/incoming-request-card'
import { PartnershipsList } from './_components/partnerships-list'

/**
 * Страница партнёрств автошколы
 */
export default function SchoolPartnershipsPage() {
  const params = useParams()
  const router = useRouter()
  const schoolId = params.schoolId as string

  const [partnerships, setPartnerships] = useState<PartnershipSummary[]>([])
  const [incomingRequests, setIncomingRequests] = useState<PartnershipSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingId, setLoadingId] = useState<string | undefined>()

  // Загрузка данных
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [partnershipsResult, requestsResult] = await Promise.all([
        getPartnershipsAction(schoolId),
        getIncomingRequestsAction(schoolId),
      ])

      if (partnershipsResult.success) {
        setPartnerships(partnershipsResult.partnerships)
      }
      if (requestsResult.success) {
        setIncomingRequests(requestsResult.requests)
      }
    } catch (error) {
      console.error('Ошибка загрузки партнёрств:', error)
      toaster.error({ title: 'Ошибка загрузки партнёрств' })
    } finally {
      setIsLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Обработчики для входящих запросов
  const handleAcceptRequest = async (partnershipId: string) => {
    setLoadingId(partnershipId)
    try {
      const result = await respondPartnershipAction(partnershipId, true)
      if (result.success) {
        toaster.success({ title: 'Партнёрство принято' })
        loadData()
      } else {
        toaster.error({ title: result.message ?? 'Ошибка принятия партнёрства' })
      }
    } catch {
      toaster.error({ title: 'Ошибка принятия партнёрства' })
    } finally {
      setLoadingId(undefined)
    }
  }

  const handleRejectRequest = async (partnershipId: string) => {
    setLoadingId(partnershipId)
    try {
      const result = await respondPartnershipAction(partnershipId, false)
      if (result.success) {
        toaster.success({ title: 'Запрос отклонён' })
        loadData()
      } else {
        toaster.error({ title: result.message ?? 'Ошибка отклонения запроса' })
      }
    } catch {
      toaster.error({ title: 'Ошибка отклонения запроса' })
    } finally {
      setLoadingId(undefined)
    }
  }

  // Обработчики для действий с партнёрствами
  const handleSuspend = async (partnershipId: string) => {
    setLoadingId(partnershipId)
    try {
      const result = await updatePartnershipStatusAction({
        partnershipId,
        action: 'suspend',
      })
      if (result.success) {
        toaster.success({ title: 'Партнёрство приостановлено' })
        loadData()
      } else {
        toaster.error({ title: result.message ?? 'Ошибка приостановки' })
      }
    } catch {
      toaster.error({ title: 'Ошибка приостановки партнёрства' })
    } finally {
      setLoadingId(undefined)
    }
  }

  const handleResume = async (partnershipId: string) => {
    setLoadingId(partnershipId)
    try {
      const result = await updatePartnershipStatusAction({
        partnershipId,
        action: 'resume',
      })
      if (result.success) {
        toaster.success({ title: 'Партнёрство возобновлено' })
        loadData()
      } else {
        toaster.error({ title: result.message ?? 'Ошибка возобновления' })
      }
    } catch {
      toaster.error({ title: 'Ошибка возобновления партнёрства' })
    } finally {
      setLoadingId(undefined)
    }
  }

  const handleTerminate = async (partnershipId: string) => {
    if (!confirm('Вы уверены, что хотите расторгнуть партнёрство?')) {
      return
    }

    setLoadingId(partnershipId)
    try {
      const result = await updatePartnershipStatusAction({
        partnershipId,
        action: 'terminate',
        reason: 'Расторгнуто по инициативе школы',
      })
      if (result.success) {
        toaster.success({ title: 'Партнёрство расторгнуто' })
        loadData()
      } else {
        toaster.error({ title: result.message ?? 'Ошибка расторжения' })
      }
    } catch {
      toaster.error({ title: 'Ошибка расторжения партнёрства' })
    } finally {
      setLoadingId(undefined)
    }
  }

  if (isLoading) {
    return (
      <HStack justify="center" py={12}>
        <Spinner />
        <Text>Загрузка партнёрств...</Text>
      </HStack>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок */}
      <HStack justify="space-between">
        <Text fontSize="xl" fontWeight="semibold">
          Партнёрства с автошколами
        </Text>
        <Button colorPalette="brand" onClick={() => router.push(`/school/partnerships/${schoolId}/new`)}>
          <LuPlus />
          Новое партнёрство
        </Button>
      </HStack>

      {/* Табы */}
      <Tabs.Root defaultValue="partnerships" variant="enclosed">
        <Tabs.List>
          <Tabs.Trigger value="partnerships">
            <LuHandshake />
            Партнёрства
            {partnerships.length > 0 && (
              <Box ml={2} bg="bg.subtle" borderRadius="full" px={2} fontSize="sm">
                {partnerships.length}
              </Box>
            )}
          </Tabs.Trigger>
          <Tabs.Trigger value="incoming">
            <LuInbox />
            Входящие запросы
            {incomingRequests.length > 0 && (
              <Box
                ml={2}
                bg="yellow.subtle"
                color="yellow.fg"
                borderRadius="full"
                px={2}
                fontSize="sm"
                fontWeight="bold"
              >
                {incomingRequests.length}
              </Box>
            )}
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="partnerships">
          <PartnershipsList
            partnerships={partnerships}
            currentSchoolId={schoolId}
            onSuspend={handleSuspend}
            onResume={handleResume}
            onTerminate={handleTerminate}
            loadingId={loadingId}
          />
        </Tabs.Content>

        <Tabs.Content value="incoming">
          {incomingRequests.length === 0 ? (
            <VStack py={12}>
              <LuInbox size={48} />
              <Text color="fg.muted">Нет входящих запросов</Text>
            </VStack>
          ) : (
            <VStack gap={4} align="stretch">
              {incomingRequests.map((request) => (
                <IncomingRequestCard
                  key={request.id}
                  request={request}
                  onAccept={() => handleAcceptRequest(request.id)}
                  onReject={() => handleRejectRequest(request.id)}
                  isLoading={loadingId === request.id}
                />
              ))}
            </VStack>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </VStack>
  )
}
