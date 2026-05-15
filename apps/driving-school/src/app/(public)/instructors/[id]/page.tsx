/**
 * Страница профиля инструктора
 *
 * @module instructors/[id]/page
 *
 * Структура модуля:
 * - instructor-profile.types.ts — типы и утилиты
 * - instructor-header.tsx — шапка профиля
 * - instructor-vehicles.tsx — автомобили
 * - instructor-reviews.tsx — отзывы
 * - instructor-lesson-types.tsx — типы занятий
 * - instructor-contacts.tsx — контакты
 * - hidden-profile.tsx — скрытый профиль
 */

import { ColorModeButton } from '@/app/_components/ui/color-mode'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getInstructorType } from '@/lib/instructor-type'
import { getCategoryDescription } from '@/lib/license-categories/license-categories'
import { Badge, Box, Button, Card, Container, Heading, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import type { LicenseCategory } from '@letar/driving-school-db/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LuArrowLeft } from 'react-icons/lu'

import { HiddenProfile } from './_components/hidden-profile'
import { InstructorContacts } from './_components/instructor-contacts'
import { InstructorHeader } from './_components/instructor-header'
import { InstructorLessonTypes } from './_components/instructor-lesson-types'
import { formatWorkingAreas, type InstructorWithRelations } from './_components/instructor-profile.types'
import { InstructorReviews } from './_components/instructor-reviews'
import { InstructorVehicles } from './_components/instructor-vehicles'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const instructor = await prisma.instructorProfile.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  })

  if (!instructor) {
    return { title: 'Инструктор не найден' }
  }

  return {
    title: `${instructor.user.name} — Инструктор по вождению | НаПрава.РФ`,
    description: instructor.bio || `Инструктор по вождению ${instructor.user.name}`,
  }
}

