'use client'

import { AboiForm } from '@/aboi-form'
import type { ShippingCostResult } from '@/app/_actions/shipping.action'
import { calculateShippingCostAction } from '@/app/_actions/shipping.action'
import { placeOrderAction } from '@/lib/checkout'
import { Box, Input, Spinner, Stack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { z } from 'zod/v4'
import { PvzPicker } from './pvz-picker'

type ShippingMethod = 'CDEK_POINT' | 'CDEK_DOOR' | 'MANAGER_CALL'

// AboiForm schema — shippingMethod и address.postalCode управляются локально,
// инжектируются в onSubmit вместе с shippingCostKopecks и pvzCode.
const Schema = z
  .object({
    customerName: z.string().min(2, 'Минимум 2 символа').max(120),
    customerEmail: z.email('Некорректный email'),
    customerPhone: z.string().min(5, 'Введите телефон').max(40),
    address: z.object({
      country: z.string().default('Россия'),
      // region/city/street/building обязательны только для курьерской доставки —
      // валидируем вручную в onSubmit в зависимости от shippingMethod
      region: z.string().optional(),
      city: z.string().optional(),
      street: z.string().optional(),
      building: z.string().optional(),
      apartment: z.string().optional(),
      fullAddress: z.unknown().optional(),
    }),
    customerNotes: z.string().max(2000).optional(),
    promoCode: z.string().max(40).optional(),
    certificateCode: z.string().max(40).optional(),
    certificatePin: z.string().max(8).optional(),
    consentAccepted: z.literal(true, { message: 'Необходимо согласие с офертой' }),
  })
  .strip()

type CheckoutFormValue = z.infer<typeof Schema>

const DADATA_TOKEN = process.env.NEXT_PUBLIC_DADATA_TOKEN

const SECTION_LABEL_PROPS = {
  fontSize: 'sm' as const,
  fontWeight: 'semibold' as const,
  color: 'fg.muted' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 'wider' as const,
}

const SHIPPING_METHODS: ShippingMethod[] = ['CDEK_POINT', 'CDEK_DOOR', 'MANAGER_CALL']

interface CheckoutFormProps {
  totalMeters: number
  onShippingCostChange: (cost: number) => void
  onCalcStateChange: (loading: boolean) => void
  onPostalCodeChange?: (code: string) => void
}

export function CheckoutForm({ totalMeters, onShippingCostChange, onCalcStateChange, onPostalCodeChange }: CheckoutFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Локальное состояние для полей вне AboiForm
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('CDEK_POINT')
  const [postalCode, setPostalCode] = useState('')
  const [shippingCosts, setShippingCosts] = useState<ShippingCostResult | null>(null)
  const [isCalcShipping, setIsCalcShipping] = useState(false)
  const [pvzCode, setPvzCode] = useState<string | undefined>(undefined)

  // Уведомляем родителя при изменении индекса для отображения корректного placeholder
  useEffect(() => {
    onPostalCodeChange?.(postalCode)
  }, [postalCode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Дебаунс расчёта доставки при изменении индекса
  useEffect(() => {
    if (postalCode.length < 6) {
      setShippingCosts(null)
      onShippingCostChange(0)
      return
    }

    setIsCalcShipping(true)
    onCalcStateChange(true)

    const timeout = setTimeout(async () => {
      const result = await calculateShippingCostAction({ postalCode, totalMeters })
      setShippingCosts(result)
      setIsCalcShipping(false)
      onCalcStateChange(false)
    }, 500)

    return () => {
      clearTimeout(timeout)
    }
  }, [postalCode, totalMeters]) // eslint-disable-line react-hooks/exhaustive-deps

  // Синхронизация стоимости доставки с родителем при смене метода или результатов
  useEffect(() => {
    if (!shippingCosts) {return}
    const cost =
      shippingMethod === 'CDEK_POINT'
        ? (shippingCosts.point ?? 0)
        : shippingMethod === 'CDEK_DOOR'
          ? (shippingCosts.door ?? 0)
          : 0
    onShippingCostChange(cost)
  }, [shippingMethod, shippingCosts]) // eslint-disable-line react-hooks/exhaustive-deps

  // Принудительный MANAGER_CALL при недоступности CDEK
  useEffect(() => {
    if (shippingCosts?.fallback && shippingMethod !== 'MANAGER_CALL') {
      setShippingMethod('MANAGER_CALL')
      onShippingCostChange(0)
    }
  }, [shippingCosts?.fallback]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMethodChange = useCallback((method: ShippingMethod) => {
    setShippingMethod(method)
    if (method !== 'CDEK_POINT') {
      setPvzCode(undefined)
    }
  }, [])

  function getEffectiveCost(): number {
    if (!shippingCosts || shippingMethod === 'MANAGER_CALL') {return 0}
    if (shippingMethod === 'CDEK_POINT') {return shippingCosts.point ?? 0}
    if (shippingMethod === 'CDEK_DOOR') {return shippingCosts.door ?? 0}
    return 0
  }

  function shippingLabel(method: ShippingMethod): string {
    if (!shippingCosts || isCalcShipping) {
      if (method === 'CDEK_POINT') {return 'СДЭК до пункта выдачи'}
      if (method === 'CDEK_DOOR') {return 'СДЭК курьером до двери'}
      return 'Согласовать с менеджером'
    }
    if (shippingCosts.fallback) {
      if (method === 'MANAGER_CALL') {return 'Согласовать с менеджером'}
      return 'СДЭК (уточнит менеджер)'
    }
    if (method === 'CDEK_POINT') {
      return shippingCosts.point !== null
        ? `СДЭК до пункта выдачи — ${(shippingCosts.point / 100).toFixed(0)} ₽`
        : 'СДЭК до ПВЗ (недоступно для этого адреса)'
    }
    if (method === 'CDEK_DOOR') {
      return shippingCosts.door !== null
        ? `СДЭК курьером до двери — ${(shippingCosts.door / 100).toFixed(0)} ₽`
        : 'СДЭК курьером (недоступно для этого адреса)'
    }
    return 'Согласовать с менеджером'
  }

  const visibleMethods: ShippingMethod[] = shippingCosts?.fallback ? ['MANAGER_CALL'] : SHIPPING_METHODS

  // useMemo — иначе новый объект при каждом ре-рендере сбрасывает AboiForm
  const initialValue = useMemo<CheckoutFormValue>(
    () => ({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      address: {
        country: 'Россия',
        region: '',
        city: '',
        street: '',
        building: '',
        apartment: '',
        fullAddress: '',
      },
      customerNotes: '',
      promoCode: '',
      certificateCode: '',
      certificatePin: '',
      consentAccepted: true as const,
    }),
    []
  )

  return (
    <Stack gap={6}>
      {submitError && (
        <Box bg="red.subtle" color="red.fg" p={3} borderRadius="md" fontSize="sm">
          {submitError}
        </Box>
      )}

      <AboiForm
        schema={Schema}
        initialValue={initialValue}
        onFieldChange={{
          'address.fullAddress': (raw, { setFieldValue }) => {
            if (!raw || typeof raw !== 'object') return
            const d = (raw as { data?: Record<string, unknown> }).data
            if (!d) return
            const str = (k: string) => (typeof d[k] === 'string' ? (d[k] as string) : '')
            // Регион: если есть город федерального значения (Москва, СПб) — используем как регион
            const region = str('region_with_type')
            const city = str('city') || str('settlement_with_type')
            const street = str('street_with_type')
            const house = str('house')
            const flat = str('flat')
            const postal = str('postal_code')
            if (region) setFieldValue('address.region', region)
            if (city) setFieldValue('address.city', city)
            if (street) setFieldValue('address.street', street)
            if (house) setFieldValue('address.building', house)
            if (flat) setFieldValue('address.apartment', flat)
            if (postal) setPostalCode(postal)
          },
        }}
        onSubmit={async (value) => {
          setSubmitError(null)

          if (!postalCode || postalCode.length < 4) {
            setSubmitError('Укажите почтовый индекс')
            return
          }
          if (shippingMethod === 'CDEK_POINT' && !pvzCode) {
            setSubmitError('Выберите пункт выдачи СДЭК')
            return
          }
          // Для курьерской доставки и согласования — нужен полный адрес
          if (shippingMethod !== 'CDEK_POINT') {
            if (!value.address.region || value.address.region.length < 2) {
              setSubmitError('Укажите регион / область')
              return
            }
            if (!value.address.city || value.address.city.length < 2) {
              setSubmitError('Укажите город')
              return
            }
            if (!value.address.street || value.address.street.length < 2) {
              setSubmitError('Укажите улицу')
              return
            }
            if (!value.address.building || value.address.building.length < 1) {
              setSubmitError('Укажите номер дома')
              return
            }
          }

          const result = await placeOrderAction({
            ...value,
            shippingMethod,
            shippingCostKopecks: getEffectiveCost(),
            pvzCode,
            address: {
              ...value.address,
              postalCode,
              fullAddress: (() => {
                const fa = value.address.fullAddress
                if (!fa) return undefined
                if (typeof fa === 'string') return fa.trim() || undefined
                if (typeof fa === 'object' && 'value' in (fa as object))
                  return ((fa as { value: string }).value ?? '').trim() || undefined
                return undefined
              })(),
              apartment: value.address.apartment?.trim() || undefined,
            },
            customerNotes: value.customerNotes?.trim() || undefined,
            promoCode: value.promoCode?.trim() || undefined,
            certificateCode: value.certificateCode?.trim() || undefined,
            certificatePin: value.certificatePin?.trim() || undefined,
          })

          if (!result.ok) {
            // fieldErrors — Zod: показываем первую ошибку из плоского списка
            if (result.fieldErrors) {
              const firstField = Object.values(result.fieldErrors).flat()[0]
              setSubmitError(firstField ?? 'Ошибка валидации данных')
            } else {
              setSubmitError(result.error ?? 'Не удалось оформить заказ')
            }
            return
          }
          if (result.paymentUrl) {
            window.location.href = result.paymentUrl
          } else {
            window.location.href = `/checkout/success/${result.orderNumber}`
          }
        }}
      >
        <Stack gap={3}>
          <Stack gap={3}>
            <Text {...SECTION_LABEL_PROPS}>Контактные данные</Text>
            <AboiForm.Field.String name="customerName" label="ФИО получателя" required />
            <AboiForm.Field.String name="customerEmail" label="Email" required />
            <AboiForm.Field.Phone name="customerPhone" label="Телефон" required />
          </Stack>

          <Stack gap={3}>
            <Text {...SECTION_LABEL_PROPS}>Доставка</Text>

            {/* Способ доставки с динамическими ценами */}
            <Stack gap={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <Text fontSize="sm" fontWeight="medium">
                  Способ доставки
                </Text>
                {isCalcShipping && <Spinner size="xs" />}
              </Box>
              {visibleMethods.map((method) => {
                const isSelected = shippingMethod === method
                return (
                  <Box
                    key={method}
                    display="flex"
                    alignItems="center"
                    gap={3}
                    p={3}
                    borderWidth="1px"
                    borderRadius="md"
                    borderColor={isSelected ? 'colorPalette.500' : 'border'}
                    bg={isSelected ? 'colorPalette.subtle' : 'transparent'}
                    colorPalette="brand"
                    cursor="pointer"
                    _hover={{ bg: 'bg.subtle' }}
                    onClick={() => handleMethodChange(method)}
                  >
                    <input
                      type="radio"
                      name="shippingMethod"
                      value={method}
                      checked={isSelected}
                      onChange={() => handleMethodChange(method)}
                      style={{ accentColor: 'var(--chakra-colors-brand-500)', flexShrink: 0 }}
                    />
                    <Text fontSize="sm">{shippingLabel(method)}</Text>
                  </Box>
                )
              })}
              {shippingCosts !== null && shippingCosts.periodMin !== null && !shippingCosts.fallback && (
                <Text fontSize="xs" color="fg.muted">
                  Срок доставки: {shippingCosts.periodMin}–{shippingCosts.periodMax} дн.
                </Text>
              )}
            </Stack>

            {/* Для ПВЗ — поиск города + карта */}
            {shippingMethod === 'CDEK_POINT' ? (
              <>
                <PvzPicker
                  selectedPvzCode={pvzCode}
                  onSelect={(code, _addr, postal) => {
                    setPvzCode(code)
                    setPostalCode(postal)
                  }}
                />
              </>
            ) : (
              <>
                {/* Для курьера и менеджера — полный адрес */}
                <AboiForm.Field.Address
                  name="address.fullAddress"
                  label="Адрес одной строкой"
                  placeholder="Начните вводить — подсказки от DaData"
                  token={DADATA_TOKEN}
                />
                <AboiForm.Field.String name="address.region" label="Регион / область" />
                <AboiForm.Field.String name="address.city" label="Город" />
                <AboiForm.Field.String name="address.street" label="Улица" />
                <AboiForm.Field.String name="address.building" label="Дом" />
                <AboiForm.Field.String name="address.apartment" label="Квартира / офис" />
                <Stack gap={1}>
                  <Box display="flex" gap={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      Индекс
                    </Text>
                    <Text fontSize="sm" color="red.500">
                      *
                    </Text>
                  </Box>
                  <Input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="123456"
                    maxLength={10}
                    inputMode="numeric"
                  />
                </Stack>
              </>
            )}
          </Stack>

          <Stack gap={3}>
            <Text {...SECTION_LABEL_PROPS}>Скидки</Text>
            <AboiForm.Field.String name="promoCode" label="Промокод" placeholder="WELCOME10" />
            <AboiForm.Field.String name="certificateCode" label="Код подарочного сертификата" />
            <AboiForm.Field.String name="certificatePin" label="PIN сертификата (4 цифры)" />
          </Stack>

          <Stack gap={3}>
            <Text {...SECTION_LABEL_PROPS}>Дополнительно</Text>
            <AboiForm.Field.Textarea
              name="customerNotes"
              label="Комментарий"
              rows={3}
              placeholder="Например: пожелания по упаковке"
            />
            <AboiForm.Field.Checkbox
              name="consentAccepted"
              label="Согласен с офертой и политикой обработки персональных данных"
            />
          </Stack>

          <Text fontSize="xs" color="fg.muted">
            Нажимая «Перейти к оплате», вы соглашаетесь с офертой и политикой обработки персональных данных. Оплата
            через T-Bank — безопасно.
          </Text>

          <AboiForm.Errors />
          <AboiForm.Button.Submit>Перейти к оплате</AboiForm.Button.Submit>
        </Stack>
      </AboiForm>
    </Stack>
  )
}
