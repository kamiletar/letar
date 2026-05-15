'use client'

import { registerUser } from '@/app/[locale]/(auth)/_actions/register.action'
import { type RegisterFormData, RegisterSchema } from '@/app/[locale]/(auth)/_schemas/register.schema'
import { Link as LocalizedLink } from '@/i18n/navigation'
import { Box, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { LuCircleAlert } from 'react-icons/lu'
import { VerifyPinForm } from './verify-pin-form'

export function RegisterForm() {
  const t = useTranslations('auth.registerForm')
  const tErrors = useTranslations('auth.errors')
  const [formError, setFormError] = useState<string | null>(null)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  const handleSubmit = async (data: RegisterFormData) => {
    setFormError(null)

    const result = await registerUser(data)

    if (result.success) {
      setRegisteredEmail(result.email)
      return
    }

    // Преобразуем коды ошибок в понятные сообщения
    switch (result.error) {
      case 'EMAIL_EXISTS':
        setFormError(tErrors('emailExists'))
        break
      case 'VALIDATION_ERROR':
        setFormError(tErrors('validationError'))
        break
      default:
        setFormError(tErrors('registrationError'))
    }
  }

  // После успешной регистрации показываем форму верификации PIN
  if (registeredEmail) {
    return <VerifyPinForm email={registeredEmail} />
  }

  return (
    <Form
      initialValue={{
        email: '',
        password: '',
        name: '',
      }}
      schema={RegisterSchema}
      validateOn="submit"
      onSubmit={handleSubmit}
    >
      <VStack gap={4} align="stretch">
        {formError && (
          <Box p={3} borderRadius="md" bg="red.900/20" borderWidth="1px" borderColor="red.500/30">
            <HStack gap={3} align="start">
              <Box color="red.300" flexShrink={0} mt="0.5">
                <LuCircleAlert size={18} />
              </Box>
              <VStack align="start" gap={1}>
                <Text color="red.300" fontSize="sm" fontWeight="medium">
                  {formError}
                </Text>
                {formError === tErrors('emailExists') && (
                  <Text color="fg.muted" fontSize="sm">
                    {t('alreadyHaveAccount')}{' '}
                    <Link asChild colorPalette="fg" fontWeight="medium">
                      <LocalizedLink href="/sign-in">{t('signIn')}</LocalizedLink>
                    </Link>
                  </Text>
                )}
              </VStack>
            </HStack>
          </Box>
        )}

        <Form.Field.String name="name" label={t('name')} autoComplete="name" placeholder={t('placeholder.name')} />

        <Form.Field.String
          name="email"
          label={t('email')}
          type="email"
          autoComplete="email"
          placeholder={t('placeholder.email')}
        />

        <Form.Field.String
          name="password"
          label={t('password')}
          type="password"
          autoComplete="new-password"
          placeholder={t('placeholder.password')}
          helperText={t('passwordHint')}
        />

        <Form.Button.Submit colorPalette="fg" size="lg" width="full">
          {t('submit')}
        </Form.Button.Submit>
      </VStack>
    </Form>
  )
}
