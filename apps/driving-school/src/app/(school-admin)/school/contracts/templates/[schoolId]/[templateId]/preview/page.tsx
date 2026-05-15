import { Box, Button, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuArrowLeft, LuEye } from 'react-icons/lu'

import { createTestData, renderTemplate } from '@letar/contract-generator'

import { SafeHtml } from '@/app/_components/ui/safe-html'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const metadata = {
  title: 'Предпросмотр шаблона',
  description: 'Предпросмотр шаблона договора с тестовыми данными',
}

interface Props {
  params: Promise<{ schoolId: string; templateId: string }>
}

export default async function TemplatePreviewPage({ params }: Props) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { schoolId, templateId } = await params

  // Загружаем шаблон с текущей версией
  const template = await prisma.contractTemplate.findFirst({
    where: {
      id: templateId,
      organization: {
        members: {
          some: {
            userId: session.user.id,
            role: { in: ['owner', 'super_manager', 'manager'] },
          },
        },
      },
    },
    include: {
      currentVersion: true,
      organization: {
        select: { name: true },
      },
    },
  })

  if (!template) {
    return (
      <Box layerStyle="panel.error" p={6} textAlign="center">
        <Heading size="lg" color="error.fg">
          Шаблон не найден
        </Heading>
        <Text color="error.fg" mt={2}>
          Шаблон не существует или у вас нет прав доступа
        </Text>
      </Box>
    )
  }

  if (!template.currentVersion) {
    return (
      <Box layerStyle="panel.error" p={6} textAlign="center">
        <Heading size="lg" color="error.fg">
          Нет версии шаблона
        </Heading>
        <Text color="error.fg" mt={2}>
          У шаблона нет текущей версии для предпросмотра
        </Text>
      </Box>
    )
  }

  // Генерируем предпросмотр с тестовыми данными
  const testData = createTestData()
  const { html, missingPlaceholders } = renderTemplate(template.currentVersion.content, testData)

  // HTML будет санитизирован в SafeHtml компоненте через DOMPurify

  return (
    <VStack gap={6} align="stretch">
      <HStack justify="space-between" flexWrap="wrap" gap={4}>
        <VStack align="start" gap={1}>
          <HStack gap={3}>
            <LuEye size={28} />
            <Heading size="xl">Предпросмотр</Heading>
          </HStack>
          <Text color="fg.muted">
            {template.name} · Версия {template.currentVersion.version}
          </Text>
        </VStack>

        <HStack gap={2}>
          <Button asChild variant="outline">
            <Link href={`/school/contracts/templates/${schoolId}/${template.id}/edit`}>
              <LuArrowLeft />К редактированию
            </Link>
          </Button>
        </HStack>
      </HStack>

      {missingPlaceholders.length > 0 && (
        <Card.Root borderColor="orange.500">
          <Card.Body>
            <VStack align="start" gap={2}>
              <Text fontWeight="semibold" color="orange.fg">
                Предупреждение: Отсутствующие плейсхолдеры
              </Text>
              <Text fontSize="sm" color="fg.muted">
                Следующие плейсхолдеры не были заменены (нет данных в тестовом наборе):
              </Text>
              <HStack flexWrap="wrap" gap={2}>
                {missingPlaceholders.map((placeholder: string) => (
                  <Box
                    key={placeholder}
                    px={2}
                    py={1}
                    bg="orange.subtle"
                    borderRadius="md"
                    fontSize="sm"
                    fontFamily="mono"
                  >
                    {placeholder}
                  </Box>
                ))}
              </HStack>
            </VStack>
          </Card.Body>
        </Card.Root>
      )}

      <Card.Root>
        <Card.Header bg="gray.50" _dark={{ bg: 'gray.800' }}>
          <HStack justify="space-between">
            <Text fontSize="sm" fontWeight="medium">
              Предпросмотр с тестовыми данными
            </Text>
            <Text fontSize="xs" color="fg.muted">
              Данные не настоящие — только для проверки вёрстки
            </Text>
          </HStack>
        </Card.Header>
        <Card.Body>
          <Box
            borderWidth={1}
            borderRadius="md"
            p={6}
            bg="white"
            _dark={{ bg: 'gray.900' }}
            css={{
              '@media print': {
                border: 'none',
                padding: 0,
              },
              '& h1': { fontSize: '1.5em', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' },
              '& h2': { fontSize: '1.25em', fontWeight: 'bold', marginTop: '1rem', marginBottom: '0.5rem' },
              '& p': { marginBottom: '0.5rem', textIndent: '1.25cm', textAlign: 'justify' },
              '& table': { width: '100%', borderCollapse: 'collapse', margin: '1rem 0' },
              '& td, & th': { border: '1px solid var(--chakra-colors-gray-300)', padding: '0.5rem' },
              '& ul, & ol': { paddingLeft: '2rem', marginBottom: '0.5rem' },
              '& li': { marginBottom: '0.25rem' },
            }}
          >
            <SafeHtml html={html} />
          </Box>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
