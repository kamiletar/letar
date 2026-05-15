'use client'

import { SimpleAddressInput } from '@/app/[locale]/checkout/_components/address-input'
import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { Button, Field, HStack, SimpleGrid, VStack } from '@chakra-ui/react'
import { useTypedFormContext } from '@letar/forms'
import { useState } from 'react'
import type { DaDataAddress, DaDataSuggestion } from 'react-dadata'
import { FaPhone, FaUser } from 'react-icons/fa'
import { type AddressFormData, AddressFormSchema } from '../_schemas/address-form.schema'

type AddressActionResult = { success: true; redirect: string } | { success: false; error: string }

interface AddressFormProps {
  action: (data: AddressFormData) => Promise<AddressActionResult>
  defaultValue?: Partial<AddressFormData>
  submitLabel?: string
}

/**
 * Переиспользуемый компонент формы для создания/редактирования адреса.
 * Использует PremiumRosstilForm (декларативный API) и Zod v4.
 */
export function AddressForm({ action, defaultValue, submitLabel = 'Сохранить' }: AddressFormProps) {
  const router = useRouter()

  // Состояние для скрытых полей из DaData
  const [dadataFields, setDadataFields] = useState({
    postalCode: defaultValue?.postalCode || '',
    region: defaultValue?.region || '',
    city: defaultValue?.city || '',
    street: defaultValue?.street || '',
    house: defaultValue?.house || '',
    block: defaultValue?.block || '',
  })

  // Состояние для квартиры (может заполняться из DaData)
  const [flatValue, setFlatValue] = useState(defaultValue?.flat || '')

  // Состояние для полного адреса
  const [fullAddressValue, setFullAddressValue] = useState(defaultValue?.fullAddress || '')

  const initialValue: AddressFormData = {
    label: defaultValue?.label || '',
    fullAddress: defaultValue?.fullAddress || '',
    postalCode: defaultValue?.postalCode || '',
    country: defaultValue?.country || 'Россия',
    region: defaultValue?.region || '',
    city: defaultValue?.city || '',
    street: defaultValue?.street || '',
    house: defaultValue?.house || '',
    block: defaultValue?.block || '',
    entrance: defaultValue?.entrance || '',
    floor: defaultValue?.floor || '',
    flat: defaultValue?.flat || '',
    recipientName: defaultValue?.recipientName || '',
    phone: defaultValue?.phone || '',
    isDefault: defaultValue?.isDefault || false,
  }

  const handleAddressSelect = (suggestion: DaDataSuggestion<DaDataAddress>) => {
    const data = suggestion.data
    setDadataFields({
      postalCode: data.postal_code || '',
      region: data.region_with_type || '',
      city: data.city || data.settlement || '',
      street: data.street_with_type || '',
      house: data.house || '',
      block: data.block || '',
    })

    setFullAddressValue(suggestion.value)

    // Если DaData вернула квартиру, устанавливаем её
    if (data.flat) {
      setFlatValue(data.flat)
    }
  }

  const handleSubmit = async (data: AddressFormData) => {
    // Добавляем данные из DaData
    const submitData: AddressFormData = {
      ...data,
      fullAddress: fullAddressValue || data.fullAddress,
      postalCode: dadataFields.postalCode || data.postalCode,
      region: dadataFields.region || data.region,
      city: dadataFields.city || data.city,
      street: dadataFields.street || data.street,
      house: dadataFields.house || data.house,
      block: dadataFields.block || data.block,
      flat: flatValue || data.flat,
    }

    const result = await action(submitData)

    if (result.success) {
      toaster.success({
        title: 'Адрес сохранён',
        description: 'Ваш адрес успешно сохранён',
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
    <PremiumRosstilForm initialValue={initialValue} schema={AddressFormSchema} onSubmit={handleSubmit}>
      <VStack align="stretch" gap={4}>
        <PremiumRosstilForm.Errors />

        {/* Метка адреса */}
        <PremiumRosstilForm.Field.String
          name="label"
          label="Метка адреса"
          placeholder='Например: "Дом", "Работа", "Родители"'
          required
        />

        {/* Адрес с DaData */}
        <Field.Root>
          <Field.Label>Адрес доставки</Field.Label>
          <SimpleAddressInput
            defaultValue={fullAddressValue}
            onAddressSelect={handleAddressSelect}
            onChange={setFullAddressValue}
          />
        </Field.Root>

        {/* Скрытые поля для формы */}
        <PremiumRosstilForm.Field.Hidden name="fullAddress" />
        <PremiumRosstilForm.Field.Hidden name="postalCode" />
        <PremiumRosstilForm.Field.Hidden name="region" />
        <PremiumRosstilForm.Field.Hidden name="city" />
        <PremiumRosstilForm.Field.Hidden name="street" />
        <PremiumRosstilForm.Field.Hidden name="house" />
        <PremiumRosstilForm.Field.Hidden name="block" />
        <PremiumRosstilForm.Field.Hidden name="country" />

        {/* Подъезд, Этаж, Квартира в одну строку */}
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
          <PremiumRosstilForm.Field.String name="entrance" label="Подъезд" placeholder="Подъезд" />
          <PremiumRosstilForm.Field.String name="floor" label="Этаж" placeholder="Этаж" />
          <PremiumRosstilForm.Field.String name="flat" label="Квартира" placeholder="Квартира" />
        </SimpleGrid>

        {/* Имя получателя */}
        <RecipientNameFieldWithButton defaultRecipientName={defaultValue?.recipientName} />

        {/* Телефон */}
        <PhoneFieldWithButton defaultPhone={defaultValue?.phone} />

        {/* Сделать адресом по умолчанию */}
        <PremiumRosstilForm.Field.Checkbox name="isDefault" label="Сделать адресом по умолчанию" />

        <PremiumRosstilForm.Button.Submit colorPalette="fg" width="full">
          {submitLabel}
        </PremiumRosstilForm.Button.Submit>
      </VStack>
    </PremiumRosstilForm>
  )
}

/**
 * Поле имени получателя с кнопкой "Из профиля".
 */
function RecipientNameFieldWithButton({ defaultRecipientName }: { defaultRecipientName?: string }) {
  const { setFieldValue } = useTypedFormContext<AddressFormData>()

  const handleFillFromProfile = () => {
    if (defaultRecipientName) {
      setFieldValue('recipientName', defaultRecipientName)
    }
  }

  return (
    <Field.Root>
      <HStack justify="space-between" align="center" mb={2}>
        <Field.Label mb={0}>Получатель</Field.Label>
        {defaultRecipientName && (
          <Button size="xs" variant="ghost" colorPalette="fg" onClick={handleFillFromProfile}>
            <FaUser />
            Из профиля
          </Button>
        )}
      </HStack>
      <PremiumRosstilForm.Field.String name="recipientName" placeholder="ФИО получателя" required />
    </Field.Root>
  )
}

/**
 * Поле телефона с кнопкой "Из профиля".
 */
function PhoneFieldWithButton({ defaultPhone }: { defaultPhone?: string }) {
  const { setFieldValue } = useTypedFormContext<AddressFormData>()

  const handleFillFromProfile = () => {
    if (defaultPhone) {
      setFieldValue('phone', defaultPhone)
    }
  }

  return (
    <Field.Root>
      <HStack justify="space-between" align="center" mb={2}>
        <Field.Label mb={0}>Телефон</Field.Label>
        {defaultPhone && (
          <Button size="xs" variant="ghost" colorPalette="fg" onClick={handleFillFromProfile}>
            <FaPhone />
            Из профиля
          </Button>
        )}
      </HStack>
      <PremiumRosstilForm.Field.Phone name="phone" placeholder="+7 (999) 123-45-67" required />
    </Field.Root>
  )
}
