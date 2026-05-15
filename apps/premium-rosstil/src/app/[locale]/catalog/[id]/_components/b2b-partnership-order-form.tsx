'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { Gender } from '@/generated/prisma'
import { useRouter } from '@/i18n/navigation'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { Box, Button, Fieldset, HStack, NumberInput, Stack, Table, Text } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { createB2BPartnershipOrder, type CreateCustomOrderResult } from '../_actions/create-custom-order'
import { type B2BPartnershipOrderFormData, b2bPartnershipOrderSchema } from '../_schemas/custom-order.schema'

interface VariantSizeItem {
  id: string
  price: number
  size: {
    id: string
    gender: Gender
    international: string
  }
}

interface AllSizeItem {
  id: string
  gender: Gender
  international: string
  sortOrder: number
}

interface CompanyProfile {
  companyName: string
  companyINN: string | null
  companyAddress: string | null
  contactPerson: string | null
  companyPhone: string | null
  companyEmail: string | null
}

interface B2BPartnershipOrderFormProps {
  productId: string
  variantId?: string
  /** Размеры доступные в текущем варианте (с ценами) */
  availableSizes: VariantSizeItem[]
  /** Все размеры для данного пола */
  allSizes: AllSizeItem[]
  companyProfile: CompanyProfile | null
  onBack: () => void
}

/**
 * Форма B2B заказа (B2B_PARTNERSHIP).
 * Использует PremiumRosstilForm (декларативный API) и Zod v4.
 */
