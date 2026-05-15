import { Box, Heading, Link, Stack } from '@chakra-ui/react'
import { ContentPageForm } from '../_components/content-page-form'
import { createContentPage } from './_actions/create-content-page.action'

export const metadata = {
  title: 'Создать страницу - Админ',
}

export default function NewContentPagePage() {
  return (
    <Box>
      <Stack direction="row" justify="space-between" align="center" mb={6}>
        <Heading size="lg">Создать страницу</Heading>
        <Link href="/admin/content-pages" color="fg" _hover={{ color: 'white' }}>
          ← К списку страниц
        </Link>
      </Stack>

      <Box maxW="800px">
        <ContentPageForm onSubmit={createContentPage} />
      </Box>
    </Box>
  )
}
