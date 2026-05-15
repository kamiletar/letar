import { getSession } from '@/lib/auth'
import { Box, Heading, Link, Stack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { MandalaForm } from '../_components/mandala-form'
import { createMandala } from './_actions/create-mandala.action'

export const metadata = {
  title: 'Создать мандалу - Админ',
}

export default async function NewMandalaPage() {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return notFound()
  }

  return (
    <Box>
      <Stack direction="row" justify="space-between" align="center" mb={6}>
        <Heading size="lg">Создать мандалу</Heading>
        <Link href="/admin/mandalas" color="fg" _hover={{ color: 'white' }}>
          ← К списку мандал
        </Link>
      </Stack>

      <Box maxW="600px">
        <MandalaForm onSubmit={createMandala} />
      </Box>
    </Box>
  )
}
