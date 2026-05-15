# Checkout Flow

## Этапы оформления

```
1. Корзина → 2. Контакты → 3. Доставка → 4. Оплата → 5. Подтверждение
```

## Модель доставки

```zmodel
model Shipping {
  id            String        @id @default(cuid())
  orderId       String        @unique
  order         Order         @relation(fields: [orderId], references: [id])

  method        ShippingMethod
  address       Json          // Структурированный адрес
  trackingNumber String?
  carrier       String?       // Название ТК

  estimatedDate DateTime?
  shippedAt     DateTime?
  deliveredAt   DateTime?

  cost          Int           // Стоимость в копейках
}

enum ShippingMethod {
  PICKUP        // Самовывоз
  COURIER       // Курьер
  POST          // Почта России
  CDEK          // СДЭК
  BOXBERRY      // Boxberry
}
```

## Форма оформления заказа

```tsx
// app/checkout/page.tsx
'use client'

import { ChakraFormField, FormGroup, useAppForm } from '@letar/forms'
import { use, useState } from 'react'
import { checkoutSchema } from './_schemas/checkout.schema'

const STEPS = ['cart', 'contacts', 'shipping', 'payment', 'confirmation'] as const

export default function CheckoutPage() {
  const [step, setStep] = useState<(typeof STEPS)[number]>('cart')
  const { data: cart } = useCart()

  const form = useAppForm({
    schema: checkoutSchema,
    defaultValues: {
      email: '',
      phone: '',
      firstName: '',
      lastName: '',
      shippingMethod: 'COURIER',
      address: {
        city: '',
        street: '',
        building: '',
        apartment: '',
        postalCode: '',
      },
      promoCode: '',
      customerNote: '',
    },
  })

  function nextStep() {
    const currentIndex = STEPS.indexOf(step)
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1])
    }
  }

  function prevStep() {
    const currentIndex = STEPS.indexOf(step)
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1])
    }
  }

  return (
    <form.Provider>
      <VStack gap={8} maxW="800px" mx="auto" py={8}>
        <CheckoutProgress currentStep={step} steps={STEPS} />

        {step === 'cart' && <CartReview cart={cart} onNext={nextStep} />}

        {step === 'contacts' && <ContactsStep form={form} onNext={nextStep} onBack={prevStep} />}

        {step === 'shipping' && <ShippingStep form={form} onNext={nextStep} onBack={prevStep} />}

        {step === 'payment' && <PaymentStep form={form} cart={cart} onBack={prevStep} />}

        {step === 'confirmation' && <ConfirmationStep />}
      </VStack>
    </form.Provider>
  )
}
```

## Схема валидации

```typescript
// app/checkout/_schemas/checkout.schema.ts
import { z } from 'zod/v4'

export const addressSchema = z.object({
  city: z.string().min(1, 'Укажите город'),
  street: z.string().min(1, 'Укажите улицу'),
  building: z.string().min(1, 'Укажите дом'),
  apartment: z.string().optional(),
  postalCode: z.string().regex(/^\d{6}$/, 'Индекс: 6 цифр'),
})

export const checkoutSchema = z
  .object({
    email: z.email('Некорректный email'),
    phone: z.string().regex(/^\+7\d{10}$/, 'Формат: +7XXXXXXXXXX'),
    firstName: z.string().min(2, 'Минимум 2 символа'),
    lastName: z.string().min(2, 'Минимум 2 символа'),

    shippingMethod: z.enum(['PICKUP', 'COURIER', 'POST', 'CDEK', 'BOXBERRY']),
    address: addressSchema.optional(),
    pickupPointId: z.string().optional(),

    promoCode: z.string().optional(),
    customerNote: z.string().max(500).optional(),
  })
  .refine((data) => data.shippingMethod === 'PICKUP' || data.address, {
    message: 'Укажите адрес доставки',
    path: ['address'],
  })

export type CheckoutFormData = z.infer<typeof checkoutSchema>
```

## Шаг контактов

