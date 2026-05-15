'use client'

/**
 * Панель профиля пользователя для сплитскрин-режима
 *
 * Отображает информацию о собеседнике в приватном чате:
 * - Аватар и имя
 * - Баланс занятий и статистика
 * - Лицензии (для учеников)
 */

import { Avatar, Badge, Box, Button, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { use } from 'react'
import { LuCalendar, LuCar, LuCheck, LuClock, LuCreditCard, LuStar, LuUsers, LuWallet } from 'react-icons/lu'
import { getPanelProfileAction } from '../_actions/split-panel.action'

interface ProfilePanelProps {
  userId: string
}

export function ProfilePanel({ userId }: ProfilePanelProps) {
  // Используем React 19 use() для загрузки данных
  const result = use(getPanelProfileAction(userId))

  if (!result.success) {
    return (
      <VStack p={4} gap={4}>
        <Text color="fg.muted">Не удалось загрузить профиль</Text>
      </VStack>
    )
  }

  const { profile } = result

  return (
    <VStack p={4} gap={4} align="stretch">
      {/* Аватар и имя */}
      <VStack gap={2} align="center">
        <Avatar.Root size="xl">
          {profile.image && <Avatar.Image src={profile.image} />}
          <Avatar.Fallback>{profile.name.charAt(0)}</Avatar.Fallback>
        </Avatar.Root>
        <Text fontWeight="semibold" fontSize="lg">
          {profile.name}
        </Text>
        <Text fontSize="sm" color="fg.muted">
          {profile.email}
        </Text>
      </VStack>

      {/* Профиль ученика */}
      {profile.studentProfile && (
        <VStack gap={3} align="stretch">
          {/* Статистика */}
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
            <Box bg="bg.subtle" p={3} borderRadius="md">
              <HStack gap={2} color="fg.muted" mb={1}>
                <Icon size="sm">
                  <LuWallet />
                </Icon>
                <Text fontSize="xs">Баланс</Text>
              </HStack>
              <Text
                fontWeight="bold"
                fontSize="lg"
                color={profile.studentProfile.balance > 0 ? 'success.fg' : 'fg.muted'}
              >
                {profile.studentProfile.balance}
              </Text>
            </Box>
            <Box bg="bg.subtle" p={3} borderRadius="md">
              <HStack gap={2} color="fg.muted" mb={1}>
                <Icon size="sm">
                  <LuCheck />
                </Icon>
                <Text fontSize="xs">Проведено</Text>
              </HStack>
              <Text fontWeight="bold" fontSize="lg">
                {profile.studentProfile.completedLessons}
              </Text>
            </Box>
            <Box bg="bg.subtle" p={3} borderRadius="md" gridColumn="span 2">
              <HStack gap={2} color="fg.muted" mb={1}>
                <Icon size="sm">
                  <LuCalendar />
                </Icon>
                <Text fontSize="xs">Всего занятий</Text>
              </HStack>
              <Text fontWeight="bold" fontSize="lg">
                {profile.studentProfile.totalScheduledLessons}
              </Text>
            </Box>
          </Box>

          {/* Статус связи */}
          <HStack justify="space-between" py={2}>
            <Text fontSize="sm" color="fg.muted">
              Статус связи
            </Text>
            <Badge
              colorPalette={
                profile.studentProfile.connectionStatus === 'ACTIVE'
                  ? 'green'
                  : profile.studentProfile.connectionStatus === 'PAUSED'
                    ? 'yellow'
                    : 'gray'
              }
            >
              {profile.studentProfile.connectionStatus === 'ACTIVE'
                ? 'Активен'
                : profile.studentProfile.connectionStatus === 'PAUSED'
                  ? 'Приостановлен'
                  : 'Отключён'}
            </Badge>
          </HStack>

          {/* Лицензии */}
          {profile.studentProfile.licenses.length > 0 && (
            <Box>
              <HStack gap={2} mb={2}>
                <Icon size="sm" color="fg.muted">
                  <LuCreditCard />
                </Icon>
                <Text fontSize="sm" fontWeight="medium">
                  Водительские права
                </Text>
              </HStack>
              <HStack gap={2} flexWrap="wrap">
                {profile.studentProfile.licenses.map((license) => (
                  <Badge
                    key={license.id}
                    colorPalette={license.isExpired ? 'red' : license.isVerified ? 'green' : 'orange'}
                    variant="subtle"
                  >
                    {license.category}
                    {license.transmissionRestriction === 'AUTOMATIC' && ' (AT)'}
                    <Icon size="xs" ml={1}>
                      {license.isVerified ? <LuCheck /> : <LuClock />}
                    </Icon>
                  </Badge>
                ))}
              </HStack>
            </Box>
          )}

          {/* Кнопка управления балансом */}
          <Button asChild size="sm" variant="outline" w="full">
            <Link href={`/students/${userId}/balance`}>
              <LuWallet size={14} />
              Управление балансом
            </Link>
          </Button>
        </VStack>
      )}

      {/* Профиль инструктора */}
      {profile.instructorProfile && (
        <VStack gap={3} align="stretch">
          {/* Статистика */}
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
            <Box bg="bg.subtle" p={3} borderRadius="md">
              <HStack gap={2} color="fg.muted" mb={1}>
                <Icon size="sm">
                  <LuUsers />
                </Icon>
                <Text fontSize="xs">Учеников</Text>
              </HStack>
              <Text fontWeight="bold" fontSize="lg">
                {profile.instructorProfile.totalStudents}
              </Text>
            </Box>
            <Box bg="bg.subtle" p={3} borderRadius="md">
              <HStack gap={2} color="fg.muted" mb={1}>
                <Icon size="sm">
                  <LuStar />
                </Icon>
                <Text fontSize="xs">Рейтинг</Text>
              </HStack>
              <Text fontWeight="bold" fontSize="lg">
                {profile.instructorProfile.rating?.toFixed(1) || '—'}
              </Text>
            </Box>
          </Box>

          {/* Автомобиль */}
          {profile.instructorProfile.vehicle && (
            <Box bg="bg.subtle" p={3} borderRadius="md">
              <HStack gap={2} color="fg.muted" mb={1}>
                <Icon size="sm">
                  <LuCar />
                </Icon>
                <Text fontSize="xs">Автомобиль</Text>
              </HStack>
              <Text fontWeight="medium">
                {profile.instructorProfile.vehicle.brand} {profile.instructorProfile.vehicle.model}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                {profile.instructorProfile.vehicle.plateNumber}
              </Text>
            </Box>
          )}
        </VStack>
      )}
    </VStack>
  )
}
