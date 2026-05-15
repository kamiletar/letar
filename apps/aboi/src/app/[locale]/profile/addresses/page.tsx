import { Container, Heading, Stack } from '@chakra-ui/react'
import { requireAuth } from '@/lib/auth-utils'
import { prismaAuth } from '@/lib/prisma'
import { AddressList } from './_components/address-list'

export default async function AddressesPage() {
  const user = await requireAuth()
  const addresses = await prismaAuth.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })

  return (
    <Container maxW="3xl" py={{ base: 8, md: 12 }}>
      <Stack gap={6}>
        <Heading as="h1" size="3xl">
          Адреса доставки
        </Heading>
        <AddressList
          addresses={addresses.map((a) => ({
            id: a.id,
            fullName: a.fullName,
            phone: a.phone,
            country: a.country,
            region: a.region,
            city: a.city,
            street: a.street,
            building: a.building,
            apartment: a.apartment ?? '',
            postalCode: a.postalCode,
            isDefault: a.isDefault,
          }))}
        />
      </Stack>
    </Container>
  )
}
