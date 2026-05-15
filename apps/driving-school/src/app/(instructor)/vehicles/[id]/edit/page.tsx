import { getSession } from '@/lib/auth'
import { isInstructor } from '@/lib/roles'
import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react'
import { notFound, redirect } from 'next/navigation'
import { getVehicle } from '../../_actions/vehicle.action'
import { VehicleForm } from '../../_components/vehicle-form'
import { VehiclePhotos } from '../../_components/vehicle-photos'

export const metadata = {
  title: 'Редактировать автомобиль',
}

interface EditVehiclePageProps {
  params: Promise<{ id: string }>
}

export default async function EditVehiclePage({ params }: EditVehiclePageProps) {
  const session = await getSession()
  const { id } = await params

  if (!session?.user) {
    redirect('/sign-in')
  }

  if (!isInstructor(session.user.roles)) {
    redirect('/dashboard')
  }

  const result = await getVehicle(id)

  if (!result.success) {
    if (result.error === 'NOT_FOUND') {
      notFound()
    }
    return (
      <Container maxW="container.md" py={8}>
        <Text color="red.fg">Ошибка загрузки автомобиля</Text>
      </Container>
    )
  }

  const { vehicle } = result

  return (
    <Container maxW="container.md" py={8}>
      <Box mb={8}>
        <Heading size="xl">Редактировать автомобиль</Heading>
        <Text color="fg.muted" mt={1}>
          {vehicle.brand} {vehicle.model}
        </Text>
      </Box>

      <Stack gap={8}>
        <VehiclePhotos vehicleId={vehicle.id} files={vehicle.files ?? []} />

        <VehicleForm defaultValues={vehicle} submitLabel="Сохранить" />
      </Stack>
    </Container>
  )
}
