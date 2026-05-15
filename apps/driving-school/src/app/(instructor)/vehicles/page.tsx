import { getSession } from '@/lib/auth'
import { isInstructor } from '@/lib/roles'
import { Box, Button, Container, Flex, Heading, Icon, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuCar, LuPlus } from 'react-icons/lu'
import { getVehicles } from './_actions/vehicle.action'
import { VehicleCard } from './_components/vehicle-card'

/** Обёртки иконок для Server Components (функции нельзя передавать напрямую) */
const PlusIcon = () => <LuPlus />
const CarIcon = () => <LuCar />

export const metadata = {
  title: 'Мои автомобили',
}

export default async function VehiclesPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  if (!isInstructor(session.user.roles)) {
    redirect('/dashboard')
  }

  const result = await getVehicles()

  if (!result.success) {
    return (
      <Container maxW="container.lg" py={8}>
        <Text color="red.fg">
          {result.error === 'NO_PROFILE' ? 'Сначала заполните профиль инструктора' : 'Ошибка загрузки автомобилей'}
        </Text>
      </Container>
    )
  }

  const { vehicles } = result
  const activeVehicles = vehicles.filter((v) => v.isActive)
  const inactiveVehicles = vehicles.filter((v) => !v.isActive)

  return (
    <Container maxW="container.lg" py={8}>
      <Stack gap={6}>
        {/* Заголовок */}
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
          <Box>
            <Heading size="xl">Мои автомобили</Heading>
            <Text color="fg.muted" mt={1}>
              Управляйте списком автомобилей для обучения
            </Text>
          </Box>
          <Button asChild colorPalette="brand" size="lg">
            <Link href="/vehicles/create">
              <Icon mr={2}>
                <PlusIcon />
              </Icon>
              Добавить авто
            </Link>
          </Button>
        </Flex>

        {/* Список автомобилей */}
        {vehicles.length === 0 ? (
          <Box textAlign="center" py={12}>
            <Icon boxSize={16} color="fg.muted" mb={4}>
              <CarIcon />
            </Icon>
            <Heading size="md" mb={2}>
              Нет автомобилей
            </Heading>
            <Text color="fg.muted" mb={6}>
              Добавьте автомобили, на которых вы проводите обучение
            </Text>
            <Button asChild colorPalette="brand">
              <Link href="/vehicles/create">
                <Icon mr={2}>
                  <PlusIcon />
                </Icon>
                Добавить первый автомобиль
              </Link>
            </Button>
          </Box>
        ) : (
          <Stack gap={4}>
            {/* Активные автомобили */}
            {activeVehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}

            {/* Неактивные автомобили */}
            {inactiveVehicles.length > 0 && (
              <>
                <Text color="fg.muted" fontWeight="medium" mt={4}>
                  Неактивные автомобили ({inactiveVehicles.length})
                </Text>
                {inactiveVehicles.map((vehicle) => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} />
                ))}
              </>
            )}
          </Stack>
        )}
      </Stack>
    </Container>
  )
}
