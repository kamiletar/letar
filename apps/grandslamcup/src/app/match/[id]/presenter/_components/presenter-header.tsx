'use client'

/**
 * Тонкая шапка экрана ведущего: название матча, badge шага, статус соединения, кнопка fullscreen.
 */

import { Badge, Box, Button, Flex, HStack, Text } from '@chakra-ui/react'
import { LuMaximize } from 'react-icons/lu'
import type { WizardStep } from '../../score/_components/wizard/compute-wizard-step'

const STEP_LABELS: Record<WizardStep, string> = {
  START_MATCH: 'Ожидание',
  SELECT_JURY: 'Подключение жюри',
  COIN_FLIP: 'Жеребьёвка',
  PERFORMER_PICK: 'Выбор поэта',
  PERFORMING: 'Выступление',
  TEXT_VOTING: 'Голосование: ТЕКСТ',
  DELIVERY_VOTING: 'Голосование: ПОДАЧА',
  POET_RESULT: 'Результат поэта',
  PAIR_RESULTS: 'Итоги пары',
  HALF_SUMMARY: 'Итоги тайма',
  INTERMISSION: 'Перерыв',
  FINAL_RESULTS: 'Итоги матча',
  VICTORY_POEM: 'Победное стихотворение',
  MATCH_FINISHED: 'Матч завершён',
}

interface PresenterHeaderProps {
  homeTeamName: string
  awayTeamName: string
  homeScore: number
  awayScore: number
  step: WizardStep
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  isFullscreen: boolean
  onFullscreen: () => void
}

export function PresenterHeader({
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  step,
  connectionStatus,
  isFullscreen,
  onFullscreen,
}: PresenterHeaderProps) {
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
      <Flex justify="space-between" align="center" gap={2}>
        <Box minW={0} flex={1}>
          <Text fontWeight="bold" fontSize="sm" truncate>
            {homeTeamName} {homeScore} : {awayScore} {awayTeamName}
          </Text>
          <Text fontSize="xs" color="brand.fg" mt={0.5} fontWeight="medium">
            → {STEP_LABELS[step]}
          </Text>
        </Box>
        <HStack gap={2} flexShrink={0}>
          <Badge
            colorPalette={connectionStatus === 'connected'
              ? 'green'
              : connectionStatus === 'connecting'
              ? 'yellow'
              : 'red'}
            size="sm"
          >
            {connectionStatus === 'connected' ? '●' : connectionStatus === 'connecting' ? '○' : '✕'}
          </Badge>
          {!isFullscreen && (
            <Button size="xs" variant="ghost" onClick={onFullscreen} title="Полный экран">
              <LuMaximize size={14} />
            </Button>
          )}
        </HStack>
      </Flex>
    </Box>
  )
}
