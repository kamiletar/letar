import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, Heading, Link, Stack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { ContentPageForm } from '../../_components/content-page-form'
import { deleteContentPage } from './_actions/delete-content-page.action'
import { updateContentPage } from './_actions/update-content-page.action'

export const metadata = {
  title: 'Редактировать страницу - Админ',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditContentPagePage({ params }: Props) {
  const { id } = await params
  const session = await getSession()

  if (!session?.user || session.user.role !== 'ADMIN') {
    return notFound()
  }

  const db = getEnhancedPrisma(session.user)
  const page = await db.contentPage.findUnique({
    where: { id },
    include: { ogImageRel: true },
  })

  if (!page) {
    return notFound()
  }

  const deleteAction = deleteContentPage.bind(null, id)

  return (
    <Box>
      <Stack direction="row" justify="space-between" align="center" mb={6}>
        <Heading size="lg">Редактировать: {page.title}</Heading>
        <Stack direction="row" gap={4}>
          <Link href={`/admin/content-pages/${page.id}`} color="fg" _hover={{ color: 'fg.brand' }}>
            Просмотр
          </Link>
          <Link href="/admin/content-pages" color="fg.muted" _hover={{ color: 'fg.brand' }}>
            ← К списку
          </Link>
        </Stack>
      </Stack>

      <Box maxW="800px">
        <ContentPageForm contentPage={page} onSubmit={updateContentPage.bind(null, id)} />

        <Box mt={8} pt={6} borderTopWidth="1px" borderColor="border.subtle">
          <form action={deleteAction}>
            <Button type="submit" colorPalette="red" variant="outline">
              Удалить страницу
            </Button>
          </form>
        </Box>
      </Box>
    </Box>
  )
}
