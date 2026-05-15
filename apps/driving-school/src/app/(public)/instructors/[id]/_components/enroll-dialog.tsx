'use client'

import type { InstructorType } from '@/lib/instructor-type'
import {
  Box,
  Button,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  Heading,
  HStack,
  RadioGroup,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import type { EnrollmentRequestType, InstructorVehicle } from '@letar/driving-school-db/prisma'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { LuBuilding2, LuUser } from 'react-icons/lu'
import { createEnrollmentRequestAction } from '../_actions/enrollment-request.action'

interface School {
  id: string
  name: string
}

interface EnrollDialogProps {
  isOpen: boolean
  onClose: () => void
  instructorId: string
  instructorName: string
  instructorType: InstructorType
  schools: School[]
  vehicles: Array<Pick<InstructorVehicle, 'id' | 'brand' | 'model' | 'transmission'>>
}

export function EnrollDialog({
  isOpen,
  onClose,
  instructorId,
  instructorName,
  instructorType,
  schools,
  vehicles,
}: EnrollDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Состояние формы
  const [enrollmentType, setEnrollmentType] = useState<EnrollmentRequestType>(
    instructorType === 'school' ? 'VIA_SCHOOL' : 'DIRECT'
  )
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(schools[0]?.id || '')
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '')
  const [message, setMessage] = useState('')

  const handleSubmit = () => {
    startTransition(async () => {
      setError(null)

      const result = await createEnrollmentRequestAction({
        instructorId,
        type: enrollmentType,
        organizationId: enrollmentType === 'VIA_SCHOOL' ? selectedSchoolId : undefined,
        vehicleId: selectedVehicleId || undefined,
        message: message.trim() || undefined,
      })

      if (!result.success) {
        setError(result.error || 'Ошибка при создании заявки')
      } else {
        onClose()
        router.push('/my-enrollment-requests?status=pending')
      }
    })
  }

  const showTypeChoice = instructorType === 'hybrid'
  const showSchoolChoice = enrollmentType === 'VIA_SCHOOL' && schools.length > 0
  const showVehicleChoice = vehicles.length > 1

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && onClose()} size="md">
      <DialogBackdrop />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Запись к инструктору</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody pb={6}>
          <Stack gap={5}>
            <Text color="fg.muted">
              Вы записываетесь к инструктору <strong>{instructorName}</strong>
            </Text>

            {/* Выбор способа записи (для hybrid) */}
            {showTypeChoice && (
              <Box>
                <Heading size="sm" mb={3}>
                  Как хотите записаться?
                </Heading>
                <RadioGroup.Root
                  value={enrollmentType}
                  onValueChange={(e) => setEnrollmentType(e.value as EnrollmentRequestType)}
                >
                  <Stack gap={3}>
                    <RadioGroup.Item value="DIRECT">
                      <RadioGroup.ItemHiddenInput />
                      <RadioGroup.ItemIndicator />
                      <HStack gap={2}>
                        <LuUser />
                        <Box>
                          <RadioGroup.ItemText fontWeight="medium">Напрямую</RadioGroup.ItemText>
                          <Text fontSize="sm" color="fg.muted">
                            Заявка поступит инструктору лично
                          </Text>
                        </Box>
                      </HStack>
                    </RadioGroup.Item>

                    <RadioGroup.Item value="VIA_SCHOOL">
                      <RadioGroup.ItemHiddenInput />
                      <RadioGroup.ItemIndicator />
                      <HStack gap={2}>
                        <LuBuilding2 />
                        <Box>
                          <RadioGroup.ItemText fontWeight="medium">Через школу</RadioGroup.ItemText>
                          <Text fontSize="sm" color="fg.muted">
                            Заявка поступит в автошколу
                          </Text>
                        </Box>
                      </HStack>
                    </RadioGroup.Item>
                  </Stack>
                </RadioGroup.Root>
              </Box>
            )}

            {/* Выбор школы */}
            {showSchoolChoice && (
              <Box>
                <Heading size="sm" mb={3}>
                  Выберите автошколу
                </Heading>
                <RadioGroup.Root
                  value={selectedSchoolId}
                  onValueChange={(e) => e.value && setSelectedSchoolId(e.value)}
                >
                  <Stack gap={2}>
                    {schools.map((school) => (
                      <RadioGroup.Item key={school.id} value={school.id}>
                        <RadioGroup.ItemHiddenInput />
                        <RadioGroup.ItemIndicator />
                        <RadioGroup.ItemText>{school.name}</RadioGroup.ItemText>
                      </RadioGroup.Item>
                    ))}
                  </Stack>
                </RadioGroup.Root>
              </Box>
            )}

            {/* Выбор автомобиля */}
            {showVehicleChoice && (
              <Box>
                <Heading size="sm" mb={3}>
                  На каком автомобиле хотите заниматься?
                </Heading>
                <RadioGroup.Root
                  value={selectedVehicleId}
                  onValueChange={(e) => e.value && setSelectedVehicleId(e.value)}
                >
                  <Stack gap={2}>
                    {vehicles.map((vehicle) => (
                      <RadioGroup.Item key={vehicle.id} value={vehicle.id}>
                        <RadioGroup.ItemHiddenInput />
                        <RadioGroup.ItemIndicator />
                        <RadioGroup.ItemText>
                          {vehicle.brand} {vehicle.model} ({vehicle.transmission === 'MANUAL' ? 'механика' : 'автомат'})
                        </RadioGroup.ItemText>
                      </RadioGroup.Item>
                    ))}
                  </Stack>
                </RadioGroup.Root>
              </Box>
            )}

            {/* Сообщение */}
            <Box>
              <Heading size="sm" mb={3}>
                Сообщение (необязательно)
              </Heading>
              <Textarea
                placeholder="Расскажите о себе или задайте вопрос инструктору..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </Box>

            {/* Ошибка */}
            {error && (
              <Text color="red.500" fontSize="sm">
                {error}
              </Text>
            )}

            {/* Кнопки */}
            <HStack justify="flex-end" gap={3}>
              <Button variant="ghost" onClick={onClose} disabled={isPending}>
                Отмена
              </Button>
              <Button colorPalette="brand" onClick={handleSubmit} loading={isPending} loadingText="Отправка...">
                Отправить заявку
              </Button>
            </HStack>
          </Stack>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  )
}
