'use client'

import { Card, Grid, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { LuMail, LuUserPlus } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

import { DrivingSchoolForm } from '@/driving-school-form'

import { createStudentAccountAction } from '../_actions/create-student-account.action'
import { CreateStudentSchema } from '../_schemas/create-student.schema'

interface CreateStudentFormProps {
  organizationId: string
  onSuccess?: () => void
}

export function CreateStudentForm({ organizationId, onSuccess }: CreateStudentFormProps) {
  const router = useRouter()

  const handleSubmit = async (value: typeof CreateStudentSchema._output) => {
    const result = await createStudentAccountAction(value)

    if (!result.success) {
      toaster.error({ title: result.error })
      return
    }

    toaster.success({
      title: 'Приглашение отправлено',
      description: 'Ученик получит email с ссылкой для активации аккаунта',
    })

    router.refresh()
    onSuccess?.()
  }

  return (
    <DrivingSchoolForm
      schema={CreateStudentSchema}
      initialValue={{
        email: '',
        name: '',
        phone: '',
        birthdate: '',
        organizationId,
      }}
      onSubmit={handleSubmit}
    >
      <Card.Root>
        <Card.Header>
          <HStack gap={2}>
            <LuUserPlus />
            <Heading size="md">Добавить ученика</Heading>
          </HStack>
          <Text fontSize="sm" color="fg.muted">
            Ученик получит email с ссылкой для активации аккаунта
          </Text>
        </Card.Header>
        <Card.Body>
          <VStack align="stretch" gap={4}>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <DrivingSchoolForm.Field.String name="email" />
              <DrivingSchoolForm.Field.String name="name" />
              <DrivingSchoolForm.Field.Phone name="phone" />
              <DrivingSchoolForm.Field.Date name="birthdate" />
            </Grid>
          </VStack>
        </Card.Body>
        <Card.Footer>
          <HStack justify="flex-end" w="full">
            <DrivingSchoolForm.Button.Submit colorPalette="blue">
              <LuMail />
              Отправить приглашение
            </DrivingSchoolForm.Button.Submit>
          </HStack>
        </Card.Footer>
      </Card.Root>
    </DrivingSchoolForm>
  )
}
