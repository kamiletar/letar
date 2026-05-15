'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { Alert, Box, Button, Fieldset, Stack } from '@chakra-ui/react'
import { FaUser } from 'react-icons/fa'
import { type CreateCustomOrderResult, createMadeToOrderOrder } from '../_actions/create-custom-order'
import { type MadeToOrderFormData, madeToOrderSchema } from '../_schemas/custom-order.schema'

interface UserMeasurements {
  bust: number | null
  waist: number | null
  hips: number | null
  height: number | null
  gender: string
}

interface UserContactInfo {
  name: string | null
  email: string
  phone: string | null
}

interface MadeToOrderFormProps {
  productId: string
  variantId?: string
  productItemId?: string
  userMeasurements: UserMeasurements | null
  userContactInfo: UserContactInfo | null
  onBack: () => void
}

/**
 * Форма заказа по индивидуальным меркам (MADE_TO_ORDER).
 * Использует PremiumRosstilForm (декларативный API) и Zod v4.
 */
export function MadeToOrderForm({
  productId,
  variantId,
  productItemId,
  userMeasurements,
  userContactInfo,
  onBack,
}: MadeToOrderFormProps) {
  const router = useRouter()

  // Check if user has measurements saved in profile
  const hasMeasurementsFromProfile = !!(
    userMeasurements?.bust ||
    userMeasurements?.waist ||
    userMeasurements?.hips ||
    userMeasurements?.height
  )

  const initialValue: MadeToOrderFormData = {
    variantId: variantId || '',
    productItemId: productItemId || '',
    customBust: userMeasurements?.bust ?? 0,
    customWaist: userMeasurements?.waist ?? 0,
    customHips: userMeasurements?.hips ?? 0,
    customHeight: userMeasurements?.height ?? undefined,
    customDetails: '',
    customerName: userContactInfo?.name || '',
    customerPhone: userContactInfo?.phone || '',
    customerEmail: userContactInfo?.email || '',
    notes: '',
  }

  const handleSubmit = async (data: MadeToOrderFormData) => {
    const result: CreateCustomOrderResult = await createMadeToOrderOrder(productId, data)

    if (result.success) {
      toaster.success({
        title: 'Заявка отправлена',
        description: 'Мы свяжемся с вами для уточнения деталей',
      })
      router.push(result.redirect)
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    }
  }

  return (
    <PremiumRosstilForm initialValue={initialValue} schema={madeToOrderSchema} onSubmit={handleSubmit}>
      <Stack gap={4}>
        <PremiumRosstilForm.Errors />

        <PremiumRosstilForm.Field.Hidden name="variantId" />
        {productItemId && <PremiumRosstilForm.Field.Hidden name="productItemId" />}

        {hasMeasurementsFromProfile && (
          <Alert.Root status="info">
            <Alert.Indicator>
              <FaUser />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title>Мерки из профиля</Alert.Title>
              <Alert.Description>
                Поля заполнены вашими сохранёнными мерками. Вы можете изменить их при необходимости.
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        <Fieldset.Root>
          <Fieldset.Legend>Индивидуальные мерки (см)</Fieldset.Legend>
          <Fieldset.Content>
            <PremiumRosstilForm.Field.Number
              name="customBust"
              label="Обхват груди"
              placeholder="90"
              min={60}
              max={200}
              required
            />

            <PremiumRosstilForm.Field.Number
              name="customWaist"
              label="Обхват талии"
              placeholder="70"
              min={50}
              max={180}
              required
            />

            <PremiumRosstilForm.Field.Number
              name="customHips"
              label="Обхват бёдер"
              placeholder="95"
              min={60}
              max={220}
              required
            />

            <PremiumRosstilForm.Field.Number name="customHeight" label="Рост" placeholder="170" min={140} max={220} />
          </Fieldset.Content>
        </Fieldset.Root>

        <PremiumRosstilForm.Field.Textarea
          name="customDetails"
          label="Детали кастомизации"
          placeholder="Опишите желаемые изменения: длина, вырез, рукава и т.д."
          rows={3}
        />

        <Fieldset.Root>
          <Fieldset.Legend>Контактные данные</Fieldset.Legend>
          <Fieldset.Content>
            <PremiumRosstilForm.Field.String name="customerName" label="Ваше имя" placeholder="Иван Иванов" required />

            <PremiumRosstilForm.Field.Phone
              name="customerPhone"
              label="Телефон"
              placeholder="+7 (900) 123-45-67"
              required
            />

            <PremiumRosstilForm.Field.String
              name="customerEmail"
              label="Email"
              type="email"
              placeholder="ivan@example.com"
            />
          </Fieldset.Content>
        </Fieldset.Root>

        <PremiumRosstilForm.Field.Textarea name="notes" label="Комментарий" placeholder="Дополнительные пожелания..." />

        <Stack direction="row" gap={2}>
          <Button type="button" variant="ghost" onClick={onBack} flex={1}>
            Назад
          </Button>
          <Box flex={1}>
            <PremiumRosstilForm.Button.Submit colorPalette="fg" disabled={!variantId} width="full">
              Отправить заявку
            </PremiumRosstilForm.Button.Submit>
          </Box>
        </Stack>
      </Stack>
    </PremiumRosstilForm>
  )
}
