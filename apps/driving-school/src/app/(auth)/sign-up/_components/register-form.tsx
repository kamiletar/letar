'use client'

import { registerUser } from '@/app/(auth)/_actions/register.action'
import { type RegisterFormData, RegisterSchema } from '@/app/(auth)/_schemas/register.schema'
import { DrivingSchoolForm } from '@/driving-school-form'
import { Box, Checkbox, Field, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { useDeclarativeForm } from '@letar/forms'
import type { AnyFieldApi } from '@tanstack/react-form'
import NextLink from 'next/link'
import { type ReactElement, useState } from 'react'
import { LuCircleAlert } from 'react-icons/lu'
import { VerifyPinForm } from './verify-pin-form'

/**
 * Чекбокс принятия оферты со ссылкой
 */
function AcceptOfferCheckbox(): ReactElement {
  const { form } = useDeclarativeForm()

  return (
    <form.Field name="acceptOffer">
      {(field: AnyFieldApi) => {
        const errors = field.state.meta.errors
        const hasError = errors && errors.length > 0

        return (
          <Field.Root invalid={hasError}>
            <Checkbox.Root
              checked={!!field.state.value}
              onCheckedChange={(e) => field.handleChange(!!e.checked)}
              data-field-name="acceptOffer"
            >
              <Checkbox.HiddenInput onBlur={field.handleBlur} />
              <Checkbox.Control />
              <Checkbox.Label>
                Я принимаю условия{' '}
                <Link asChild colorPalette="brand" fontWeight="medium">
                  <NextLink href="/legal/offer" target="_blank">
                    договора-оферты
                  </NextLink>
                </Link>
              </Checkbox.Label>
            </Checkbox.Root>
            {hasError && (
              <Field.ErrorText>{errors.map((e) => (typeof e === 'string' ? e : e.message)).join(', ')}</Field.ErrorText>
            )}
          </Field.Root>
        )
      }}
    </form.Field>
  )
}

/**
 * Чекбокс согласия на обработку персональных данных со ссылкой
 */
function AcceptPrivacyCheckbox(): ReactElement {
  const { form } = useDeclarativeForm()

  return (
    <form.Field name="acceptPrivacy">
      {(field: AnyFieldApi) => {
        const errors = field.state.meta.errors
        const hasError = errors && errors.length > 0

        return (
          <Field.Root invalid={hasError}>
            <Checkbox.Root
              checked={!!field.state.value}
              onCheckedChange={(e) => field.handleChange(!!e.checked)}
              data-field-name="acceptPrivacy"
            >
              <Checkbox.HiddenInput onBlur={field.handleBlur} />
              <Checkbox.Control />
              <Checkbox.Label>
                Я даю согласие на обработку персональных данных согласно{' '}
                <Link asChild colorPalette="brand" fontWeight="medium">
                  <NextLink href="/legal/privacy" target="_blank">
                    политике конфиденциальности
                  </NextLink>
                </Link>
              </Checkbox.Label>
            </Checkbox.Root>
            {hasError && (
              <Field.ErrorText>{errors.map((e) => (typeof e === 'string' ? e : e.message)).join(', ')}</Field.ErrorText>
            )}
          </Field.Root>
        )
      }}
    </form.Field>
  )
}

export function RegisterForm() {
  const [formError, setFormError] = useState<string | null>(null)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  const handleSubmit = async (data: RegisterFormData) => {
    setFormError(null)

    const result = await registerUser({
      email: data.email,
      password: data.password,
      acceptOffer: data.acceptOffer,
      acceptPrivacy: data.acceptPrivacy,
    })

    if (result.success) {
      setRegisteredEmail(result.email)
      return
    }

    // Преобразуем коды ошибок в понятные сообщения
    switch (result.error) {
      case 'EMAIL_EXISTS':
        setFormError('Пользователь с таким email уже существует')
        break
      case 'VALIDATION_ERROR':
        setFormError('Проверьте правильность введённых данных')
        break
      default:
        setFormError('Произошла ошибка при регистрации')
    }
  }

  // После успешной регистрации показываем форму верификации
  if (registeredEmail) {
    return <VerifyPinForm email={registeredEmail} />
  }

  return (
    <DrivingSchoolForm
      initialValue={{
        email: '',
        password: '',
        acceptOffer: false,
        acceptPrivacy: false,
      }}
      schema={RegisterSchema}
      validateOn="submit"
      onSubmit={handleSubmit}
    >
      <VStack gap={4} align="stretch">
        {formError && (
          <Box layerStyle="panel.error">
            <HStack gap={3} align="start">
              <Box color="error.fg" flexShrink={0} mt="0.5">
                <LuCircleAlert size={18} />
              </Box>
              <VStack align="start" gap={1}>
                <Text color="error.fg" fontSize="sm" fontWeight="medium">
                  {formError}
                </Text>
                {formError.includes('уже существует') && (
                  <Text color="fg.muted" fontSize="sm">
                    Уже есть аккаунт?{' '}
                    <Link asChild colorPalette="brand" fontWeight="medium">
                      <NextLink href="/sign-in">Войти</NextLink>
                    </Link>
                  </Text>
                )}
              </VStack>
            </HStack>
          </Box>
        )}

        {/* Всё автоматически из схемы: label, placeholder, type, fieldType */}
        <DrivingSchoolForm.Field.Auto name="email" autoComplete="email" />
        <DrivingSchoolForm.Field.Auto name="password" showRequirements />

        {/* Legal document checkboxes */}
        <VStack gap={3} align="stretch" pt={2}>
          <AcceptOfferCheckbox />
          <AcceptPrivacyCheckbox />
        </VStack>

        <DrivingSchoolForm.Button.Submit>Зарегистрироваться</DrivingSchoolForm.Button.Submit>
      </VStack>
    </DrivingSchoolForm>
  )
}
