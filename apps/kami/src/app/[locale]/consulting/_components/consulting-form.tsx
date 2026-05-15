'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { KamiForm } from '@/kami-form'
import { Box, Button, Card, Heading, SimpleGrid, Stack, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useCallback, useState, useTransition } from 'react'
import { submitConsultingRequest } from '../_actions/submit-consulting.action'
import {
  budgetOptions,
  type ConsultingRequestData,
  ConsultingRequestSchema,
  defaultConsultingRequestValues,
  projectTypeOptions,
  serviceTypeOptions,
  timelineOptions,
} from '../_schemas/consulting.schema'
import { FormSlotPicker } from './form-slot-picker'

/**
 * Форма заявки на консультацию
 */
export function ConsultingForm() {
  const t = useTranslations('consulting')
  const [, startTransition] = useTransition()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = useCallback(
    async (data: ConsultingRequestData) => {
      setSubmitError(null)

      startTransition(async () => {
        const result = await submitConsultingRequest(data)

        if (!result.success) {
          setSubmitError(result.error)
          toaster.error({
            title: t('form.error.title'),
            description: t('form.error.description'),
          })
          return
        }

        setIsSubmitted(true)
        toaster.success({
          title: t('form.success.title'),
          description: t('form.success.description'),
        })
      })
    },
    [t]
  )

  if (isSubmitted) {
    return (
      <VStack gap={4} p={8} borderRadius="xl" bg={{ base: 'fg.50', _dark: 'fg.900/20' }} textAlign="center">
        <Heading as="h3" size="lg" color="fg.500">
          ✓ {t('form.success.title')}
        </Heading>
        <Text color="fg.muted">{t('form.success.details')}</Text>
        <Button variant="outline" onClick={() => setIsSubmitted(false)}>
          {t('form.success.submitAnother')}
        </Button>
      </VStack>
    )
  }

  return (
    <KamiForm<ConsultingRequestData>
      initialValue={defaultConsultingRequestValues}
      schema={ConsultingRequestSchema}
      onSubmit={handleSubmit}
    >
      <Card.Root>
        <Card.Header>
          <Heading size="lg">{t('form.title')}</Heading>
        </Card.Header>
        <Card.Body>
          <Stack gap={6}>
            {/* Контактные данные */}
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              <KamiForm.Field.String
                name="name"
                label={t('form.name')}
                placeholder={t('form.namePlaceholder')}
                required
              />
              <KamiForm.Field.String
                name="email"
                label={t('form.email')}
                placeholder={t('form.emailPlaceholder')}
                required
              />
              <KamiForm.Field.String name="telegram" label={t('form.telegram')} placeholder="@username" />
              <KamiForm.Field.String
                name="company"
                label={t('form.company')}
                placeholder={t('form.companyPlaceholder')}
              />
            </SimpleGrid>

            {/* Детали проекта */}
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              <KamiForm.Field.NativeSelect
                name="serviceType"
                label={t('form.serviceType')}
                placeholder={t('form.selectService')}
                options={serviceTypeOptions}
              />
              <KamiForm.Field.NativeSelect
                name="projectType"
                label={t('form.projectType')}
                placeholder={t('form.selectProject')}
                options={projectTypeOptions}
              />
              <KamiForm.Field.NativeSelect
                name="budget"
                label={t('form.budget')}
                placeholder={t('form.selectBudget')}
                options={budgetOptions}
              />
              <KamiForm.Field.NativeSelect
                name="timeline"
                label={t('form.timeline')}
                placeholder={t('form.selectTimeline')}
                options={timelineOptions}
              />
            </SimpleGrid>

            {/* Описание */}
            <KamiForm.Field.Textarea
              name="description"
              label={t('form.description')}
              placeholder={t('form.descriptionPlaceholder')}
              rows={5}
              required
            />

            {/* Выбор времени для созвона */}
            <FormSlotPicker />

            {/* Ошибка отправки */}
            {submitError && (
              <Box
                p={3}
                borderRadius="md"
                bg={{ base: 'red.50', _dark: 'red.950/30' }}
                color={{ base: 'red.600', _dark: 'red.300' }}
              >
                <Text fontSize="sm">
                  {t('form.error.prefix')}: {submitError}
                </Text>
              </Box>
            )}
          </Stack>
        </Card.Body>
        <Card.Footer>
          <KamiForm.Button.Submit colorPalette="fg" size="lg" width="full">
            {t('form.submit')}
          </KamiForm.Button.Submit>
        </Card.Footer>
      </Card.Root>
    </KamiForm>
  )
}