```tsx
// app/checkout/_components/ContactsStep.tsx
interface ContactsStepProps {
  form: UseFormReturn<CheckoutFormData>
  onNext: () => void
  onBack: () => void
}

export function ContactsStep({ form, onNext, onBack }: ContactsStepProps) {
  const { data: session } = useSession()

  // Автозаполнение из профиля
  useEffect(() => {
    if (session?.user) {
      form.setValue('email', session.user.email || '')
      form.setValue('phone', session.user.phone || '')
      form.setValue('firstName', session.user.firstName || '')
      form.setValue('lastName', session.user.lastName || '')
    }
  }, [session, form])

  async function handleNext() {
    const valid = await form.trigger(['email', 'phone', 'firstName', 'lastName'])
    if (valid) onNext()
  }

  return (
    <VStack gap={6} w="full">
      <Heading size="lg">Контактные данные</Heading>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} w="full">
        <form.Field name="firstName">
          {(field) => (
            <ChakraFormField label="Имя" field={field}>
              <Input {...field.getInputProps()} />
            </ChakraFormField>
          )}
        </form.Field>

        <form.Field name="lastName">
          {(field) => (
            <ChakraFormField label="Фамилия" field={field}>
              <Input {...field.getInputProps()} />
            </ChakraFormField>
          )}
        </form.Field>

        <form.Field name="email">
          {(field) => (
            <ChakraFormField label="Email" field={field}>
              <Input type="email" {...field.getInputProps()} />
            </ChakraFormField>
          )}
        </form.Field>

        <form.Field name="phone">
          {(field) => (
            <ChakraFormField label="Телефон" field={field}>
              <Input type="tel" placeholder="+7" {...field.getInputProps()} />
            </ChakraFormField>
          )}
        </form.Field>
      </SimpleGrid>

      <HStack w="full" justify="space-between">
        <Button variant="ghost" onClick={onBack}>
          Назад
        </Button>
        <Button colorPalette="brand" onClick={handleNext}>
          Далее
        </Button>
      </HStack>
    </VStack>
  )
}
```

## Шаг доставки

```tsx
// app/checkout/_components/ShippingStep.tsx
const SHIPPING_METHODS = [
  { value: 'COURIER', label: 'Курьер', price: 35000, days: '1-2 дня' },
  { value: 'CDEK', label: 'СДЭК', price: 25000, days: '3-5 дней' },
  { value: 'POST', label: 'Почта России', price: 20000, days: '7-14 дней' },
  { value: 'PICKUP', label: 'Самовывоз', price: 0, days: 'Завтра' },
]

export function ShippingStep({ form, onNext, onBack }: ShippingStepProps) {
  const method = form.watch('shippingMethod')

  async function handleNext() {
    const fields = method === 'PICKUP' ? ['shippingMethod', 'pickupPointId'] : ['shippingMethod', 'address']

    const valid = await form.trigger(fields as any)
    if (valid) onNext()
  }

  return (
    <VStack gap={6} w="full">
      <Heading size="lg">Способ доставки</Heading>

      <form.Field name="shippingMethod">
        {(field) => (
          <RadioGroup.Root value={field.state.value} onValueChange={({ value }) => field.handleChange(value)}>
            <VStack align="stretch" gap={3}>
              {SHIPPING_METHODS.map((method) => (
                <Box
                  key={method.value}
                  p={4}
                  borderWidth={1}
                  borderRadius="lg"
                  cursor="pointer"
                  onClick={() => field.handleChange(method.value)}
                  borderColor={field.state.value === method.value ? 'brand.500' : 'border'}
                >
                  <HStack justify="space-between">
                    <HStack>
                      <RadioGroup.Item value={method.value} />
                      <Text fontWeight="medium">{method.label}</Text>
                    </HStack>
                    <VStack align="end" gap={0}>
                      <Text>{method.price ? formatPrice(method.price) : 'Бесплатно'}</Text>
                      <Text fontSize="sm" color="fg.muted">
                        {method.days}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </RadioGroup.Root>
        )}
      </form.Field>

      {method === 'PICKUP' ? <PickupPointSelector form={form} /> : <AddressForm form={form} />}

      <HStack w="full" justify="space-between">
        <Button variant="ghost" onClick={onBack}>
          Назад
        </Button>
        <Button colorPalette="brand" onClick={handleNext}>
          Далее
        </Button>
      </HStack>
    </VStack>
  )
}
```

## Форма адреса

```tsx
// app/checkout/_components/AddressForm.tsx
export function AddressForm({ form }: { form: UseFormReturn<CheckoutFormData> }) {
  return (
    <VStack gap={4} w="full">
      <form.Field name="address.city">
        {(field) => (
          <ChakraFormField label="Город" field={field}>
            <Input {...field.getInputProps()} />
          </ChakraFormField>
        )}
      </form.Field>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} w="full">
        <form.Field name="address.street">
          {(field) => (
            <ChakraFormField label="Улица" field={field}>
              <Input {...field.getInputProps()} />
            </ChakraFormField>
          )}
        </form.Field>

        <HStack>
          <form.Field name="address.building">
            {(field) => (
              <ChakraFormField label="Дом" field={field}>
                <Input {...field.getInputProps()} />
              </ChakraFormField>
            )}
          </form.Field>

          <form.Field name="address.apartment">
            {(field) => (
              <ChakraFormField label="Квартира" field={field}>
                <Input {...field.getInputProps()} />
              </ChakraFormField>
            )}
          </form.Field>
        </HStack>

        <form.Field name="address.postalCode">
          {(field) => (
            <ChakraFormField label="Индекс" field={field}>
              <Input maxLength={6} {...field.getInputProps()} />
            </ChakraFormField>
          )}
        </form.Field>
      </SimpleGrid>
    </VStack>
  )
}
```

