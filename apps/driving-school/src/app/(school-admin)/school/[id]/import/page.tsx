import { getSession } from '@/lib/auth'
import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSchoolForImport } from './_actions/import.action'
import { ImportWizard } from './_components/import-wizard/import-wizard'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const result = await getSchoolForImport(id)

  if (!result.success) {
    return { title: 'Импорт данных' }
  }

  return {
    title: `Импорт — ${result.school.name}`,
    description: `Импорт учеников и инструкторов в школу ${result.school.name}`,
  }
}

export default async function ImportPage({ params }: Props) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { id: schoolId } = await params
  const result = await getSchoolForImport(schoolId)

  if (!result.success) {
    if (result.error === 'NOT_FOUND') {
      notFound()
    }
    if (result.error === 'NOT_MEMBER' || result.error === 'NOT_AUTHORIZED') {
      return (
        <Container maxW="container.lg" py={8}>
          <VStack gap={6} align="stretch">
            <Box layerStyle="panel.error" p={6} textAlign="center">
              <Heading size="lg" color="error.fg">
                Доступ запрещён
              </Heading>
              <Text color="error.fg" mt={2}>
                Только администраторы и менеджеры могут импортировать данные
              </Text>
              <Link href="/school/stats">
                <Button mt={4} colorPalette="brand">
                  К списку школ
                </Button>
              </Link>
            </Box>
          </VStack>
        </Container>
      )
    }
    redirect('/sign-in')
  }

  const { school } = result

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        <Heading size="xl">Импорт данных — {school.name}</Heading>

        <Box bg="bg.panel" p={6} borderRadius="lg" shadow="sm" borderWidth="1px">
          <ImportWizard schoolId={school.id} schoolName={school.name} />
        </Box>
      </VStack>
    </Container>
  )
}
