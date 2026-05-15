'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { LoyaltyLevel } from '@/generated/prisma'
import { useRouter } from '@/i18n/navigation'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { Box, Grid, Text, VStack } from '@chakra-ui/react'
import { useTypedFormContext } from '@letar/forms'
import { useEffect, useRef, useState } from 'react'
import type { DaDataAddress, DaDataSuggestion } from 'react-dadata'
import { createOrder, type CreateOrderResult } from '../_actions/create-order'
import { type CheckoutFormData, CheckoutFormSchema } from '../_schemas/checkout-form.schema'
import { SimpleAddressInput } from './address-input'
import { LoyaltyPointsInput } from './loyalty-points-input'
import { SavedAddressSelector } from './saved-address-selector'

interface SavedAddress {
  id: string
  label: string
  fullAddress: string
  recipientName: string
  phone: string
  isDefault: boolean
  postalCode: string | null
  city: string | null
  region: string | null
}

interface CheckoutFormProps {
  defaultValue?: CheckoutFormData
  savedAddresses?: SavedAddress[]
  submitLabel?: string
  loyaltyBalance?: number
  loyaltyLevel?: LoyaltyLevel
  subtotal?: number
}

/**
 * Форма оформления заказа с интеграцией DaData для подсказок адресов.
 * Использует PremiumRosstilForm (декларативный API) и Zod v4.
 */
