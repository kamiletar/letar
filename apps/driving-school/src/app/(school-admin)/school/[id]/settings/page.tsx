import { getSession } from '@/lib/auth'
import { Box, Button, Container, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { LuFileSpreadsheet } from 'react-icons/lu'
import { getSchoolForSettings } from './_actions/update-school.action'
import { ApiKeysSection } from './_components/api-keys-section'
import { ApiLogsSection } from './_components/api-logs-section'
import { SchoolSettingsForm } from './_components/school-settings-form'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const result = await getSchoolForSettings(id)

  if (!result.success) {
    return { title: 'Настройки школы' }
  }

  return {
    title: `Настройки — ${result.school.name}`,
    description: `Настройки автошколы ${result.school.name}`,
  }
}

export default async function SchoolSettingsPage({ params }: Props) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { id: schoolId } = await params
  const result = await getSchoolForSettings(schoolId)

  if (!result.success) {
    if (result.error === 'NOT_FOUND') {
      notFound()
    }
    if (result.error === 'NOT_ADMIN') {
      return (
        <Container maxW="container.lg" py={8}>
          <VStack gap={6} align="stretch">
            <Box layerStyle="panel.error" p={6} textAlign="center">
              <Heading size="lg" color="error.fg">
                Доступ запрещён
              </Heading>
              <Text color="error.fg" mt={2}>
                Только администраторы могут изменять настройки школы
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
      <VStack gap={8} align="stretch">
        {/* Заголовок страницы */}
        <Heading size="xl">Настройки школы</Heading>

        {/* Основные настройки школы */}
        <Box bg="bg.panel" p={6} borderRadius="lg" shadow="sm" borderWidth="1px" maxW="container.md">
          <SchoolSettingsForm school={school} />
        </Box>

        {/* Импорт данных */}
        <Box bg="bg.panel" p={6} borderRadius="lg" shadow="sm" borderWidth="1px" maxW="container.md">
          <VStack align="stretch" gap={4}>
            <Heading size="md">Импорт данных</Heading>
            <Text color="fg.muted">Импортируйте учеников и инструкторов из Excel или LibreOffice файлов</Text>
            <HStack>
              <Link href={`/school/${schoolId}/import/`}>
                <Button colorPalette="brand" variant="outline">
                  <Icon asChild mr={2}>
                    <LuFileSpreadsheet />
                  </Icon>
                  Импорт из Excel
                </Button>
              </Link>
            </HStack>
          </VStack>
        </Box>

        {/* API-ключи */}
        <ApiKeysSection schoolId={schoolId} />

        {/* Логи API */}
        <ApiLogsSection schoolId={schoolId} />
      </VStack>
    </Container>
  )
}
