import { getSession } from '@/lib/auth'
import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSchoolForExport, getSchoolInstructors } from './_actions/export.action'
import { ExportPanel } from './_components/export-panel'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const result = await getSchoolForExport(id)

  if (!result.success) {
    return { title: 'Экспорт данных' }
  }

  return {
    title: `Экспорт — ${result.school.name}`,
    description: `Экспорт данных школы ${result.school.name}`,
  }
}

export default async function ExportPage({ params }: Props) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { id: schoolId } = await params
  const [schoolResult, instructorsResult] = await Promise.all([
    getSchoolForExport(schoolId),
    getSchoolInstructors(schoolId),
  ])

  if (!schoolResult.success) {
    if (schoolResult.error === 'NOT_FOUND') {
      notFound()
    }
    if (schoolResult.error === 'NOT_MEMBER' || schoolResult.error === 'NOT_AUTHORIZED') {
      return (
        <Container maxW="container.lg" py={8}>
          <VStack gap={6} align="stretch">
            <Box layerStyle="panel.error" p={6} textAlign="center">
              <Heading size="lg" color="error.fg">
                Доступ запрещён
              </Heading>
              <Text color="error.fg" mt={2}>
                Только администраторы и менеджеры могут экспортировать данные
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

  const { school, stats } = schoolResult
  const instructors = instructorsResult.success ? instructorsResult.instructors : []

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        <Box bg="bg.panel" p={6} borderRadius="lg" shadow="sm" borderWidth="1px">
          <ExportPanel schoolId={school.id} schoolName={school.name} stats={stats} instructors={instructors} />
        </Box>
      </VStack>
    </Container>
  )
}
