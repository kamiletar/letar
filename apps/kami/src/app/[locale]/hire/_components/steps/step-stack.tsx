'use client'

import { KamiForm } from '@/kami-form'
import { Card, Heading, Stack, Text } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { projectTypeOptions } from '../../_schemas/hire.schema'

/**
 * Шаг 3: Технологический стек
 */
export function StepStack() {
  const t = useTranslations('hire.fields')

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="lg">{t('stackTitle')}</Heading>
        <Text color="fg.muted">{t('stackDescription')}</Text>
      </Card.Header>
      <Card.Body>
        <Stack gap={4}>
          <KamiForm.Field.Tags name="techStack" label={t('techStack')} placeholder={t('techStackPlaceholder')} />
          <KamiForm.Field.RadioGroup name="projectType" label={t('projectType')} options={projectTypeOptions} />
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
