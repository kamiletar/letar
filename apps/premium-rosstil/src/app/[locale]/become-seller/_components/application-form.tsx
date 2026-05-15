'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { Box, Button, Checkbox, Field, Heading, Input, Link, Text, Textarea, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useState, useTransition } from 'react'
import { submitSellerApplication } from '../_actions/submit-application'
import type { SellerApplicationFormData } from '../_schemas/seller-application.schema'

interface ApplicationFormProps {
  defaultEmail: string
  defaultPhone?: string | null
}

export function ApplicationForm({ defaultEmail, defaultPhone }: ApplicationFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState<Omit<SellerApplicationFormData, 'agreementAccepted'>>({
    shopName: '',
    description: '',
    inn: '',
    legalName: '',
    ogrn: '',
    contactEmail: defaultEmail,
    contactPhone: defaultPhone || '',
    portfolioLinks: '',
  })
  const [agreementAccepted, setAgreementAccepted] = useState(false)
  const [agreementError, setAgreementError] = useState<string | null>(null)

  const handleChange = (field: keyof Omit<SellerApplicationFormData, 'agreementAccepted'>, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!agreementAccepted) {
      setAgreementError('Необходимо принять условия договора')
      return
    }
    setAgreementError(null)

    startTransition(async () => {
      const result = await submitSellerApplication({ ...formData, agreementAccepted: true })

      if (result.success) {
        toaster.success({
          title: 'Заявка отправлена',
          description: 'Мы рассмотрим вашу заявку и свяжемся с вами',
        })
        router.push('/become-seller')
        router.refresh()
      } else {
        toaster.error({ title: result.error })
      }
    })
  }

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack gap={5} align="stretch">
        {/* Название магазина */}
        <Box>
          <Text fontWeight="medium" mb={1}>
            Название магазина{' '}
            <Text as="span" color="red.500">
              *
            </Text>
          </Text>
          <Input
            value={formData.shopName}
            onChange={(e) => handleChange('shopName', e.target.value)}
            placeholder="Например: Мой магазин одежды"
            required
            minLength={2}
            maxLength={100}
          />
        </Box>

        {/* Описание */}
        <Box>
          <Text fontWeight="medium" mb={1}>
            О магазине
          </Text>
          <Textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Расскажите о вашем бренде, ассортименте, уникальных особенностях"
            rows={4}
            maxLength={1000}
          />
        </Box>

        {/* Контакты */}
        <Heading size="md" textTransform="none" mt={2}>
          Контактные данные
        </Heading>

        <Box>
          <Text fontWeight="medium" mb={1}>
            Email{' '}
            <Text as="span" color="red.500">
              *
            </Text>
          </Text>
          <Input
            type="email"
            value={formData.contactEmail}
            onChange={(e) => handleChange('contactEmail', e.target.value)}
            required
          />
        </Box>

        <Box>
          <Text fontWeight="medium" mb={1}>
            Телефон{' '}
            <Text as="span" color="red.500">
              *
            </Text>
          </Text>
          <Input
            type="tel"
            value={formData.contactPhone}
            onChange={(e) => handleChange('contactPhone', e.target.value)}
            placeholder="+7 (999) 123-45-67"
            required
          />
        </Box>

        {/* Юридические данные */}
        <Heading size="md" textTransform="none" mt={2}>
          Юридические данные (необязательно)
        </Heading>

        <Box>
          <Text fontWeight="medium" mb={1}>
            ИНН
          </Text>
          <Input
            value={formData.inn}
            onChange={(e) => handleChange('inn', e.target.value)}
            placeholder="10 или 12 цифр"
            maxLength={12}
          />
        </Box>

        <Box>
          <Text fontWeight="medium" mb={1}>
            Юридическое название
          </Text>
          <Input
            value={formData.legalName}
            onChange={(e) => handleChange('legalName', e.target.value)}
            placeholder="ИП Иванова А.А. / ООО «Компания»"
          />
        </Box>

        <Box>
          <Text fontWeight="medium" mb={1}>
            ОГРН/ОГРНИП
          </Text>
          <Input
            value={formData.ogrn}
            onChange={(e) => handleChange('ogrn', e.target.value)}
            placeholder="13 или 15 цифр"
            maxLength={15}
          />
        </Box>

        {/* Портфолио */}
        <Box>
          <Text fontWeight="medium" mb={1}>
            Ссылки на портфолио/соцсети
          </Text>
          <Textarea
            value={formData.portfolioLinks}
            onChange={(e) => handleChange('portfolioLinks', e.target.value)}
            placeholder="Instagram, Telegram, сайт — по одной ссылке на строку"
            rows={3}
            maxLength={500}
          />
        </Box>

        {/* Согласие с агентским договором */}
        <Field.Root invalid={!!agreementError} mt={2}>
          <Checkbox.Root
            checked={agreementAccepted}
            onCheckedChange={(e) => {
              setAgreementAccepted(!!e.checked)
              if (e.checked) {
                setAgreementError(null)
              }
            }}
            colorPalette="fg"
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>
              <Text as="span" fontSize="sm">
                Я ознакомлен и принимаю условия{' '}
                <Link asChild variant="underline">
                  <NextLink href="/legal/seller-agreement">Агентского договора</NextLink>
                </Link>
              </Text>
            </Checkbox.Label>
          </Checkbox.Root>
          {agreementError && <Field.ErrorText>{agreementError}</Field.ErrorText>}
        </Field.Root>

        <Button type="submit" colorPalette="fg" size="lg" loading={isPending} loadingText="Отправка..." mt={4}>
          Отправить заявку
        </Button>
      </VStack>
    </Box>
  )
}