export default async function InstructorProfilePage({ params }: PageProps) {
  const { id } = await params
  const session = await getSession()

  // Получаем данные инструктора
  const instructor = await prisma.instructorProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          phone: true,
          roles: true,
          organizationMembers: {
            where: { role: 'instructor' },
            select: {
              role: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      lessonTypes: {
        where: { isActive: true },
        include: {
          pricingOptions: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
      vehicles: {
        where: { isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { brand: 'asc' }],
      },
      reviews: {
        where: { status: 'PUBLISHED' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  })

  if (!instructor) {
    notFound()
  }

  // Проверяем, имеет ли пользователь доступ к непубличному профилю
  let hasAccess = instructor.isPublic

  if (!hasAccess && session?.user?.id) {
    // Проверяем, является ли пользователь связанным учеником
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (studentProfile) {
      hasAccess = await prisma.studentInstructorConnection.exists({
        where: {
          studentId: studentProfile.id,
          instructorId: instructor.id,
          status: 'ACTIVE',
        },
      })
    }

    // Или сам инструктор смотрит свой профиль
    if (session.user.id === instructor.user.id) {
      hasAccess = true
    }
  }

  // Если профиль не публичный и нет доступа — показываем сообщение
  if (!hasAccess) {
    return <HiddenProfile />
  }

  const {
    user,
    bio,
    experienceStartDate,
    licenseCategories: rawLicenseCategories,
    workingAreas,
    teachesOnStudentCar,
    averageRating,
    reviewCount,
    lessonTypes,
    vehicles,
    reviews,
  } = instructor

  // Защита от null/undefined/non-array для licenseCategories
  const licenseCategories = Array.isArray(rawLicenseCategories) ? rawLicenseCategories : []

  // Определяем тип инструктора
  const instructorType = getInstructorType(user.roles, user.organizationMembers)

  // Школы, через которые можно записаться
  const schools = user.organizationMembers.map((m) => m.organization)

  // Проверяем данные для кнопки записи
  const isOwnProfile = session?.user?.id === user.id
  const isLoggedIn = !!session?.user?.id

  // Проверяем существующую связь с инструктором
  let hasExistingConnection = false
  let hasPendingRequest = false

  if (session?.user?.id && !isOwnProfile) {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (studentProfile) {
      // Проверяем активную связь (ZenStack v3.2.0 exists API)
      hasExistingConnection = await prisma.studentInstructorConnection.exists({
        where: {
          studentId: studentProfile.id,
          instructorId: instructor.id,
          status: 'ACTIVE',
        },
      })
    }

    // Проверяем pending заявку (ZenStack v3.2.0 exists API)
    hasPendingRequest = await prisma.enrollmentRequest.exists({
      where: {
        studentId: session.user.id,
        instructorId: user.id,
        status: 'PENDING',
      },
    })
  }

  // Формируем строку с рабочими зонами
  const workingAreasText = formatWorkingAreas(workingAreas)

  return (
    <Container maxW="container.xl" py={8} position="relative">
      {/* Кнопка переключения темы */}
      <Box position="absolute" top={4} right={4}>
        <ColorModeButton />
      </Box>

      {/* Кнопка назад */}
      <Button asChild variant="ghost" size="sm" mb={6}>
        <Link href="/instructors">
          <LuArrowLeft />
          Назад к списку
        </Link>
      </Button>

      <SimpleGrid columns={{ base: 1, lg: 3 }} gap={8}>
        {/* Левая колонка — информация об инструкторе */}
        <Stack gap={6} gridColumn={{ lg: 'span 2' }}>
          {/* Шапка профиля */}
          <InstructorHeader
            name={user.name}
            image={user.image}
            averageRating={averageRating}
            reviewCount={reviewCount}
            experienceStartDate={experienceStartDate}
            workingAreasText={workingAreasText}
          />

          {/* О себе */}
          {bio && (
            <Card.Root>
              <Card.Header>
                <Heading size="md">О себе</Heading>
              </Card.Header>
              <Card.Body pt={0}>
                <Text whiteSpace="pre-wrap">{bio}</Text>
              </Card.Body>
            </Card.Root>
          )}

          {/* Автомобили */}
          <InstructorVehicles
            vehicles={vehicles as unknown as InstructorWithRelations['vehicles']}
            teachesOnStudentCar={teachesOnStudentCar}
          />

          {/* Категории прав */}
          {licenseCategories.length > 0 && (
            <Card.Root>
              <Card.Header>
                <Heading size="md">Категории прав</Heading>
              </Card.Header>
              <Card.Body pt={0}>
                <HStack flexWrap="wrap" gap={3}>
                  {licenseCategories.map((cat: LicenseCategory) => (
                    <Badge key={cat} colorPalette="blue" size="lg" py={2} px={3}>
                      <Stack gap={0}>
                        <Text fontWeight="bold">{cat}</Text>
                        <Text fontSize="xs" fontWeight="normal">
                          {getCategoryDescription(cat)}
                        </Text>
                      </Stack>
                    </Badge>
                  ))}
                </HStack>
              </Card.Body>
            </Card.Root>
          )}

          {/* Отзывы */}
          <InstructorReviews
            reviews={reviews as unknown as InstructorWithRelations['reviews']}
            averageRating={averageRating}
            reviewCount={reviewCount}
          />
        </Stack>

        {/* Правая колонка — прайс и контакты */}
        <Stack gap={6}>
          {/* Типы занятий */}
          <InstructorLessonTypes lessonTypes={lessonTypes as unknown as InstructorWithRelations['lessonTypes']} />

          {/* Контакты и запись */}
          <InstructorContacts
            instructorId={instructor.id}
            instructorUserId={user.id}
            instructorName={user.name || 'Инструктор'}
            phone={user.phone}
            instructorType={instructorType}
            schools={schools}
            vehicles={vehicles.map((v) => ({
              id: v.id,
              brand: v.brand,
              model: v.model,
              transmission: v.transmission,
            }))}
            isLoggedIn={isLoggedIn}
            hasExistingConnection={hasExistingConnection}
            hasPendingRequest={hasPendingRequest}
            isOwnProfile={isOwnProfile}
          />
        </Stack>
      </SimpleGrid>
    </Container>
  )
}
