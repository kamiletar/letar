'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { Heading, Stack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { updateSeller } from './_actions/update-seller'
import { type SellerSettingsFormData, SellerSettingsSchema } from './_schemas/seller-settings.schema'

interface SellerSettingsFormProps {
  defaultValues: SellerSettingsFormData
}

/**
 * Форма редактирования настроек магазина.
 */
export function SellerSettingsForm({ defaultValues }: SellerSettingsFormProps) {
  const router = useRouter()

  const handleSubmit = async (data: SellerSettingsFormData) => {
    const result = await updateSeller(data)
    if (result.success) {
      toaster.success({ title: 'Настройки сохранены' })
      router.refresh()
    } else {
      toaster.error({ title: result.error })
    }
  }

  return (
    <PremiumRosstilForm initialValue={defaultValues} schema={SellerSettingsSchema} onSubmit={handleSubmit}>
      <Stack gap={6}>
        <PremiumRosstilForm.Errors />

        {/* Основная информация */}
        <Stack gap={4}>
          <Heading size="md">Основная информация</Heading>
          <PremiumRosstilForm.Field.String name="shopName" label="Название магазина" required />
          <PremiumRosstilForm.Field.Textarea name="description" label="Описание магазина" rows={3} />
          <PremiumRosstilForm.Field.String name="contactEmail" label="Контактный email" />
          <PremiumRosstilForm.Field.String name="contactPhone" label="Контактный телефон" />
        </Stack>

        {/* Юридические данные */}
        <Stack gap={4}>
          <Heading size="md">Юридические данные</Heading>
          <PremiumRosstilForm.Field.String name="inn" label="ИНН" />
          <PremiumRosstilForm.Field.String name="legalName" label="Юридическое наименование" />
          <PremiumRosstilForm.Field.String name="legalAddress" label="Юридический адрес" />
          <PremiumRosstilForm.Field.String name="ogrn" label="ОГРН / ОГРНИП" />
        </Stack>

        {/* Банковские реквизиты */}
        <Stack gap={4}>
          <Heading size="md">Банковские реквизиты</Heading>
          <PremiumRosstilForm.Field.String name="bankAccount" label="Расчётный счёт" />
          <PremiumRosstilForm.Field.String name="bik" label="БИК" />
          <PremiumRosstilForm.Field.String name="bankName" label="Название банка" />
        </Stack>

        <PremiumRosstilForm.Button.Submit colorPalette="fg">Сохранить настройки</PremiumRosstilForm.Button.Submit>
      </Stack>
    </PremiumRosstilForm>
  )
}
