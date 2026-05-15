import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Container, Heading } from '@chakra-ui/react'
import { AddressForm } from '../_components/address-form'
import { createAddress } from './_actions/create-address'

export const metadata = {
  title: 'Добавить адрес — Премиум РосСтиль',
  description: 'Добавление нового адреса доставки',
}

export default async function NewAddressPage() {
  // Проверка авторизации
  const authUser = await requireAuth()

  // Получаем профиль для номера телефона
  const db = getEnhancedPrisma(authUser)
  const userProfile = await db.userProfile.findUnique({
    where: { userId: authUser.id },
    select: { phoneNumber: true },
  })

  // Предзаполнение формы данными из профиля
  const defaultValue = {
    recipientName: authUser.name || '',
    phone: userProfile?.phoneNumber || '',
  }

  return (
    <Container maxW="3xl" py={8}>
      <Heading size="3xl" mb={8} textTransform="none">
        Добавить адрес
      </Heading>

      <AddressForm action={createAddress} defaultValue={defaultValue} submitLabel="Добавить адрес" />
    </Container>
  )
}
