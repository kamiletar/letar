'use client'

import { KamiForm } from '@/kami-form'
import { Box, Card, Heading, Icon, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useCallback, useState, useTransition } from 'react'
import { LuBriefcase, LuCheck, LuCircleCheck, LuCode, LuDollarSign, LuMail, LuSettings, LuUsers } from 'react-icons/lu'
import { submitHireAction } from '../_actions/submit-hire.action'
import { defaultHireFormValues, type HireFormData, HireFormSchema } from '../_schemas/hire.schema'
import { StepCompany, StepCompensation, StepConditions, StepContacts, StepProcess, StepStack, StepTeam } from './steps'
import { TeamInvite } from './team-invite'

/**
 * HireForm — 7-шаговая wizard-форма "Позвать на работу"
 */
export function HireForm() {
  const t = useTranslations('hire')
  const [, startTransition] = useTransition()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submittedCompanyName, setSubmittedCompanyName] = useState<string>('')

  const handleSubmit = useCallback(async (data: HireFormData) => {
    setSubmitError(null)

    startTransition(async () => {
      const result = await submitHireAction(data)

      if (!result.success) {
        setSubmitError(result.error)
        return
      }

      setSubmittedCompanyName(data.companyName)
      setIsSubmitted(true)
    })
  }, [])

  if (isSubmitted) {
    return <SuccessMessage companyName={submittedCompanyName} />
  }

  return (
    <KamiForm<HireFormData> initialValue={defaultHireFormValues} schema={HireFormSchema} onSubmit={handleSubmit}>
      <KamiForm.Steps
        validateOnNext
        linear
        animated
        animationDuration={0.3}
        stepPersistence={{ key: 'hire-form', debounceMs: 500 }}
      >
        <KamiForm.Steps.Indicator showDescriptions />

        {/* Шаг 1: О компании */}
        <KamiForm.Steps.Step title={t('steps.company')} icon={<LuBriefcase />}>
          <StepCompany />
        </KamiForm.Steps.Step>

        {/* Шаг 2: Команда */}
        <KamiForm.Steps.Step title={t('steps.team')} icon={<LuUsers />}>
          <StepTeam />
        </KamiForm.Steps.Step>

        {/* Шаг 3: Стек */}
        <KamiForm.Steps.Step title={t('steps.stack')} icon={<LuCode />}>
          <StepStack />
        </KamiForm.Steps.Step>

        {/* Шаг 4: Условия */}
        <KamiForm.Steps.Step title={t('steps.conditions')} icon={<LuSettings />}>
          <StepConditions />
        </KamiForm.Steps.Step>

        {/* Шаг 5: Компенсация */}
        <KamiForm.Steps.Step title={t('steps.compensation')} icon={<LuDollarSign />}>
          <StepCompensation />
        </KamiForm.Steps.Step>

        {/* Шаг 6: Процесс */}
        <KamiForm.Steps.Step title={t('steps.process')} icon={<LuCheck />}>
          <StepProcess />
        </KamiForm.Steps.Step>

        {/* Шаг 7: Контакты */}
        <KamiForm.Steps.Step title={t('steps.contacts')} icon={<LuMail />}>
          <StepContacts />
        </KamiForm.Steps.Step>

        {/* Навигация */}
        <CustomNavigation error={submitError} />
      </KamiForm.Steps>
    </KamiForm>
  )
}

// ============ Навигация ============

interface CustomNavigationProps {
  error: string | null
}

function CustomNavigation({ error }: CustomNavigationProps) {
  const t = useTranslations('hire')

  return (
    <VStack gap={4} mt={6}>
      {error && (
        <Box bg="bg.error" color="fg.error" p={4} borderRadius="lg" width="full">
          <Text>{t('errors.' + error)}</Text>
        </Box>
      )}
      <KamiForm.Steps.Navigation
        prevLabel={t('prev')}
        nextLabel={t('next')}
        submitLabel={t('submit')}
        colorPalette="brand"
        prevVariant="outline"
      />
    </VStack>
  )
}

// ============ Успешная отправка ============

interface SuccessMessageProps {
  companyName: string
}

function SuccessMessage({ companyName }: SuccessMessageProps) {
  const t = useTranslations('hire')

  return (
    <VStack gap={0} align="stretch">
      <Card.Root>
        <Card.Body>
          <VStack gap={6} py={8}>
            <Icon color="green.500" boxSize={16}>
              <LuCircleCheck />
            </Icon>
            <VStack gap={2}>
              <Heading size="lg" textAlign="center">
                {t('success.title')}
              </Heading>
              <Text color="fg.muted" textAlign="center">
                {t('success.description')}
              </Text>
            </VStack>
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Приглашение команды */}
      <TeamInvite companyName={companyName} />
    </VStack>
  )
}
