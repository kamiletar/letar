'use client'

import { Box, Button, Card, Grid, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { LuSave } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

import { DrivingSchoolForm } from '@/driving-school-form'

import { updateStudentPersonalData } from '../_actions/personal-data.action'
import { type StudentPersonalData, StudentPersonalDataSchema } from '../_schemas/passport.schema'

interface PersonalDataFormProps {
  studentProgressId: string
  initialData?: Partial<StudentPersonalData>
}

export function PersonalDataForm({ studentProgressId, initialData }: PersonalDataFormProps) {
  const router = useRouter()

  const handleSubmit = async (value: StudentPersonalData) => {
    const result = await updateStudentPersonalData(studentProgressId, value)

    if (!result.success) {
      toaster.error({ title: result.error })
      return
    }

    toaster.success({ title: 'Данные сохранены' })
    router.refresh()
  }

  return (
    <DrivingSchoolForm
      schema={StudentPersonalDataSchema}
      initialValue={{
        passport: {
          series: initialData?.passport?.series || '',
          number: initialData?.passport?.number || '',
          issuedBy: initialData?.passport?.issuedBy || '',
          issuedAt: initialData?.passport?.issuedAt || '',
          departmentCode: initialData?.passport?.departmentCode || '',
        },
        registrationAddress: initialData?.registrationAddress || '',
        snils: initialData?.snils || '',
        inn: initialData?.inn || '',
      }}
      onSubmit={handleSubmit}
    >
      <VStack align="stretch" gap={6}>
        {/* Паспортные данные */}
        <Card.Root>
          <Card.Header>
            <Heading size="md">Паспортные данные</Heading>
            <Text fontSize="sm" color="fg.muted">
              Эти данные будут использоваться при генерации договора
            </Text>
          </Card.Header>
          <Card.Body>
            <DrivingSchoolForm.Group name="passport">
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
                <DrivingSchoolForm.Field.String name="series" />
                <DrivingSchoolForm.Field.String name="number" />
                <Box gridColumn={{ md: 'span 2' }}>
                  <DrivingSchoolForm.Field.String name="issuedBy" />
                </Box>
                <DrivingSchoolForm.Field.Date name="issuedAt" />
                <DrivingSchoolForm.Field.String name="departmentCode" />
              </Grid>
            </DrivingSchoolForm.Group>
          </Card.Body>
        </Card.Root>

        {/* Адрес и доп. данные */}
        <Card.Root>
          <Card.Header>
            <Heading size="md">Адрес и дополнительные данные</Heading>
          </Card.Header>
          <Card.Body>
            <VStack align="stretch" gap={4}>
              <DrivingSchoolForm.Field.String name="registrationAddress" />
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
                <DrivingSchoolForm.Field.String name="snils" />
                <DrivingSchoolForm.Field.String name="inn" />
              </Grid>
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Кнопки */}
        <HStack justify="flex-end" gap={4}>
          <Button variant="ghost" onClick={() => router.back()}>
            Отмена
          </Button>
          <DrivingSchoolForm.Button.Submit colorPalette="blue">
            <LuSave />
            Сохранить
          </DrivingSchoolForm.Button.Submit>
        </HStack>
      </VStack>
    </DrivingSchoolForm>
  )
}
