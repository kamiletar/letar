'use client'

import { Link } from '@/i18n/navigation'
import { Alert, Button, Card, Container, Heading, HStack, Input, Spinner, Text, VStack } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { LuPencil, LuSave } from 'react-icons/lu'
import { getClientDetailAction, updateDisplayNameAction } from '../../_actions/cabinet.action'
import { HexagramChart } from '../../_components/hexagram-chart'
import { PersonalityRadarChart } from '../../_components/personality-radar-chart'
import { ProfileDetails } from '../../_components/profile-details'
import { EXPERIMENTAL_SCALE_CODES, HEXAGRAM_SCALE_CODES, PERSONALITY_TYPES } from '../../_data/personality-types'
import { ExperimentalScalesBlock } from './_components/experimental-scales-block'
import { PsychologistNotes } from './_components/psychologist-notes'
import { SessionDynamicsChart } from './_components/session-dynamics-chart'

type ClientDetail = NonNullable<Awaited<ReturnType<typeof getClientDetailAction>>['data']>

/**
 * Детальная страница клиента в кабинете психолога
 */
export default function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params)
  const locale = useLocale()
  const isRu = locale === 'ru'
  const t = useTranslations('cabinet')

  const [detail, setDetail] = useState<ClientDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // DisplayName редактирование
  const [editingName, setEditingName] = useState(false)
  const [displayName, setDisplayName] = useState('')

  const loadDetail = useCallback(async () => {
    const result = await getClientDetailAction(clientId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setDetail(result.data)
      setDisplayName(result.data.link.displayName || '')
    }
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  const handleSaveDisplayName = async () => {
    if (!detail) {
      return
    }
    await updateDisplayNameAction({
      linkId: detail.link.id,
      displayName: displayName.trim() || undefined,
    })
    setEditingName(false)
    loadDetail()
  }

  // Данные для радарного чарта
  const chartData = useMemo(() => {
    if (!detail?.cumulativeScores) {
      return []
    }
    return PERSONALITY_TYPES.map((type) => {
      const label = isRu ? type.label : type.labelEn
      const archetype = isRu ? type.archetype : type.archetypeEn
      return {
        type: type.code,
        label: `${label} ${archetype}\n(${isRu ? type.clinical : type.clinicalEn})`,
        clinicalLabel: isRu ? type.clinical : type.clinicalEn,
        value: detail.cumulativeScores![type.code] ?? 0,
      }
    })
  }, [detail?.cumulativeScores, isRu])

  if (loading) {
    return (
      <Container maxW="4xl" py={12}>
        <HStack gap={2} color="fg.muted">
          <Spinner size="sm" />
          <Text>Загрузка...</Text>
        </HStack>
      </Container>
    )
  }

  if (error || !detail) {
    return (
      <Container maxW="4xl" py={12}>
        <VStack gap={4}>
          <Alert.Root status="error" variant="outline" borderRadius="md">
            <Alert.Description>{error || 'Клиент не найден'}</Alert.Description>
          </Alert.Root>
          <Button asChild variant="ghost">
            <Link href="/cabinet">{t('backToList')}</Link>
          </Button>
        </VStack>
      </Container>
    )
  }

  return (
    <Container maxW="4xl" py={12}>
      <VStack gap={6} align="start" w="100%">
        {/* Навигация назад */}
        <Button asChild variant="ghost" size="sm">
          <Link href="/cabinet">{t('backToList')}</Link>
        </Button>

        {/* Имя клиента и displayName */}
        <Card.Root w="100%" variant="outline">
          <Card.Body>
            <HStack justify="space-between" w="100%">
              <VStack align="start" gap={1}>
                <Heading size="lg">{detail.client.name || detail.client.email}</Heading>
                <Text fontSize="sm" color="fg.muted">
                  {detail.client.email}
                </Text>
                <HStack gap={2} mt={1}>
                  <Text fontSize="sm" color="fg.muted">
                    {t('totalAnswered')}: {detail.totalAnswered}
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    {t('sessions')}: {detail.sessionsHistory.length}
                  </Text>
                </HStack>
              </VStack>

              {/* DisplayName */}
              <VStack align="end" gap={1}>
                {editingName ? (
                  <HStack gap={2}>
                    <Input
                      size="sm"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t('displayName')}
                      w="200px"
                    />
                    <Button size="sm" onClick={handleSaveDisplayName}>
                      <LuSave size={14} />
                    </Button>
                  </HStack>
                ) : (
                  <HStack gap={1}>
                    <Text fontSize="sm" color="fg.muted">
                      {detail.link.displayName || t('displayName')}
                    </Text>
                    <Button size="xs" variant="ghost" onClick={() => setEditingName(true)}>
                      <LuPencil size={12} />
                    </Button>
                  </HStack>
                )}
                <Text fontSize="xs" color="fg.muted">
                  {t('displayNameHint')}
                </Text>
              </VStack>
            </HStack>
          </Card.Body>
        </Card.Root>

        {/* Радарный чарт */}
        {chartData.length > 0 && (
          <PersonalityRadarChart
            data={chartData}
            title={isRu ? 'Кумулятивный профиль' : 'Cumulative Profile'}
            color="green.500"
          />
        )}

        {/* Архитектура личности: гексаграмма триад (этап 5.2) — если клиент проходил банк v2 */}
        {detail.cumulativeScores && HEXAGRAM_SCALE_CODES.some((code) => (detail.cumulativeScores![code] ?? 0) > 0) && (
          <Card.Root w="100%" variant="outline">
            <Card.Body>
              <HexagramChart
                scores={detail.cumulativeScores}
                title={isRu ? 'Архитектура личности' : 'Personality Architecture'}
              />
            </Card.Body>
          </Card.Root>
        )}

        {/* Экспериментальные шкалы (этап 5.5) — только если клиент отвечал на их вопросы */}
        {detail.cumulativeScores &&
          EXPERIMENTAL_SCALE_CODES.some((code) => (detail.cumulativeScores![code] ?? 0) > 0) && (
            <ExperimentalScalesBlock scores={detail.cumulativeScores} />
          )}

        {/* Динамика по сессиям */}
        <SessionDynamicsChart sessions={detail.sessionsHistory} />

        {/* Текстовые детали профиля */}
        {detail.cumulativeScores && <ProfileDetails scores={detail.cumulativeScores} />}

        {/* Заметки психолога */}
        <PsychologistNotes linkId={detail.link.id} notes={detail.notes} onUpdate={loadDetail} />
      </VStack>
    </Container>
  )
}
