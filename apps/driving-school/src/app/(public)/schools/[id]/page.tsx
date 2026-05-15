/**
 * Страница профиля автошколы
 *
 * @module schools/[id]/page
 *
 * Структура модуля:
 * - school-profile.types.ts — типы и константы
 * - school-header.tsx — шапка профиля
 * - school-locations.tsx — филиалы
 * - school-instructors.tsx — инструкторы
 * - school-reviews.tsx — отзывы
 * - school-contacts.tsx — боковая панель контактов
 */

import { ColorModeButton } from '@/app/_components/ui/color-mode'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCategoryDescription } from '@/lib/license-categories/license-categories'
import { parseOrganizationMetadata } from '@/lib/organization-metadata'
import { Badge, Box, Button, Card, Container, Heading, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import type { LicenseCategory } from '@letar/driving-school-db/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LuArrowLeft, LuPencil } from 'react-icons/lu'

import { SchoolContacts } from './_components/school-contacts'
import { SchoolHeader } from './_components/school-header'
import { SchoolInstructors } from './_components/school-instructors'
import { SchoolLocations } from './_components/school-locations'
import type { MemberWithUser, ReviewWithAuthor, TeamWithLocation } from './_components/school-profile.types'
import { SchoolReviews } from './_components/school-reviews'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const school = await prisma.organization.findUnique({
    where: { id },
    select: { name: true, description: true },
  })

  if (!school) {
    return { title: 'Школа не найдена' }
  }

  return {
    title: `${school.name} | НаПрава.РФ`,
    description: school.description || `Автошкола ${school.name}`,
  }
}

export default async function SchoolProfilePage({ params }: PageProps) {
  const { id } = await params
  const session = await getSession()

  // Проверяем, является ли пользователь админом этой школы
  let isAdmin = false
  if (session?.user?.id) {
    const membership = await prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: session.user.id,
        },
      },
    })
    isAdmin = membership?.role === 'ADMIN'
  }

  // Получаем данные школы
  const school = await prisma.organization.findUnique({
    where: { id, isPublic: true },
    include: {
      members: {
        where: { role: 'instructor' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              instructorProfile: {
                select: {
                  id: true,
                  experienceStartDate: true,
                  averageRating: true,
                  reviewCount: true,
                  licenseCategories: true,
                },
              },
            },
          },
        },
        take: 10,
      },
      teams: {
        where: { locationData: { isActive: true } },
        orderBy: { name: 'asc' },
        include: {
          locationData: true,
          files: {
            orderBy: { order: 'asc' },
            take: 1,
            include: { file: true },
          },
        },
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
      _count: {
        select: {
          members: {
            where: { role: 'instructor' },
          },
          studyGroups: {
            where: { isActive: true },
          },
        },
      },
    },
  })

  if (!school) {
    notFound()
  }

  // Парсим metadata для получения cities и licenseCategories
  const metadata = parseOrganizationMetadata(school.metadata)

  const { name, logo, description, phone, email, website, averageRating, reviewCount, members, teams, reviews } = school
  const cities = metadata.cities
  const licenseCategories = metadata.licenseCategories
  // ZenStack v3: _count типизирован как unknown, делаем безопасный cast
  const schoolWithCount = school as typeof school & { _count: { members: number; studyGroups: number } }
  const _count = schoolWithCount._count

  return (
    <Container maxW="container.xl" py={8} position="relative">
      {/* Кнопка переключения темы */}
      <Box position="absolute" top={4} right={4}>
        <ColorModeButton />
      </Box>

      {/* Кнопки навигации */}
      <HStack justify="space-between" mb={6}>
        <Button asChild variant="ghost" size="sm">
          <Link href="/schools">
            <LuArrowLeft />
            Назад к списку
          </Link>
        </Button>

        {isAdmin && (
          <Button asChild colorPalette="brand" size="sm">
            <Link href={`/school/${id}/settings`}>
              <LuPencil />
              Редактировать
            </Link>
          </Button>
        )}
      </HStack>

      <SimpleGrid columns={{ base: 1, lg: 3 }} gap={8}>
        {/* Левая колонка — информация о школе */}
        <Stack gap={6} gridColumn={{ lg: 'span 2' }}>
          {/* Шапка профиля */}
          <SchoolHeader
            name={name}
            logo={logo}
            averageRating={averageRating}
            reviewCount={reviewCount}
            cities={cities}
            membersCount={_count.members}
            studyGroupsCount={_count.studyGroups}
          />

          {/* О школе */}
          {description && (
            <Card.Root>
              <Card.Header>
                <Heading size="md">О школе</Heading>
              </Card.Header>
              <Card.Body pt={0}>
                <Text whiteSpace="pre-wrap">{description}</Text>
              </Card.Body>
            </Card.Root>
          )}

          {/* Категории прав */}
          {licenseCategories.length > 0 && (
            <Card.Root>
              <Card.Header>
                <Heading size="md">Категории обучения</Heading>
              </Card.Header>
              <Card.Body pt={0}>
                <HStack flexWrap="wrap" gap={3}>
                  {licenseCategories.map((cat: LicenseCategory) => (
                    <Badge key={cat} colorPalette="brand" size="lg" py={2} px={3}>
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

          {/* Филиалы */}
          <SchoolLocations teams={teams as TeamWithLocation[]} />

          {/* Инструкторы школы */}
          <SchoolInstructors members={members as MemberWithUser[]} />

          {/* Отзывы */}
          <SchoolReviews
            reviews={reviews as ReviewWithAuthor[]}
            averageRating={averageRating}
            reviewCount={reviewCount}
          />
        </Stack>

        {/* Правая колонка — контакты */}
        <Stack gap={6}>
          <SchoolContacts
            schoolId={id}
            phone={phone}
            email={email}
            website={website}
            cities={cities}
            isAuthenticated={!!session?.user}
          />
        </Stack>
      </SimpleGrid>
    </Container>
  )
}
