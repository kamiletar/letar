'use client'

import { useIsPsychologist } from '@/app/_hooks/use-psychologist'
import { Link } from '@/i18n/navigation'
import { useSession } from '@/lib/auth-client'
import { Badge, Box, Button, Card, Container, Heading, HStack, Spinner, Table, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { LuBriefcase, LuUsers } from 'react-icons/lu'
import { getClientsListAction } from '../_actions/cabinet.action'
import { becomePsychologistAction } from '../_actions/psychologist.action'

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

  useEffect(() => {
    if (isPsychologist) {
      getClientsListAction().then((result) => {
        setClients(result.data)
        setLoading(false)
      })
    } else {
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
              <Button colorPalette="blue" onClick={handleBecomePsychologist} loading={becomingPsychologist}>
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

        {loading ? (
          <HStack gap={2} color="fg.muted">
            <Spinner size="sm" />
            <Text>Загрузка...</Text>
          </HStack>
        ) : clients.length === 0 ? (
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
        ) : (
          <Table.Root size="sm" w="100%">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>{t('clientName')}</Table.ColumnHeader>
                <Table.ColumnHeader>{t('clientEmail')}</Table.ColumnHeader>
                <Table.ColumnHeader>{t('status')}</Table.ColumnHeader>
                <Table.ColumnHeader>{t('linkedAt')}</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {clients.map((client) => (
                <Table.Row key={client.id}>
                  <Table.Cell>
                    {client.status === 'ACTIVE' ? (
                      <Box asChild fontWeight="bold" color="fg" _hover={{ textDecoration: 'underline' }}>
                        <Link href={`/cabinet/${client.clientId}`}>{client.clientName}</Link>
                      </Box>
                    ) : (
                      <Text color="fg.muted">{client.clientName}</Text>
                    )}
                  </Table.Cell>
                  <Table.Cell color="fg.muted">{client.clientEmail}</Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={client.status === 'ACTIVE' ? 'green' : 'gray'}>
                      {client.status === 'ACTIVE' ? t('active') : t('revoked')}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell color="fg.muted">{new Date(client.createdAt).toLocaleDateString()}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </VStack>
    </Container>
  )
}
