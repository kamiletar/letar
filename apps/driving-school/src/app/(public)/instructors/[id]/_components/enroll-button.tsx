'use client'

import { type InstructorType } from '@/lib/instructor-type'
import { Button, useDisclosure } from '@chakra-ui/react'
import type { InstructorVehicle } from '@letar/driving-school-db/prisma'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createEnrollmentRequestAction } from '../_actions/enrollment-request.action'
import { EnrollDialog } from './enroll-dialog'

interface School {
  id: string
  name: string
}

interface EnrollButtonProps {
  instructorId: string
  instructorUserId: string
  instructorName: string
  instructorType: InstructorType
  schools: School[]
  vehicles: Array<Pick<InstructorVehicle, 'id' | 'brand' | 'model' | 'transmission'>>
  isLoggedIn: boolean
  hasExistingConnection: boolean
  hasPendingRequest: boolean
  isOwnProfile: boolean
}

export function EnrollButton({
  instructorId,
  instructorUserId: _instructorUserId,
  instructorName,
  instructorType,
  schools,
  vehicles,
  isLoggedIn,
  hasExistingConnection,
  hasPendingRequest,
  isOwnProfile,
}: EnrollButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { open, onOpen, onClose } = useDisclosure()
  const [error, setError] = useState<string | null>(null)

  // Нельзя записаться к себе
  if (isOwnProfile) {
    return null
  }

  // Уже есть активная связь
  if (hasExistingConnection) {
    return (
      <Button colorPalette="green" size="lg" width="full" disabled>
        Вы уже занимаетесь у этого инструктора
      </Button>
    )
  }

  // Уже есть pending заявка
  if (hasPendingRequest) {
    return (
      <Button colorPalette="yellow" size="lg" width="full" disabled>
        Заявка на рассмотрении
      </Button>
    )
  }

  // Обработка записи напрямую (для freelance)
  const handleDirectEnroll = () => {
    // Если не залогинен — редирект на страницу входа
    if (!isLoggedIn) {
      router.push(`/sign-in?callbackUrl=/instructors/${instructorId}`)
      return
    }

    // Если у инструктора несколько авто — открываем диалог для выбора
    if (vehicles.length > 1) {
      onOpen()
      return
    }

    // Иначе сразу отправляем заявку
    startTransition(async () => {
      setError(null)
      const result = await createEnrollmentRequestAction({
        instructorId,
        type: 'DIRECT',
        vehicleId: vehicles[0]?.id,
      })

      if (!result.success) {
        setError(result.error || 'Ошибка при создании заявки')
      } else {
        router.push('/my-enrollment-requests?status=pending')
      }
    })
  }

  // Для school инструкторов
  const handleSchoolEnroll = () => {
    if (!isLoggedIn) {
      router.push(`/sign-in?callbackUrl=/instructors/${instructorId}`)
      return
    }

    // Открываем диалог для выбора школы (и авто если > 1)
    onOpen()
  }

  // Для hybrid инструкторов — всегда открываем диалог
  const handleHybridEnroll = () => {
    if (!isLoggedIn) {
      router.push(`/sign-in?callbackUrl=/instructors/${instructorId}`)
      return
    }

    onOpen()
  }

  // Определяем поведение кнопки в зависимости от типа инструктора
  let buttonText = 'Записаться'
  let handleClick = handleDirectEnroll

  if (instructorType === 'school') {
    buttonText = 'Записаться через школу'
    handleClick = handleSchoolEnroll
  } else if (instructorType === 'hybrid') {
    buttonText = 'Записаться'
    handleClick = handleHybridEnroll
  }

  return (
    <>
      <Button
        colorPalette="brand"
        size="lg"
        width="full"
        onClick={handleClick}
        loading={isPending}
        loadingText="Отправка заявки..."
      >
        {buttonText}
      </Button>

      {error && (
        <Button colorPalette="red" variant="ghost" size="sm" width="full" disabled>
          {error}
        </Button>
      )}

      <EnrollDialog
        isOpen={open}
        onClose={onClose}
        instructorId={instructorId}
        instructorName={instructorName}
        instructorType={instructorType}
        schools={schools}
        vehicles={vehicles}
      />
    </>
  )
}