## Шаг оплаты (итоговый)

```tsx
// app/checkout/_components/PaymentStep.tsx
export function PaymentStep({ form, cart, onBack }: PaymentStepProps) {
  const createOrder = useCreateOrder()
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [freeShipping, setFreeShipping] = useState(false)

  const shippingMethod = form.watch('shippingMethod')
  const shippingCost = freeShipping ? 0 : getShippingCost(shippingMethod)

  const subtotal = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const total = subtotal - promoDiscount + shippingCost

  async function handleSubmit() {
    const data = form.getValues()

    await createOrder.mutateAsync({
      ...data,
      items: cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      })),
    })
  }

  return (
    <VStack gap={6} w="full">
      <Heading size="lg">Оформление заказа</Heading>

      {/* Сводка заказа */}
      <Box w="full" p={4} bg="bg.muted" borderRadius="lg">
        <VStack align="stretch" gap={2}>
          {cart.items.map((item) => (
            <HStack key={item.id} justify="space-between">
              <Text>
                {item.product.name} × {item.quantity}
              </Text>
              <Text>{formatPrice(item.product.price * item.quantity)}</Text>
            </HStack>
          ))}

          <Separator />

          <HStack justify="space-between">
            <Text>Товары</Text>
            <Text>{formatPrice(subtotal)}</Text>
          </HStack>

          <HStack justify="space-between">
            <Text>Доставка</Text>
            <Text>{shippingCost ? formatPrice(shippingCost) : 'Бесплатно'}</Text>
          </HStack>

          {promoDiscount > 0 && (
            <HStack justify="space-between" color="green.500">
              <Text>Скидка</Text>
              <Text>-{formatPrice(promoDiscount)}</Text>
            </HStack>
          )}

          <Separator />

          <HStack justify="space-between" fontWeight="bold" fontSize="lg">
            <Text>Итого</Text>
            <Text>{formatPrice(total)}</Text>
          </HStack>
        </VStack>
      </Box>

      {/* Промокод */}
      <PromoCodeInput
        items={cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity }))}
        onApply={(discount, free) => {
          setPromoDiscount(discount)
          setFreeShipping(free)
        }}
      />

      {/* Комментарий */}
      <form.Field name="customerNote">
        {(field) => (
          <ChakraFormField label="Комментарий к заказу" field={field}>
            <Textarea placeholder="Пожелания по доставке, подарочная упаковка и т.д." {...field.getInputProps()} />
          </ChakraFormField>
        )}
      </form.Field>

      {/* Согласие */}
      <Text fontSize="sm" color="fg.muted">
        Нажимая «Оформить заказ», вы соглашаетесь с <Link href="/terms">условиями использования</Link> и{' '}
        <Link href="/privacy">политикой конфиденциальности</Link>
      </Text>

      <HStack w="full" justify="space-between">
        <Button variant="ghost" onClick={onBack}>
          Назад
        </Button>
        <Button colorPalette="brand" size="lg" onClick={handleSubmit} loading={createOrder.isPending}>
          Оформить заказ
        </Button>
      </HStack>
    </VStack>
  )
}
```

## Прогресс оформления

```tsx
// app/checkout/_components/CheckoutProgress.tsx
export function CheckoutProgress({ currentStep, steps }: { currentStep: string; steps: readonly string[] }) {
  const stepLabels: Record<string, string> = {
    cart: 'Корзина',
    contacts: 'Контакты',
    shipping: 'Доставка',
    payment: 'Оплата',
    confirmation: 'Готово',
  }

  const currentIndex = steps.indexOf(currentStep as any)

  return (
    <HStack w="full" justify="space-between" position="relative">
      {/* Линия прогресса */}
      <Box position="absolute" top="50%" left={0} right={0} h="2px" bg="border" zIndex={0} />
      <Box
        position="absolute"
        top="50%"
        left={0}
        w={`${(currentIndex / (steps.length - 1)) * 100}%`}
        h="2px"
        bg="brand.500"
        zIndex={1}
        transition="width 0.3s"
      />

      {steps.map((step, index) => (
        <VStack key={step} zIndex={2}>
          <Circle
            size={8}
            bg={index <= currentIndex ? 'brand.500' : 'bg.muted'}
            color={index <= currentIndex ? 'white' : 'fg.muted'}
          >
            {index < currentIndex ? <FiCheck /> : index + 1}
          </Circle>
          <Text fontSize="sm" fontWeight={step === currentStep ? 'bold' : 'normal'}>
            {stepLabels[step]}
          </Text>
        </VStack>
      ))}
    </HStack>
  )
}
```

## Правила

- **MUST** валидировать каждый шаг перед переходом
- **MUST** пересчитывать итого на сервере
- **SHOULD** сохранять прогресс в localStorage для восстановления
- **SHOULD** автозаполнять данные авторизованного пользователя
- **NEVER** переходить к оплате без проверки наличия товаров
