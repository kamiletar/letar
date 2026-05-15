'use client'

import { KamiForm } from '@/kami-form'
import { Card, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'

/**
 * Шаг 7: Контактная информация
 */
export function StepContacts() {
  const t = useTranslations('hire.fields')

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="lg">{t('contactsTitle')}</Heading>
        <Text color="fg.muted">{t('contactsDescription')}</Text>
      </Card.Header>
      <Card.Body>
        <Stack gap={4}>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <KamiForm.Field.String name="contactName" label={t('contactName')} required />
            <KamiForm.Field.String name="contactEmail" label={t('contactEmail')} type="email" required />
          </SimpleGrid>
          <KamiForm.Field.String name="contactTelegram" label={t('contactTelegram')} placeholder="@username" />
          <KamiForm.Field.Textarea name="message" label={t('message')} placeholder={t('messagePlaceholder')} rows={4} />
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
