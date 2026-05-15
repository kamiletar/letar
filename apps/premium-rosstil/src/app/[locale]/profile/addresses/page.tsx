import { Link } from '@/i18n/navigation'
import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { FaPlus } from 'react-icons/fa'
import { AddressCard } from './_components/address-card'

export const metadata = {
  title: 'Мои адреса — Премиум РосСтиль',
  description: 'Управление адресами доставки',
}

export default async function AddressesPage() {
  // Проверка авторизации
  const authUser = await requireAuth()

  // Получение адресов пользователя
  const db = getEnhancedPrisma(authUser)
  const addresses = await db.address.findMany({
    where: {
      userId: authUser.id,
    },
    orderBy: [
      { isDefault: 'desc' }, // Сначала адрес по умолчанию
      { createdAt: 'desc' }, // Потом по дате создания
    ],
  })

  return (
    <Container maxW="7xl" py={8}>
      {/* Заголовок и кнопка добавления */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={8}>
        <Heading size="3xl" textTransform="none">
          Мои адреса
        </Heading>
        <Button asChild colorPalette="fg">
          <Link href="/profile/addresses/new">
            <FaPlus />
            Добавить адрес
          </Link>
        </Button>
      </Box>

      {addresses.length === 0 ? (
        <Box textAlign="center" py={12}>
          <Text fontSize="xl" color="fg.muted" mb={4}>
            У вас пока нет сохраненных адресов
          </Text>
          <Text color="fg.muted" mb={6}>
            Добавьте адрес доставки для быстрого оформления заказов
          </Text>
          <Button asChild colorPalette="fg">
            <Link href="/profile/addresses/new">
              <FaPlus />
              Добавить первый адрес
            </Link>
          </Button>
        </Box>
      ) : (
        <VStack align="stretch" gap={4}>
          {addresses.map((address: (typeof addresses)[number]) => (
            <AddressCard key={address.id} address={address} />
          ))}
        </VStack>
      )}
    </Container>
  )
}
