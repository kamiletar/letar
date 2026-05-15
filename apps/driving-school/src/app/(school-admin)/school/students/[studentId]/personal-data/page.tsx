import { Box, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { LuUser } from 'react-icons/lu'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

import { getStudentPersonalData } from './_actions/personal-data.action'
import { PersonalDataForm } from './_components/personal-data-form'

export const metadata = {
  title: 'Персональные данные ученика',
  description: 'Ввод паспортных данных для генерации договора',
}

interface Props {
  params: Promise<{ studentId: string }>
}

export default async function PersonalDataPage({ params }: Props) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { studentId } = await params

  // Загружаем информацию об ученике
  const studentProgress = await prisma.studentProgress.findFirst({
    where: {
      id: studentId,
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
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      organization: {
        select: {
          name: true,
        },
      },
    },
  })

  if (!studentProgress) {
    return (
      <Box layerStyle="panel.error" p={6} textAlign="center">
        <Heading size="lg" color="error.fg">
          Ученик не найден
        </Heading>
        <Text color="error.fg" mt={2}>
          Ученик не существует или у вас нет прав доступа
        </Text>
      </Box>
    )
  }

  // Загружаем текущие персональные данные
  const result = await getStudentPersonalData(studentId)
  const initialData = result.success ? result.data : null

  return (
    <VStack gap={6} align="stretch">
      <VStack align="start" gap={1}>
        <HStack gap={3}>
          <LuUser size={28} />
          <Heading size="xl">Персональные данные</Heading>
        </HStack>
        <Text color="fg.muted">
          {studentProgress.user.name || studentProgress.user.email} · {studentProgress.organization.name}
        </Text>
      </VStack>

      <PersonalDataForm studentProgressId={studentId} initialData={initialData || undefined} />
    </VStack>
  )
}
