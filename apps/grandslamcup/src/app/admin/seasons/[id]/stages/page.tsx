'use client'

/**
 * Управление этапами турнира — админка сезона.
 * Для SWISS: создание этапов, генерация раундов с превью, сетка плей-офф.
 */

import { EmptyState } from '@/app/_components/empty-state'
import { toaster } from '@/app/_components/ui/toaster'
import type { SwissTeamRecord } from '@/lib/swiss'
import { Badge, Box, Button, Flex, Heading, HStack, Spinner, Table, Text, VStack } from '@chakra-ui/react'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { LuDices, LuGrid2X2, LuPlus, LuTrophy } from 'react-icons/lu'

import {
  createSwissStagesAction,
  generatePlayoffBracketAction,
  generateSwissRoundAction,
  getStagesAction,
  getSwissProgressAction,
  previewSwissRoundAction,
} from '../../_actions/stages.action'
import type { SwissProgress } from './_components/swiss-progress-card'
import { SwissProgressCard } from './_components/swiss-progress-card'
import { SwissRoundPreview } from './_components/swiss-round-preview'

interface StageData {
  id: string
  name: string
  type: string
  order: number
  rounds: Array<{ id: string; name: string; number: number }>
  _count: { bracketSlots: number }
}

interface PreviewPair {
  home: SwissTeamRecord
  away: SwissTeamRecord
}

interface PreviewData {
  pairs: PreviewPair[]
  byes: SwissTeamRecord[]
  roundNumber: number
}

const stageTypeLabel: Record<string, string> = {
  GROUP: 'Групповой',
  PLAYOFF_UPPER: 'Верхняя сетка',
  PLAYOFF_LOWER: 'Нижняя сетка',
  GRAND_FINAL: 'Гранд-финал',
}

const stageTypeColor: Record<string, string> = {
  GROUP: 'blue',
  PLAYOFF_UPPER: 'green',
  PLAYOFF_LOWER: 'orange',
  GRAND_FINAL: 'yellow',
}

export default function StagesPage() {
  const params = useParams()
  const seasonId = params.id as string

  const [stages, setStages] = useState<StageData[]>([])
  const [progress, setProgress] = useState<SwissProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Превью
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const loadData = useCallback(async () => {
    const [stagesResult, progressResult] = await Promise.all([
      getStagesAction(seasonId),
      getSwissProgressAction(seasonId),
    ])
    if ('data' in stagesResult) { setStages(stagesResult.data as StageData[]) }
    if ('data' in progressResult) { setProgress(progressResult.data as SwissProgress | null) }
    setLoading(false)
  }, [seasonId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateStages = async () => {
    setActionLoading('create')
    const result = await createSwissStagesAction(seasonId)
    if ('error' in result) { toaster.error({ title: String(result.error) }) }
    else {
      toaster.success({ title: 'Этапы созданы' })
      loadData()
    }
    setActionLoading(null)
  }

  // Шаг 1: превью пар
  const handlePreviewRound = async () => {
    setActionLoading('round')
    const result = await previewSwissRoundAction(seasonId)
    if ('error' in result) {
      toaster.error({ title: String(result.error) })
    } else if (result.data) {
      setPreview(result.data as PreviewData)
    }
    setActionLoading(null)
  }

  // Перегенерировать (перетасовать)
  const handleRegenerate = async () => {
    setRegenerating(true)
    const result = await previewSwissRoundAction(seasonId)
    if ('error' in result) {
      toaster.error({ title: String(result.error) })
    } else if (result.data) {
      setPreview(result.data as PreviewData)
    }
    setRegenerating(false)
  }

  // Шаг 2: подтвердить и создать
  const handleConfirm = async (pairs: Array<{ homeTeamSeasonId: string; awayTeamSeasonId: string }>) => {
    setConfirming(true)
    const result = await generateSwissRoundAction({ seasonId, pairs })
    if ('error' in result) {
      toaster.error({ title: String(result.error) })
    } else {
      const d = result.data!
      toaster.success({ title: `Тур ${d.roundNumber}: ${d.pairsCount} матчей создано` })
      setPreview(null)
      loadData()
    }
    setConfirming(false)
  }

  const handleGenerateBracket = async () => {
    setActionLoading('bracket')
    const result = await generatePlayoffBracketAction(seasonId)
    if ('error' in result) { toaster.error({ title: String(result.error) }) }
    else {
      toaster.success({ title: `Сетка создана: ${result.data?.slotsCreated} слотов` })
      loadData()
    }
    setActionLoading(null)
  }

  if (loading) {
    return (
      <Flex justify="center" py={12}>
        <Spinner size="lg" />
      </Flex>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <Heading size="lg">Этапы турнира</Heading>
        <HStack gap={2}>
          {stages.length === 0 && (
            <Button colorPalette="blue" size="sm" onClick={handleCreateStages} loading={actionLoading === 'create'}>
              <LuPlus size={16} />
              Создать этапы
            </Button>
          )}
        </HStack>
      </Flex>

      {stages.length === 0
        ? (
          <EmptyState>
            <Text color="fg.muted">Этапы ещё не созданы. Нажмите «Создать этапы» для швейцарской системы.</Text>
          </EmptyState>
        )
        : (
          <>
            {/* Прогресс текущего тура */}
            <SwissProgressCard progress={progress} />

            {/* Таблица этапов */}
            <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" overflow="hidden">
              <Box overflowX="auto">
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>#</Table.ColumnHeader>
                      <Table.ColumnHeader>Название</Table.ColumnHeader>
                      <Table.ColumnHeader>Тип</Table.ColumnHeader>
                      <Table.ColumnHeader>Туры</Table.ColumnHeader>
                      <Table.ColumnHeader>Слоты сетки</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {stages.map((stage) => (
                      <Table.Row key={stage.id}>
                        <Table.Cell>{stage.order}</Table.Cell>
                        <Table.Cell fontWeight="medium">{stage.name}</Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={stageTypeColor[stage.type] ?? 'gray'} size="sm">
                            {stageTypeLabel[stage.type] ?? stage.type}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>{stage.rounds.length}</Table.Cell>
                        <Table.Cell>{stage._count.bracketSlots || '—'}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Box>

            {/* Кнопки действий */}
            <Flex gap={3} wrap="wrap">
              <Button
                colorPalette="teal"
                size="sm"
                onClick={handlePreviewRound}
                loading={actionLoading === 'round'}
                disabled={progress !== null && !progress.allFinished && progress.totalMatches > 0}
              >
                <LuDices size={16} />
                Сгенерировать тур
              </Button>
              <Button
                colorPalette="purple"
                size="sm"
                variant="outline"
                onClick={handleGenerateBracket}
                loading={actionLoading === 'bracket'}
              >
                <LuGrid2X2 size={16} />
                Создать сетку плей-офф
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={`/admin/seasons/${seasonId}/bracket`}>
                  <LuTrophy size={16} />
                  Визуализация сетки
                </a>
              </Button>
            </Flex>
          </>
        )}

      {/* Модал превью пар */}
      {preview && (
        <SwissRoundPreview
          roundNumber={preview.roundNumber}
          pairs={preview.pairs}
          byes={preview.byes}
          onConfirm={handleConfirm}
          onRegenerate={handleRegenerate}
          onClose={() => setPreview(null)}
          confirming={confirming}
          regenerating={regenerating}
        />
      )}
    </VStack>
  )
}
