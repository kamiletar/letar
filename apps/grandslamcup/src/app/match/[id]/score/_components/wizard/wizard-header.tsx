'use client'

/**
 * Тонкая шапка wizard'а: название матча, компактный счёт, кнопка возврата
 * в классический режим (fallback на старый scorer-client.tsx).
 */

import { Badge, Box, Button, Flex, HStack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { LuLayoutGrid } from 'react-icons/lu'
import type { WizardStep } from './compute-wizard-step'

interface WizardHeaderProps {
  matchId: string
  scorerToken: string
  season: string
  tour: string
  venue: string | null
  homeTeamName: string
  awayTeamName: string
  homeScore: number
  awayScore: number
  currentHalf: number
  currentRound: number
  step: WizardStep
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
}

const STEP_LABELS: Record<WizardStep, string> = {
  START_MATCH: 'Старт матча',
  SELECT_JURY: 'Подключение жюри',
  COIN_FLIP: 'Жеребьёвка',
  PERFORMER_PICK: 'Выбор поэта',
  PERFORMING: 'Выступление',
  TEXT_VOTING: 'Оценка: ТЕКСТ',
  DELIVERY_VOTING: 'Оценка: ПОДАЧА',
  POET_RESULT: 'Результат поэта',
  PAIR_RESULTS: 'Результаты пары',
  HALF_SUMMARY: 'Итоги тайма',
  INTERMISSION: 'Перерыв',
  FINAL_RESULTS: 'Итоги матча',
  VICTORY_POEM: 'Победное стихотворение',
  MATCH_FINISHED: 'Матч завершён',
}

export function WizardHeader({
  matchId,
  scorerToken,
  season,
  tour,
  venue,
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  currentHalf,
  currentRound,
  step,
  connectionStatus,
}: WizardHeaderProps) {
  return (
    <Box
      position="sticky"
      top={0}
      zIndex={5}
      bg="bg.panel"
      borderBottomWidth="1px"
      borderColor="border.muted"
      px={4}
      py={2}
      shadow="sm"
    >
      <Flex justify="space-between" align="center" gap={2} wrap="wrap">
        <Box minW={0} flex={1}>
          <Text fontSize="xs" color="fg.muted" truncate>
            {season} · {tour}
            {venue ? ` · ${venue}` : ''}
          </Text>
          <Text fontWeight="bold" fontSize="sm" truncate>
            {homeTeamName} {homeScore} : {awayScore} {awayTeamName}
          </Text>
        </Box>
        <HStack gap={2} flexShrink={0}>
          <Badge colorPalette="blue" size="sm">
            Тайм {currentHalf} · Раунд {currentRound}
          </Badge>
          <Badge
            colorPalette={
              connectionStatus === 'connected' ? 'green' : connectionStatus === 'connecting' ? 'yellow' : 'red'
            }
            size="sm"
          >
            {connectionStatus === 'connected' ? '●' : connectionStatus === 'connecting' ? '○' : '✕'}
          </Badge>
          <Button asChild size="xs" variant="ghost" title="Классический режим">
            <Link href={`/match/${matchId}/score?token=${scorerToken}&mode=classic`}>
              <LuLayoutGrid size={14} /> Классика
            </Link>
          </Button>
        </HStack>
      </Flex>
      <Text fontSize="xs" color="brand.fg" mt={1} fontWeight="medium">
        → {STEP_LABELS[step]}
      </Text>
    </Box>
  )
}
