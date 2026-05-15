'use client'

import { KamiForm } from '@/kami-form'
import { Card, Heading, Stack, Text } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { teamSizeOptions } from '../../_schemas/hire.schema'

/**
 * Шаг 2: Команда
 */
export function StepTeam() {
  const t = useTranslations('hire.fields')

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="lg">{t('teamTitle')}</Heading>
        <Text color="fg.muted">{t('teamDescription')}</Text>
      </Card.Header>
      <Card.Body>
        <Stack gap={4}>
          <KamiForm.Field.NativeSelect
            name="teamSize"
            label={t('teamSize')}
            placeholder={t('selectPlaceholder')}
            options={teamSizeOptions}
          />
          <KamiForm.Field.Textarea
            name="teamStructure"
            label={t('teamStructure')}
            placeholder={t('teamStructurePlaceholder')}
            rows={3}
          />
          <KamiForm.Field.Switch name="remoteFriendly" label={t('remoteFriendly')} />
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
