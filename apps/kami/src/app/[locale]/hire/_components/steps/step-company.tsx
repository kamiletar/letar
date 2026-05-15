'use client'

import { KamiForm } from '@/kami-form'
import { Card, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { companySizeOptions } from '../../_schemas/hire.schema'

/**
 * Шаг 1: Информация о компании
 */
export function StepCompany() {
  const t = useTranslations('hire.fields')

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="lg">{t('companyTitle')}</Heading>
        <Text color="fg.muted">{t('companyDescription')}</Text>
      </Card.Header>
      <Card.Body>
        <Stack gap={4}>
          <KamiForm.Field.String name="companyName" label={t('companyName')} required />
          <KamiForm.Field.String name="companyWebsite" label={t('companyWebsite')} placeholder="https://" />
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <KamiForm.Field.NativeSelect
              name="companySize"
              label={t('companySize')}
              placeholder={t('selectPlaceholder')}
              options={companySizeOptions}
            />
            <KamiForm.Field.String name="industry" label={t('industry')} placeholder={t('industryPlaceholder')} />
          </SimpleGrid>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
