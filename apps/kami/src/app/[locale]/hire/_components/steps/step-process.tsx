'use client'

import { KamiForm } from '@/kami-form'
import { Card, Heading, Stack, Text } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'

/**
 * Шаг 6: Процесс найма
 */
export function StepProcess() {
  const t = useTranslations('hire.fields')

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="lg">{t('processTitle')}</Heading>
        <Text color="fg.muted">{t('processDescription')}</Text>
      </Card.Header>
      <Card.Body>
        <Stack gap={4}>
          <KamiForm.Field.Textarea
            name="hiringProcess"
            label={t('hiringProcess')}
            placeholder={t('hiringProcessPlaceholder')}
            rows={4}
          />
          <KamiForm.Field.String name="startDate" label={t('startDate')} placeholder={t('startDatePlaceholder')} />
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
