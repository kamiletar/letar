import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, Heading, Link, Stack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { MandalaForm } from '../../_components/mandala-form'
import { deleteMandala } from './_actions/delete-mandala.action'
import { updateMandala } from './_actions/update-mandala.action'

export const metadata = {
  title: 'Редактировать мандалу - Админ',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditMandalaPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()

  if (!session?.user || session.user.role !== 'ADMIN') {
    return notFound()
  }

  const db = getEnhancedPrisma(session.user)
  const mandala = await db.mandala.findUnique({
    where: { id },
  })

  if (!mandala) {
    return notFound()
  }

  const deleteAction = deleteMandala.bind(null, id)

  return (
    <Box>
      <Stack direction="row" justify="space-between" align="center" mb={6}>
        <Heading size="lg">Редактировать: {mandala.name}</Heading>
        <Stack direction="row" gap={4}>
          <Link href={`/admin/mandalas/${mandala.id}`} color="fg" _hover={{ color: 'fg.brand' }}>
            Просмотр
          </Link>
          <Link href="/admin/mandalas" color="fg.muted" _hover={{ color: 'fg.brand' }}>
            ← К списку
          </Link>
        </Stack>
      </Stack>

      <Box maxW="600px">
        <MandalaForm mandala={mandala} onSubmit={updateMandala.bind(null, id)} />

        <Box mt={8} pt={6} borderTopWidth="1px" borderColor="border.subtle">
          <form action={deleteAction}>
            <Button type="submit" colorPalette="red" variant="outline">
              Удалить мандалу
            </Button>
          </form>
        </Box>
      </Box>
    </Box>
  )
}
