import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Container, Heading } from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { AddressForm } from '../../_components/address-form'
import { updateAddress } from './_actions/update-address'

export const metadata = {
  title: 'Редактировать адрес — Премиум РосСтиль',
  description: 'Редактирование адреса доставки',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditAddressPage({ params }: PageProps) {
  // Проверка авторизации
  const authUser = await requireAuth()

  // Получение параметров (async в Next.js 16)
  const { id } = await params

  // Получение адреса
  const db = getEnhancedPrisma(authUser)
  const address = await db.address.findUnique({
    where: { id },
  })

  if (!address) {
    notFound()
  }

  // Биндинг ID к action
  const updateAction = updateAddress.bind(null, id)

  return (
    <Container maxW="3xl" py={8}>
      <Heading size="3xl" mb={8} textTransform="none">
        Редактировать адрес
      </Heading>

      <AddressForm
        action={updateAction}
        defaultValue={{
          label: address.label,
          fullAddress: address.fullAddress,
          postalCode: address.postalCode || undefined,
          country: address.country,
          region: address.region || undefined,
          city: address.city || undefined,
          street: address.street || undefined,
          house: address.house || undefined,
          block: address.block || undefined,
          entrance: address.entrance || undefined,
          floor: address.floor || undefined,
          flat: address.flat || undefined,
          recipientName: address.recipientName,
          phone: address.phone,
          isDefault: address.isDefault,
        }}
        submitLabel="Сохранить изменения"
      />
    </Container>
  )
}
