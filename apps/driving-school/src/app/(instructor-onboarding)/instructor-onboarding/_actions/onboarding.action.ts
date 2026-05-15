'use server'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { LicenseCategory } from '@letar/driving-school-db/prisma'
import type { Decimal } from 'decimal.js'
import type {
  BasicInfoData,
  InstructorOnboardingFormData,
  PricingData,
  ScheduleData,
  VehicleData,
} from '../_schemas/instructor-onboarding.schema'

interface SaveStepInput {
  currentStep: number
  completedSteps: number[]
}

interface SaveStepResult {
  success: boolean
  error?: string
}

export async function saveStepAction(input: SaveStepInput): Promise<SaveStepResult> {
  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    await prisma.userOnboarding.update({
      where: { userId: session.user.id },
      data: {
        currentStep: input.currentStep,
        completedSteps: input.completedSteps,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to save onboarding step:', error)
    return { success: false, error: 'SAVE_FAILED' }
  }
}

interface SkipResult {
  success: boolean
  error?: string
}

export async function skipOnboardingAction(): Promise<SkipResult> {
  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    await prisma.userOnboarding.update({
      where: { userId: session.user.id },
      data: {
        skippedAt: new Date(),
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to skip onboarding:', error)
    return { success: false, error: 'SKIP_FAILED' }
  }
}

interface CompleteOnboardingInput {
  basicInfo: BasicInfoData
  vehicle: VehicleData
  schedule: ScheduleData
  pricing: PricingData
}

interface CompleteResult {
  success: boolean
  error?: string
}

export async function completeOnboardingAction(input: CompleteOnboardingInput): Promise<CompleteResult> {
  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const userId = session.user.id
    await prisma.$transaction(async (tx) => {
      // Получаем профиль инструктора
      const instructorProfile = await tx.instructorProfile.findUnique({
        where: { userId },
        include: { vehicles: true, lessonTypes: true },
      })

      if (!instructorProfile) {
        throw new Error('Instructor profile not found')
      }

      // Обновляем профиль инструктора (basicInfo)
      await tx.instructorProfile.update({
        where: { userId },
        data: {
          experienceStartDate: input.basicInfo.experienceStartDate,
          licenseCategories: input.basicInfo.licenseCategories as LicenseCategory[],
          bio: input.basicInfo.bio,
          workingAreas: input.pricing.workingAreas,
          isPublic: true, // Делаем профиль публичным
        },
      })

      // Обновляем или создаём автомобиль (vehicle)
      const existingVehicle = instructorProfile.vehicles[0]
      if (existingVehicle) {
        await tx.instructorVehicle.update({
          where: { id: existingVehicle.id },
          data: {
            brand: input.vehicle.brand,
            model: input.vehicle.model,
            transmission: input.vehicle.transmission,
            year: input.vehicle.year,
            color: input.vehicle.color,
            plateNumber: input.vehicle.plateNumber,
          },
        })
      } else {
        await tx.instructorVehicle.create({
          data: {
            instructorProfileId: instructorProfile.id,
            brand: input.vehicle.brand,
            model: input.vehicle.model,
            transmission: input.vehicle.transmission,
            year: input.vehicle.year,
            color: input.vehicle.color,
            plateNumber: input.vehicle.plateNumber,
            isPrimary: true,
          },
        })
      }

      // Создаём или обновляем настройки расписания (schedule)
      // workingHours уже в нужном формате из ScheduleInput
      await tx.scheduleSettings.upsert({
        where: { instructorId: instructorProfile.id },
        update: {
          workingHours: input.schedule.workingHours,
          lessonDuration: input.schedule.lessonDuration,
          breakDuration: input.schedule.breakDuration,
        },
        create: {
          instructorId: instructorProfile.id,
          workingHours: input.schedule.workingHours,
          lessonDuration: input.schedule.lessonDuration,
          breakDuration: input.schedule.breakDuration,
        },
      })

      // Создаём или обновляем тип занятия с ценой (pricing)
      const existingLessonType = instructorProfile.lessonTypes[0]
      let lessonTypeId: string

      if (existingLessonType) {
        await tx.lessonType.update({
          where: { id: existingLessonType.id },
          data: {
            durationMinutes: input.schedule.lessonDuration,
            lessonCategory: 'STANDARD',
          },
        })
        lessonTypeId = existingLessonType.id
      } else {
        const newLessonType = await tx.lessonType.create({
          data: {
            instructorId: instructorProfile.id,
            name: 'Обычное вождение',
            lessonCategory: 'STANDARD',
            durationMinutes: input.schedule.lessonDuration,
          },
        })
        lessonTypeId = newLessonType.id
      }

      // Создаём или обновляем вариант цены (на авто инструктора)
      const existingInstructorOption = await tx.pricingOption.findFirst({
        where: {
          lessonTypeId,
          vehicleOwner: 'INSTRUCTOR',
          vehicleId: null,
          lessonsCount: 1,
        },
      })
      if (existingInstructorOption) {
        await tx.pricingOption.update({
          where: { id: existingInstructorOption.id },
          data: {
            pricePerLesson: input.pricing.basePrice as unknown as Decimal,
          },
        })
      } else {
        await tx.pricingOption.create({
          data: {
            lessonTypeId,
            vehicleOwner: 'INSTRUCTOR',
            pricePerLesson: input.pricing.basePrice as unknown as Decimal,
            lessonsCount: 1,
            isPrimary: true,
          },
        })
      }

      // Если указана цена для занятий на авто ученика — создаём/обновляем доп. вариант
      if (input.pricing.studentCarPrice) {
        const existingStudentOption = await tx.pricingOption.findFirst({
          where: {
            lessonTypeId,
            vehicleOwner: 'STUDENT',
            vehicleId: null,
            lessonsCount: 1,
          },
        })
        if (existingStudentOption) {
          await tx.pricingOption.update({
            where: { id: existingStudentOption.id },
            data: {
              pricePerLesson: input.pricing.studentCarPrice as unknown as Decimal,
            },
          })
        } else {
          await tx.pricingOption.create({
            data: {
              lessonTypeId,
              vehicleOwner: 'STUDENT',
              pricePerLesson: input.pricing.studentCarPrice as unknown as Decimal,
              lessonsCount: 1,
            },
          })
        }
      }

      // Завершаем онбординг
      await tx.userOnboarding.update({
        where: { userId },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          completedSteps: [1, 2, 3, 4, 5, 6],
          currentStep: 6,
        },
      })
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to complete onboarding:', error)
    return { success: false, error: 'COMPLETE_FAILED' }
  }
}

/**
 * Принимает данные формы и завершает онбординг инструктора
 */
export async function completeOnboardingV2Action(formData: InstructorOnboardingFormData): Promise<CompleteResult> {
  return completeOnboardingAction(formData)
}
