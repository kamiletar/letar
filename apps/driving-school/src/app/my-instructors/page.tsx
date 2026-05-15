import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Heading,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuArrowLeft, LuCalendar, LuCar, LuSearch, LuUser } from 'react-icons/lu'

import { ChatButton } from './_components/chat-button'

export const metadata = {
  title: 'Мои инструкторы',
  description: 'Ваши инструкторы по вождению',
}

export default async function MyInstructorsPage() {
  const session = await getSession()

  if (!session?.user?.id) {
    redirect('/sign-in')
  }

  // Получаем профиль ученика с инструкторами
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      instructorConnections: {
        where: { status: 'ACTIVE' },
        include: {
          instructor: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              vehicles: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!studentProfile) {
    redirect('/dashboard')
  }

  const connections = studentProfile.instructorConnections

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        {/* Навигация */}
        <HStack justify="space-between">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">
              <LuArrowLeft />
              Назад
            </Link>
          </Button>
        </HStack>

        <Box>
          <Heading size="xl">Мои инструкторы</Heading>
          <Text color="fg.muted" mt={2}>
            {connections.length > 0
              ? `У вас ${connections.length} инструктор${
                  connections.length === 1 ? '' : connections.length < 5 ? 'а' : 'ов'
                }`
              : 'У вас пока нет инструкторов'}
          </Text>
        </Box>

        {connections.length === 0 ? (
          <Card.Root>
            <Card.Body>
              <VStack py={8} gap={4}>
                <Box p={4} borderRadius="full" bg="bg.subtle" color="fg.muted">
                  <LuUser size={32} />
                </Box>
                <Text color="fg.muted" textAlign="center">
                  Вы пока не связаны ни с одним инструктором
                </Text>
                <Text color="fg.muted" textAlign="center" fontSize="sm">
                  Найдите инструктора в каталоге или попросите инструктора отправить вам приглашение
                </Text>
                <Button asChild colorPalette="brand">
                  <Link href="/instructors">
                    <LuSearch size={16} />
                    Найти инструктора
                  </Link>
                </Button>
              </VStack>
            </Card.Body>
          </Card.Root>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            {connections.map((connection) => {
              const instructor = connection.instructor
              const vehicle = instructor.vehicles[0]

              return (
                <Card.Root key={connection.id}>
                  <Card.Body>
                    <HStack gap={4} align="start">
                      <Avatar.Root size="xl">
                        {instructor.user.image && <Avatar.Image src={instructor.user.image} />}
                        <Avatar.Fallback>{instructor.user.name?.charAt(0) || 'И'}</Avatar.Fallback>
                      </Avatar.Root>
                      <VStack align="start" gap={2} flex={1}>
                        <Heading size="md">{instructor.user.name || 'Инструктор'}</Heading>

                        {vehicle && (
                          <HStack gap={2} color="fg.muted" fontSize="sm">
                            <LuCar size={14} />
                            <Text>
                              {vehicle.brand} {vehicle.model}
                              {vehicle.transmission && (
                                <Badge ml={2} size="sm">
                                  {vehicle.transmission === 'MANUAL' ? 'МТ' : 'АТ'}
                                </Badge>
                              )}
                            </Text>
                          </HStack>
                        )}

                        {connection.isPrimary && (
                          <Badge colorPalette="brand" size="sm">
                            Основной инструктор
                          </Badge>
                        )}

                        <HStack gap={2} mt={2}>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/instructors/${instructor.id}`}>
                              <LuUser size={14} />
                              Профиль
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href="/my-schedule">
                              <LuCalendar size={14} />
                              Записаться
                            </Link>
                          </Button>
                          <ChatButton instructorUserId={instructor.user.id} />
                        </HStack>
                      </VStack>
                    </HStack>
                  </Card.Body>
                </Card.Root>
              )
            })}
          </SimpleGrid>
        )}
      </VStack>
    </Container>
  )
}