export function CheckoutForm({
  defaultValue,
  savedAddresses = [],
  submitLabel = 'Оформить заказ',
  loyaltyBalance = 0,
  loyaltyLevel = 'BRONZE',
  subtotal = 0,
}: CheckoutFormProps) {
  const router = useRouter()
  const isInitialMount = useRef(true)

  const [addressData, setAddressData] = useState<{
    city?: string
    region?: string
    postalCode?: string
  }>({})
  const [deliveryAddressValue, setDeliveryAddressValue] = useState(defaultValue?.deliveryAddress || '')
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<SavedAddress | null>(null)

  const initialValue: CheckoutFormData = {
    customerName: defaultValue?.customerName || '',
    customerPhone: defaultValue?.customerPhone || '',
    customerEmail: defaultValue?.customerEmail || '',
    deliveryAddress: defaultValue?.deliveryAddress || '',
    deliveryCity: defaultValue?.deliveryCity || '',
    deliveryRegion: defaultValue?.deliveryRegion || '',
    deliveryPostalCode: defaultValue?.deliveryPostalCode || '',
    saveToProfile: defaultValue?.saveToProfile ?? true,
    promoCode: defaultValue?.promoCode || '',
    notes: defaultValue?.notes || '',
    loyaltyPoints: 0,
  }

  /**
   * Обработчик выбора сохраненного адреса.
   */
  const handleSavedAddressSelect = (address: SavedAddress | null) => {
    setSelectedSavedAddress(address)

    if (address) {
      setDeliveryAddressValue(address.fullAddress)
      setAddressData({
        city: address.city || undefined,
        region: address.region || undefined,
        postalCode: address.postalCode || undefined,
      })
    } else {
      setDeliveryAddressValue('')
      setAddressData({})
    }
  }

  // Автоматически выбираем адрес по умолчанию при загрузке
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      const defaultAddress = savedAddresses.find((addr) => addr.isDefault)
      if (defaultAddress && !deliveryAddressValue) {
        handleSavedAddressSelect(defaultAddress)
      }
    }
  }, [savedAddresses, deliveryAddressValue])

  /**
   * Обработчик выбора адреса из подсказок DaData.
   */
  const handleAddressSelect = (suggestion: DaDataSuggestion<DaDataAddress>) => {
    const { city, region, postal_code } = suggestion.data

    setDeliveryAddressValue(suggestion.value)
    setAddressData({
      city: city || undefined,
      region: region || undefined,
      postalCode: postal_code || undefined,
    })
  }

  const handleSubmit = async (data: CheckoutFormData) => {
    // Добавляем данные адреса
    const submitData: CheckoutFormData = {
      ...data,
      deliveryAddress: deliveryAddressValue || data.deliveryAddress,
      deliveryCity: addressData.city || data.deliveryCity,
      deliveryRegion: addressData.region || data.deliveryRegion,
      deliveryPostalCode: addressData.postalCode || data.deliveryPostalCode,
    }

    const result: CreateOrderResult = await createOrder(submitData)

    if (result.success) {
      toaster.success({
        title: 'Заказ оформлен',
        description: 'Ваш заказ успешно создан',
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
    <PremiumRosstilForm initialValue={initialValue} schema={CheckoutFormSchema} onSubmit={handleSubmit}>
      <VStack align="stretch" gap={6}>
        <PremiumRosstilForm.Errors />

        {/* Информация о покупателе */}
        <Box>
          <Text fontSize="xl" fontWeight="semibold" mb={4}>
            Информация о покупателе
          </Text>

          <VStack align="stretch" gap={4}>
            <PremiumRosstilForm.Field.String
              name="customerName"
              label="Имя и фамилия"
              placeholder="Иван Иванов"
              required
            />

            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <PremiumRosstilForm.Field.Phone
                name="customerPhone"
                label="Телефон"
                placeholder="+7 (900) 123-45-67"
                required
              />

              <PremiumRosstilForm.Field.String
                name="customerEmail"
                label="Email (необязательно)"
                type="email"
                placeholder="ivan@example.com"
              />
            </Grid>
          </VStack>
        </Box>

        {/* Адрес доставки */}
        <Box>
          <Text fontSize="xl" fontWeight="semibold" mb={4}>
            Адрес доставки
          </Text>

          <VStack align="stretch" gap={4}>
            {/* Сохраненные адреса */}
            {savedAddresses && savedAddresses.length > 0 && (
              <SavedAddressSelectorWithForm addresses={savedAddresses} onAddressSelect={handleSavedAddressSelect} />
            )}

            {/* Поле ввода адреса (показываем если выбрано "Ввести новый" или нет сохраненных) */}
            {(!selectedSavedAddress || savedAddresses.length === 0) && (
              <Box>
                <Text mb={2} fontWeight="medium">
                  {savedAddresses.length > 0 ? 'Новый адрес *' : 'Адрес *'}
                </Text>
                <SimpleAddressInput
                  defaultValue={deliveryAddressValue}
                  onAddressSelect={handleAddressSelect}
                  onChange={setDeliveryAddressValue}
                />
                <Text fontSize="sm" color="fg.muted" mt={1}>
                  Начните вводить адрес, и мы подскажем варианты
                </Text>
              </Box>
            )}

            {/* Скрытые поля для адреса */}
            <PremiumRosstilForm.Field.Hidden name="deliveryAddress" />
            <PremiumRosstilForm.Field.Hidden name="deliveryCity" />
            <PremiumRosstilForm.Field.Hidden name="deliveryRegion" />
            <PremiumRosstilForm.Field.Hidden name="deliveryPostalCode" />

            {/* Галочка "Сохранить в профиль" - показываем только при вводе нового адреса */}
            {!selectedSavedAddress && (
              <PremiumRosstilForm.Field.Checkbox name="saveToProfile" label="Сохранить адрес и телефон в профиль" />
            )}
          </VStack>
        </Box>

        {/* Промокод */}
        <PremiumRosstilForm.Field.String name="promoCode" label="Промокод (необязательно)" placeholder="WELCOME10" />

        {/* Бонусные баллы */}
        {loyaltyBalance > 0 && <LoyaltyPointsInput balance={loyaltyBalance} level={loyaltyLevel} subtotal={subtotal} />}

        {/* Комментарий к заказу */}
        <PremiumRosstilForm.Field.Textarea
          name="notes"
          label="Комментарий к заказу (необязательно)"
          placeholder="Укажите удобное время доставки или другие пожелания"
          rows={4}
        />

        {/* Кнопка отправки */}
        <PremiumRosstilForm.Button.Submit colorPalette="fg" size="lg" width="100%">
          {submitLabel}
        </PremiumRosstilForm.Button.Submit>

        <Text fontSize="sm" color="fg.muted" textAlign="center">
          Нажимая кнопку, вы соглашаетесь с условиями обработки персональных данных
        </Text>
      </VStack>
    </PremiumRosstilForm>
  )
}

/**
 * Обёртка SavedAddressSelector с интеграцией формы для обновления значений.
 */
function SavedAddressSelectorWithForm({
  addresses,
  onAddressSelect,
}: {
  addresses: SavedAddress[]
  onAddressSelect: (address: SavedAddress | null) => void
}) {
  const { setFieldValue } = useTypedFormContext<CheckoutFormData>()

  const handleSelect = (address: SavedAddress | null) => {
    onAddressSelect(address)

    // Обновляем значения формы при выборе сохранённого адреса
    if (address) {
      setFieldValue('customerName', address.recipientName)
      setFieldValue('customerPhone', address.phone)
      setFieldValue('deliveryAddress', address.fullAddress)
      setFieldValue('deliveryCity', address.city || '')
      setFieldValue('deliveryRegion', address.region || '')
      setFieldValue('deliveryPostalCode', address.postalCode || '')
    }
  }

  return <SavedAddressSelector addresses={addresses} onAddressSelect={handleSelect} />
}
