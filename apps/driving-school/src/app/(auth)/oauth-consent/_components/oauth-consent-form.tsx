'use client'

import { acceptOAuthConsentAction, OAuthConsentSchema } from '@/app/(auth)/_actions/accept-oauth-consent.action'
import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import { Link, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'

export function OAuthConsentForm() {
  return (
    <DrivingSchoolForm
      initialValue={{ acceptOffer: false, acceptPrivacy: false }}
      schema={OAuthConsentSchema}
      onSubmit={async (data) => {
        const result = await acceptOAuthConsentAction(data)
        if (!result.success && result.error) {
          toaster.error({ title: result.error })
        }
        // redirect происходит в action
      }}
    >
      <VStack gap={4} align="stretch">
        <Text color="fg.muted" fontSize="sm" mb={2}>
          Для продолжения использования сервиса, пожалуйста, ознакомьтесь и примите условия ниже.
        </Text>

        <VStack gap={3} align="stretch">
          <DrivingSchoolForm.Field.Checkbox
            name="acceptOffer"
            label={
              <>
                Я принимаю условия{' '}
                <Link asChild colorPalette="brand" fontWeight="medium">
                  <NextLink href="/legal/offer" target="_blank">
                    договора-оферты
                  </NextLink>
                </Link>
              </>
            }
          />

          <DrivingSchoolForm.Field.Checkbox
            name="acceptPrivacy"
            label={
              <>
                Я даю согласие на обработку персональных данных согласно{' '}
                <Link asChild colorPalette="brand" fontWeight="medium">
                  <NextLink href="/legal/privacy" target="_blank">
                    политике конфиденциальности
                  </NextLink>
                </Link>
              </>
            }
          />
        </VStack>

        <DrivingSchoolForm.Button.Submit colorPalette="brand" size="lg">
          Принять и продолжить
        </DrivingSchoolForm.Button.Submit>
      </VStack>
    </DrivingSchoolForm>
  )
}
