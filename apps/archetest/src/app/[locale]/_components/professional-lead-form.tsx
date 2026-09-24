'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { ArchetestForm } from '@/archetest-form'
import { Link } from '@/i18n/navigation'
import { Box, Checkbox, Link as ChakraLink, Text, VStack } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { submitProfessionalLeadAction } from '../_actions/professional-lead.action'

/**
 * Лид-форма для психологов на `/for-professionals` (этап 5.7): имя + email +
 * согласие на обработку ПДн. Источник (`source`) берётся из query-параметра
 * `?source=` — проставляется CTA с экрана экспресс-результатов.
 */
export function ProfessionalLeadForm() {
  const locale = useLocale()
  const t = useTranslations('leadForm')
  const searchParams = useSearchParams()
  const source = searchParams.get('source') ?? 'direct'
  const [consentPdn, setConsentPdn] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <Box w="100%" p={5} borderRadius="lg" borderWidth="1px" borderColor="border" bg="bg.subtle">
        <Text fontWeight="semibold">
          {t('thanks')}
        </Text>
      </Box>
    )
  }

  return (
    <ArchetestForm
      initialValue={{ name: '', email: '' }}
      onSubmit={async (value) => {
        const result = await submitProfessionalLeadAction({ ...value, consentPdn, locale, source })
        if ('error' in result) {
          toaster.create({
            title: t('submitError'),
            type: 'error',
          })
          return
        }
        setSubmitted(true)
      }}
    >
      <VStack align="stretch" gap={4} w="100%" maxW="md">
        <ArchetestForm.Field.String name="name" label={t('name')} required />
        <ArchetestForm.Field.String name="email" label="Email" required />

        <Checkbox.Root checked={consentPdn} onCheckedChange={(e) => setConsentPdn(!!e.checked)}>
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label fontSize="sm">
            {t.rich('consent', {
              link: (chunks) => (
                <ChakraLink asChild color="brand.fg" textDecoration="underline">
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                    {chunks}
                  </Link>
                </ChakraLink>
              ),
            })}
          </Checkbox.Label>
        </Checkbox.Root>

        <ArchetestForm.Button.Submit disabled={!consentPdn}>
          {t('submit')}
        </ArchetestForm.Button.Submit>
      </VStack>
    </ArchetestForm>
  )
}
