'use client'

import { Box, Grid } from '@chakra-ui/react'
import { useState } from 'react'
import type { AbsenceData } from '../_actions/absences.action'
import type { CustomBreakData } from '../_actions/custom-breaks.action'
import type { DEFAULT_SCHEDULE_SETTINGS } from '../_schemas/schedule-settings.schema'
import { AbsencesEditor } from './absences-editor'
import { CustomBreaksEditor } from './custom-breaks-editor'
import { GenerateSlotsSection, type GenerateSlotsSectionProps } from './generate-slots-section'
import { ScheduleSettingsForm } from './schedule-settings-form'

interface ScheduleSettingsClientProps {
  settings: typeof DEFAULT_SCHEDULE_SETTINGS | null
  customBreaks: CustomBreakData[]
  slotsStats: GenerateSlotsSectionProps['stats']
  defaultPlanningHorizon: number
  absences: AbsenceData[]
}

/**
 * Клиентский wrapper для управления состоянием dirty формы
 * и блокировки генерации слотов при несохранённых изменениях
 */
export function ScheduleSettingsClient({
  settings,
  customBreaks,
  slotsStats,
  defaultPlanningHorizon,
  absences,
}: ScheduleSettingsClientProps) {
  const [isDirty, setIsDirty] = useState(false)

  return (
    <>
      {/* Секция генерации слотов */}
      <GenerateSlotsSection
        hasSettings={!!settings}
        planningHorizon={settings?.planningHorizon ?? defaultPlanningHorizon}
        stats={slotsStats}
        isDirty={isDirty}
      />

      {/* Форма настроек */}
      <Box bg="bg.panel" p={6} borderRadius="lg" shadow="sm" borderWidth="1px">
        <ScheduleSettingsForm defaultValue={settings} onDirtyChange={setIsDirty} />
      </Box>

      {/* Перерывы и отсутствия в две колонки на lg */}
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
        {/* Перерывы */}
        <Box bg="bg.panel" p={6} borderRadius="lg" shadow="sm" borderWidth="1px">
          <CustomBreaksEditor initialBreaks={customBreaks} />
        </Box>

        {/* Отсутствия (отпуска, больничные) */}
        <Box bg="bg.panel" p={6} borderRadius="lg" shadow="sm" borderWidth="1px">
          <AbsencesEditor initialAbsences={absences} />
        </Box>
      </Grid>
    </>
  )
}
