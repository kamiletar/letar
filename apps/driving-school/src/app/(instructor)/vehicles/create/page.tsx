import { getSession } from '@/lib/auth'
import { isInstructor } from '@/lib/roles'
import { Box, Container, Heading, Text } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { VehicleForm } from '../_components/vehicle-form'

export const metadata = {
  title: 'Добавить автомобиль',
}

export default async function CreateVehiclePage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  if (!isInstructor(session.user.roles)) {
    redirect('/dashboard')
  }

  return (
    <Container maxW="container.md" py={8}>
      <Box mb={8}>
        <Heading size="xl">Добавить автомобиль</Heading>
        <Text color="fg.muted" mt={1}>
          Укажите информацию об автомобиле для обучения
        </Text>
      </Box>

      <VehicleForm submitLabel="Добавить" />
    </Container>
  )
}
