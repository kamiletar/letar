'use client'

import { KamiForm } from '@/kami-form'
import { Card, Heading, Stack, Text } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'

/**
 * Шаг 5: Компенсация
 */
export function StepCompensation() {
  const t = useTranslations('hire.fields')

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="lg">{t('compensationTitle')}</Heading>
        <Text color="fg.muted">{t('compensationDescription')}</Text>
      </Card.Header>
      <Card.Body>
        <Stack gap={4}>
          <KamiForm.Field.String
            name="salaryRange"
            label={t('salaryRange')}
            placeholder={t('salaryRangePlaceholder')}
          />
          <KamiForm.Field.Textarea
            name="benefits"
            label={t('benefits')}
            placeholder={t('benefitsPlaceholder')}
            rows={3}
          />
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
