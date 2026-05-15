'use client'

import { Box, Text } from '@chakra-ui/react'
import { useDeclarativeForm } from '@letar/forms'
import { useTranslations } from 'next-intl'
import { useCallback } from 'react'
import type { SlotOption } from '../_actions/get-available-slots.action'
import { SlotPicker } from './slot-picker'

/**
 * Обёртка SlotPicker для интеграции с декларативным Form API
 */
export function FormSlotPicker() {
  const t = useTranslations('consulting')
  const { form } = useDeclarativeForm()

  const handleSlotChange = useCallback(
    (slot: SlotOption | null) => {
      form.setFieldValue('preferredTime', slot?.value || '')
    },
    [form]
  )

  return (
    <Box>
      <Text mb={2} fontWeight="medium" fontSize="sm">
        {t('form.preferredTime')}
      </Text>
      <form.Subscribe selector={(state: { values: { preferredTime?: string } }) => state.values.preferredTime || ''}>
        {(preferredTime: string) => <SlotPicker value={preferredTime} onChange={handleSlotChange} daysAhead={14} />}
      </form.Subscribe>
    </Box>
  )
}
