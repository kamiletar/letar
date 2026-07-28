'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { ArchetestForm } from '@/archetest-form'
import { Link } from '@/i18n/navigation'
import { Box, Link as ChakraLink, Checkbox, Text, VStack } from '@chakra-ui/react'
import { useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { submitProfessionalLeadAction } from '../_actions/professional-lead.action'

/**
 * Лид-форма для психологов на `/for-professionals` (этап 5.7): имя + email +
 * согласие на обработку ПДн. Источник (`source`) берётся из query-параметра
 * `?source=` — проставляется CTA с экрана экспресс-результатов.
 */
export function ProfessionalLeadForm({ isRu }: { isRu: boolean }) {
  const locale = useLocale()
  const searchParams = useSearchParams()
  const source = searchParams.get('source') ?? 'direct'
  const [consentPdn, setConsentPdn] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <Box w="100%" p={5} borderRadius="lg" borderWidth="1px" borderColor="border" bg="bg.subtle">
        <Text fontWeight="semibold">
          {isRu ? 'Спасибо! Мы свяжемся с вами по email.' : 'Thank you! We will contact you by email.'}
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
            title: isRu ? 'Не удалось отправить заявку' : 'Failed to submit the request',
            type: 'error',
          })
          return
        }
        setSubmitted(true)
      }}
    >
      <VStack align="stretch" gap={4} w="100%" maxW="md">
        <ArchetestForm.Field.String name="name" label={isRu ? 'Имя' : 'Name'} required />
        <ArchetestForm.Field.String name="email" label="Email" required />

        <Checkbox.Root checked={consentPdn} onCheckedChange={(e) => setConsentPdn(!!e.checked)}>
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label fontSize="sm">
            {isRu ? 'Я согласен с ' : 'I agree to the '}
            <ChakraLink asChild color="blue.500" textDecoration="underline">
              <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                {isRu ? 'политикой обработки персональных данных' : 'personal data processing policy'}
              </Link>
            </ChakraLink>
          </Checkbox.Label>
        </Checkbox.Root>

        <ArchetestForm.Button.Submit disabled={!consentPdn}>
          {isRu ? 'Оставить заявку' : 'Submit request'}
        </ArchetestForm.Button.Submit>
      </VStack>
    </ArchetestForm>
  )
}