export function B2BPartnershipOrderForm({
  productId,
  variantId,
  availableSizes,
  allSizes,
  companyProfile,
  onBack,
}: B2BPartnershipOrderFormProps) {
  const router = useRouter()

  // Карта размеров из варианта для быстрого поиска цены
  const variantSizePriceMap = useMemo(() => {
    const map = new Map<string, number>()
    availableSizes.forEach((item) => {
      map.set(item.size.id, item.price)
    })
    return map
  }, [availableSizes])

  // State for quantity per size
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    allSizes.forEach((size) => {
      initial[size.id] = 0
    })
    return initial
  })

  // Calculate totals
  const { totalQuantity, totalPrice } = useMemo(() => {
    let qty = 0
    let price = 0
    allSizes.forEach((size) => {
      const q = quantities[size.id] || 0
      qty += q
      const sizePrice = variantSizePriceMap.get(size.id)
      if (sizePrice !== undefined) {
        price += q * sizePrice
      }
    })
    return { totalQuantity: qty, totalPrice: price }
  }, [quantities, allSizes, variantSizePriceMap])

  // Build wholesaleItems array for form submission
  const wholesaleItems = useMemo(() => {
    return allSizes.map((size) => ({
      sizeId: size.id,
      quantity: quantities[size.id] || 0,
    }))
  }, [allSizes, quantities])

  const initialValue: B2BPartnershipOrderFormData = {
    variantId: variantId || '',
    wholesaleItems,
    preferredColor: '',
    companyName: companyProfile?.companyName || '',
    companyINN: companyProfile?.companyINN || '',
    companyAddress: companyProfile?.companyAddress || '',
    customerName: companyProfile?.contactPerson || '',
    customerPhone: companyProfile?.companyPhone || '',
    customerEmail: companyProfile?.companyEmail || '',
    notes: '',
  }

  const handleQuantityChange = (sizeId: string, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [sizeId]: Math.max(0, value),
    }))
  }

  const hasQuantity = totalQuantity > 0

  const handleSubmit = async (data: B2BPartnershipOrderFormData) => {
    // Добавляем актуальные wholesaleItems
    const submitData: B2BPartnershipOrderFormData = {
      ...data,
      wholesaleItems,
    }

    const result: CreateCustomOrderResult = await createB2BPartnershipOrder(productId, submitData)

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
    <PremiumRosstilForm initialValue={initialValue} schema={b2bPartnershipOrderSchema} onSubmit={handleSubmit}>
      <Stack gap={4}>
        <PremiumRosstilForm.Errors />

        <PremiumRosstilForm.Field.Hidden name="variantId" />

        {/* Size table */}
        <Fieldset.Root>
          <Fieldset.Legend>
            Размерная сетка{' '}
            <Text as="span" color="fg.error">
              *
            </Text>
          </Fieldset.Legend>
          <Fieldset.Content>
            <Table.Root size="sm" variant="outline">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Размер</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Цена</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center" width="120px">
                    Кол-во
                  </Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Сумма</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {allSizes.map((size) => {
                  const qty = quantities[size.id] || 0
                  const price = variantSizePriceMap.get(size.id)
                  const hasPrice = price !== undefined
                  const subtotal = hasPrice ? qty * price : 0
                  return (
                    <Table.Row key={size.id}>
                      <Table.Cell fontWeight="medium">{size.international}</Table.Cell>
                      <Table.Cell textAlign="right" color={hasPrice ? 'fg' : 'fg.muted'}>
                        {hasPrice ? price.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' }) : 'Под заказ'}
                      </Table.Cell>
                      <Table.Cell textAlign="center">
                        <NumberInput.Root
                          size="sm"
                          min={0}
                          max={999}
                          width="100px"
                          value={qty.toString()}
                          onValueChange={(e) => handleQuantityChange(size.id, e.valueAsNumber || 0)}
                        >
                          <NumberInput.Control />
                          <NumberInput.Input textAlign="center" />
                        </NumberInput.Root>
                      </Table.Cell>
                      <Table.Cell textAlign="right" color={subtotal > 0 ? 'fg' : 'fg.muted'}>
                        {subtotal > 0 ? subtotal.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' }) : '—'}
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
              <Table.Footer>
                <Table.Row>
                  <Table.Cell fontWeight="bold">Итого</Table.Cell>
                  <Table.Cell />
                  <Table.Cell textAlign="center" fontWeight="bold">
                    {totalQuantity} шт.
                  </Table.Cell>
                  <Table.Cell textAlign="right" fontWeight="bold" color="fg">
                    {totalPrice.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
                  </Table.Cell>
                </Table.Row>
              </Table.Footer>
            </Table.Root>
          </Fieldset.Content>
        </Fieldset.Root>

        <Fieldset.Root>
          <Fieldset.Legend>Реквизиты компании</Fieldset.Legend>
          <Fieldset.Content>
            <PremiumRosstilForm.Field.String
              name="companyName"
              label="Название организации"
              placeholder='ООО "Модный стиль"'
              required
            />

            <PremiumRosstilForm.Field.String name="companyINN" label="ИНН" placeholder="1234567890" required />

            <PremiumRosstilForm.Field.Textarea
              name="companyAddress"
              label="Юридический адрес"
              placeholder="г. Москва, ул. Примерная, д. 1"
              required
            />
          </Fieldset.Content>
        </Fieldset.Root>

        <PremiumRosstilForm.Field.String
          name="preferredColor"
          label="Предпочитаемый цвет"
          placeholder="Чёрный, бежевый, или укажите другой цвет"
          helperText="Укажите если нужен цвет, отличный от представленного"
        />

        <Fieldset.Root>
          <Fieldset.Legend>Контактное лицо</Fieldset.Legend>
          <Fieldset.Content>
            <PremiumRosstilForm.Field.String name="customerName" label="ФИО" placeholder="Иван Иванов" required />

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
              placeholder="ivan@company.ru"
            />
          </Fieldset.Content>
        </Fieldset.Root>

        <PremiumRosstilForm.Field.Textarea
          name="notes"
          label="Комментарий"
          placeholder="Дополнительные пожелания к заказу..."
          rows={3}
        />

        <HStack gap={2} pt={2}>
          <Button type="button" variant="ghost" onClick={onBack} flex={1}>
            Назад
          </Button>
          <Box flex={1}>
            <PremiumRosstilForm.Button.Submit colorPalette="fg" disabled={!variantId || !hasQuantity} width="full">
              Отправить заявку
            </PremiumRosstilForm.Button.Submit>
          </Box>
        </HStack>

        {!hasQuantity && (
          <Text fontSize="sm" color="fg.muted" textAlign="center">
            Укажите количество хотя бы для одного размера
          </Text>
        )}
      </Stack>
    </PremiumRosstilForm>
  )
}
