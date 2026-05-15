'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { Box, Fieldset, Stack } from '@chakra-ui/react'
import { updateCompanyProfile, type UpdateCompanyProfileResult } from '../_actions/update-company-profile'
import { type CompanyProfileData, CompanyProfileSchema } from '../_schemas/company-profile.schema'

interface CompanyProfileFormProps {
  defaultValue?: {
    companyName?: string | null
    companyINN?: string | null
    companyAddress?: string | null
    contactPerson?: string | null
    companyPhone?: string | null
    companyEmail?: string | null
  }
}

/**
 * Форма редактирования реквизитов компании (B2B).
 * Использует PremiumRosstilForm (декларативный API) и Zod v4.
 */
export function CompanyProfileForm({ defaultValue }: CompanyProfileFormProps) {
  const initialValue: CompanyProfileData = {
    companyName: defaultValue?.companyName || '',
    companyINN: defaultValue?.companyINN || '',
    companyAddress: defaultValue?.companyAddress || '',
    contactPerson: defaultValue?.contactPerson || '',
    companyPhone: defaultValue?.companyPhone || '',
    companyEmail: defaultValue?.companyEmail || '',
  }

  const handleSubmit = async (data: CompanyProfileData) => {
    const result: UpdateCompanyProfileResult = await updateCompanyProfile(data)

    if (result.success) {
      toaster.success({
        title: 'Сохранено',
        description: 'Данные компании успешно обновлены',
      })
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    }
  }

  return (
    <PremiumRosstilForm initialValue={initialValue} schema={CompanyProfileSchema} onSubmit={handleSubmit}>
      <Fieldset.Root>
        <Fieldset.Legend fontSize="lg" fontWeight="semibold" mb={4}>
          Реквизиты компании
        </Fieldset.Legend>
        <Fieldset.HelperText mb={6} color="fg.muted">
          Эти данные будут автоматически подставляться при оформлении B2B заказов
        </Fieldset.HelperText>

        <Stack gap={5}>
          <PremiumRosstilForm.Field.String
            name="companyName"
            label="Название компании"
            placeholder='ООО "Ваша Компания"'
            required
          />

          <PremiumRosstilForm.Field.String
            name="companyINN"
            label="ИНН"
            placeholder="1234567890"
            helperText="10 цифр для юрлица, 12 для ИП"
          />

          <PremiumRosstilForm.Field.Textarea
            name="companyAddress"
            label="Юридический адрес"
            placeholder="123456, г. Москва, ул. Примерная, д. 1, офис 101"
            rows={2}
          />

          <PremiumRosstilForm.Field.String
            name="contactPerson"
            label="Контактное лицо"
            placeholder="Иванов Иван Иванович"
          />

          <PremiumRosstilForm.Field.Phone
            name="companyPhone"
            label="Телефон компании"
            placeholder="+7 (999) 123-45-67"
          />

          <PremiumRosstilForm.Field.String
            name="companyEmail"
            label="Email компании"
            type="email"
            placeholder="company@example.com"
          />

          <Box mt={2}>
            <PremiumRosstilForm.Button.Submit colorPalette="fg">Сохранить</PremiumRosstilForm.Button.Submit>
          </Box>
        </Stack>
      </Fieldset.Root>
    </PremiumRosstilForm>
  )
}
