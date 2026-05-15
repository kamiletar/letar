'use client'

import { AboiForm } from '@/aboi-form'
import { AddressCreateFormSchema } from '@/generated/form-schemas'
import { Badge, Box, Button, Flex, HStack, Stack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createAddressAction, deleteAddressAction, updateAddressAction } from '../../_actions/profile.action'

// userId устанавливается на сервере — исключаем из формы
const AddressFormSchema = AddressCreateFormSchema.omit({ userId: true }).strip()

type AddressFormValue = {
  fullName: string
  phone: string
  country: string
  region: string
  city: string
  street: string
  building: string
  apartment?: string | null
  postalCode: string
  isDefault: boolean
}

interface AddressView {
  id: string
  fullName: string
  phone: string
  country: string
  region: string
  city: string
  street: string
  building: string
  apartment: string
  postalCode: string
  isDefault: boolean
}

const EMPTY_ADDRESS: AddressFormValue = {
  fullName: '',
  phone: '',
  country: 'RU',
  region: '',
  city: '',
  street: '',
  building: '',
  apartment: '',
  postalCode: '',
  isDefault: false,
}

export function AddressList({ addresses }: { addresses: AddressView[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<{ id: string | null; initial: AddressFormValue } | null>(null)
  const [isPending, startTransition] = useTransition()

  function startCreate() {
    setEditing({ id: null, initial: EMPTY_ADDRESS })
  }

  function startEdit(a: AddressView) {
    setEditing({
      id: a.id,
      initial: {
        fullName: a.fullName,
        phone: a.phone,
        country: a.country,
        region: a.region,
        city: a.city,
        street: a.street,
        building: a.building,
        apartment: a.apartment,
        postalCode: a.postalCode,
        isDefault: a.isDefault,
      },
    })
  }

  function remove(id: string) {
    if (!confirm('Удалить адрес?')) {
      return
    }
    startTransition(async () => {
      await deleteAddressAction(id)
      router.refresh()
    })
  }

  return (
    <Stack gap={4}>
      {addresses.length === 0 && !editing && (
        <Box p={12} bg="bg.subtle" borderRadius="xl" textAlign="center">
          <Text color="fg.muted">Сохранённых адресов нет</Text>
        </Box>
      )}

      {addresses.map((a) => (
        <Flex
          key={a.id}
          gap={4}
          p={4}
          borderWidth="1px"
          borderColor={a.isDefault ? 'brand.solid' : 'border'}
          borderRadius="lg"
          bg="bg.surface"
          justify="space-between"
          wrap="wrap"
        >
          <Stack gap={1} flex="1" minW="200px">
            <HStack gap={2}>
              <Text fontWeight="semibold">{a.fullName}</Text>
              {a.isDefault && <Badge colorPalette="brand">По умолчанию</Badge>}
            </HStack>
            <Text fontSize="sm" color="fg.muted">
              {a.phone}
            </Text>
            <Text fontSize="sm">
              {a.postalCode}, {a.country}, {a.region}, {a.city}, {a.street} {a.building}
              {a.apartment ? `, кв. ${a.apartment}` : ''}
            </Text>
          </Stack>
          <HStack gap={2}>
            <Button size="sm" variant="outline" onClick={() => startEdit(a)} disabled={isPending}>
              Редактировать
            </Button>
            <Button size="sm" variant="ghost" colorPalette="red" onClick={() => remove(a.id)} loading={isPending}>
              Удалить
            </Button>
          </HStack>
        </Flex>
      ))}

      {!editing && (
        <Button alignSelf="flex-start" colorPalette="brand" onClick={startCreate}>
          + Добавить адрес
        </Button>
      )}

      {editing && (
        <Box p={5} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.surface">
          <Text fontWeight="semibold" mb={4}>
            {editing.id ? 'Редактирование адреса' : 'Новый адрес'}
          </Text>
          <AddressForm
            initialValue={editing.initial}
            addressId={editing.id ?? undefined}
            onSuccess={() => {
              setEditing(null)
              router.refresh()
            }}
            onCancel={() => setEditing(null)}
          />
        </Box>
      )}
    </Stack>
  )
}

interface AddressFormProps {
  initialValue: AddressFormValue
  addressId?: string
  onSuccess: () => void
  onCancel: () => void
}

function AddressForm({ initialValue, addressId, onSuccess, onCancel }: AddressFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  return (
    <Stack gap={0}>
      {submitError && (
        <Box bg="red.subtle" color="red.fg" p={3} borderRadius="md" fontSize="sm" mb={4}>
          {submitError}
        </Box>
      )}
      <AboiForm
        schema={AddressFormSchema}
        initialValue={initialValue}
        onSubmit={async (value) => {
          setSubmitError(null)
          const payload = {
            ...value,
            apartment: value.apartment?.trim() || null,
          }
          const result = addressId ? await updateAddressAction(addressId, payload) : await createAddressAction(payload)
          if (!result.ok) {
            setSubmitError(result.error ?? 'Не удалось сохранить адрес')
            return
          }
          onSuccess()
        }}
      >
        <AboiForm.Field.String name="fullName" required />
        <AboiForm.Field.Phone name="phone" required />
        <AboiForm.Field.String name="country" />
        <AboiForm.Field.String name="region" required />
        <AboiForm.Field.String name="city" required />
        <AboiForm.Field.String name="street" required />
        <AboiForm.Field.String name="building" required />
        <AboiForm.Field.String name="apartment" />
        <AboiForm.Field.String name="postalCode" required />
        <AboiForm.Field.Checkbox name="isDefault" label="Использовать как адрес по умолчанию" />
        <AboiForm.Errors />
        <HStack gap={2} mt={2}>
          <AboiForm.Button.Submit>Сохранить</AboiForm.Button.Submit>
          <Button variant="ghost" onClick={onCancel} type="button">
            Отмена
          </Button>
        </HStack>
      </AboiForm>
    </Stack>
  )
}
