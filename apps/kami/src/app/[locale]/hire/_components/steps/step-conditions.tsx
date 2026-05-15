'use client'

import { KamiForm } from '@/kami-form'
import { Card, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { employmentTypeOptions, timezoneOptions } from '../../_schemas/hire.schema'

/**
 * Шаг 4: Условия работы
 */
export function StepConditions() {
  const t = useTranslations('hire.fields')

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="lg">{t('conditionsTitle')}</Heading>
        <Text color="fg.muted">{t('conditionsDescription')}</Text>
      </Card.Header>
      <Card.Body>
        <Stack gap={4}>
          <KamiForm.Field.RadioGroup
            name="employmentType"
            label={t('employmentType')}
            options={employmentTypeOptions}
          />
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <KamiForm.Field.String name="location" label={t('location')} placeholder={t('locationPlaceholder')} />
            <KamiForm.Field.NativeSelect
              name="timezone"
              label={t('timezone')}
              placeholder={t('selectPlaceholder')}
              options={timezoneOptions}
            />
          </SimpleGrid>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
