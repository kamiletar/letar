'use client'

import { useIsPsychologist } from '@/app/_hooks/use-psychologist'
import { useSession } from '@/lib/auth-client'
import { Button, Card, Container, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { LuBriefcase, LuMessageSquare, LuUsers } from 'react-icons/lu'
import { getClientsListAction } from '../_actions/cabinet.action'
import { becomePsychologistAction } from '../_actions/psychologist.action'
import { FilteredClientsTable } from './_components/filtered-clients-table'
import { MessageComposer } from './_components/message-composer'

type ClientItem = Awaited<ReturnType<typeof getClientsListAction>>['data'][number]

/**
 * Кабинет психолога — список клиентов
 */
export default function CabinetPage() {
  const { data: session, refetch } = useSession()
  const { isPsychologist } = useIsPsychologist()
  const t = useTranslations('cabinet')

  const [clients, setClients] = useState<ClientItem[]>([])
  const [loading, setLoading] = useState(true)
  const [becomingPsychologist, setBecomingPsychologist] = useState(false)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const activeCount = clients.filter((c) => c.status === 'ACTIVE').length

  useEffect(() => {
    if (isPsychologist) {
      getClientsListAction().then((result) => {
        setClients(result.data)
        setLoading(false)
      })
    } else {
      // Ветка синхронизации с внешним источником роли (isPsychologist приходит из
      // хука/сессии), для не-психолога сразу снимаем индикатор загрузки клиентов
      // oxlint-disable-next-line react/set-state-in-effect
      setLoading(false)
    }
  }, [isPsychologist])

  const handleBecomePsychologist = async () => {
    setBecomingPsychologist(true)
    const result = await becomePsychologistAction()
    if (result.error) {
      setBecomingPsychologist(false)
      return
    }
    // Обновляем сессию, минуя cookie cache со старыми ролями,
    // затем перезагружаем страницу — гарантирует обновление всех хуков useSession
    await refetch({ query: { disableCookieCache: true } })
    window.location.reload()
  }

  if (!session?.user) {
    return (
      <Container maxW="4xl" py={12}>
        <Text color="fg.muted">Войдите для доступа к кабинету</Text>
      </Container>
    )
  }

  // Не психолог — показываем блок самоназначения
  if (!isPsychologist) {
    return (
      <Container maxW="2xl" py={12}>
        <Card.Root variant="outline">
          <Card.Body>
            <VStack gap={4} align="start">
              <HStack gap={2}>
                <LuBriefcase size={24} />
                <Heading size="lg">{t('title')}</Heading>
              </HStack>
              <Text>{t('becomePsychologistDesc')}</Text>
              <Button colorPalette="brand" onClick={handleBecomePsychologist} loading={becomingPsychologist}>
                <LuBriefcase size={16} />
                {t('becomePsychologist')}
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Container>
    )
  }

  return (
    <Container maxW="4xl" py={12}>
      <VStack gap={6} align="start" w="100%">
        <HStack gap={2}>
          <LuUsers size={24} />
          <Heading size="xl">{t('title')}</Heading>
        </HStack>

        {loading
          ? (
            <HStack gap={2} color="fg.muted">
              <Spinner size="sm" />
              <Text>Загрузка...</Text>
            </HStack>
          )
          : clients.length === 0
          ? (
            <Card.Root w="100%" variant="outline">
              <Card.Body>
                <VStack gap={2}>
                  <Text fontWeight="bold">{t('noClients')}</Text>
                  <Text fontSize="sm" color="fg.muted">
                    {t('noClientsHint')}
                  </Text>
                </VStack>
              </Card.Body>
            </Card.Root>
          )
          : (
            <VStack gap={4} align="start" w="100%">
              {/* Рассылка всем активным (волна 7.5): форма раскрывается по кнопке */}
              {activeCount > 0 && (
                <Button size="sm" variant="outline" onClick={() => setBroadcastOpen((v) => !v)}>
                  <LuMessageSquare size={14} />
                  {t('messages.writeAll', { count: activeCount })}
                </Button>
              )}
              {broadcastOpen && <MessageComposer onSent={() => setBroadcastOpen(false)} />}
              <FilteredClientsTable clients={clients} />
            </VStack>
          )}
      </VStack>
    </Container>
  )
}
