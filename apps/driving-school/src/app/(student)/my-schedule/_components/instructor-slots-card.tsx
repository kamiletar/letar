'use client'

import { HorizontalDatePicker } from '@/app/_components/horizontal-date-picker'
import { vehicleOwnerLabels } from '@/driving-school-form/labels'
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Card,
  Heading,
  HStack,
  Icon,
  Link,
  NativeSelect,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import { formatDuration } from '@letar/format-utils'
import { useEffect, useMemo, useState } from 'react'
import { LuCar, LuCreditCard, LuTriangleAlert, LuUser } from 'react-icons/lu'
import type {
  InstructorWithSlots,
  LessonTypeForBooking,
  PricingOptionForBooking,
  StudentLicenseForBooking,
} from '../_actions/schedule.action'
import { SlotCard } from './slot-card'

interface InstructorSlotsCardProps {
  instructor: InstructorWithSlots
  studentLicenses: StudentLicenseForBooking[]
}

// Форматирование цены
function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(price)
}

// Получить минимальную цену из pricingOptions
function getMinPrice(lessonType: LessonTypeForBooking): number | null {
  if (lessonType.pricingOptions.length === 0) {
    return null
  }
  return Math.min(...lessonType.pricingOptions.map((po) => po.pricePerLesson))
}

// Форматирование варианта цены для отображения
function formatPricingOption(option: PricingOptionForBooking): string {
  const ownerLabel = vehicleOwnerLabels[option.vehicleOwner] || option.vehicleOwner
  const priceStr = formatPrice(option.pricePerLesson)

  if (option.lessonsCount === 1) {
    return `${ownerLabel} — ${priceStr}`
  }

  // Курс
  const totalPrice = option.pricePerLesson * option.lessonsCount * (1 - option.discountPercent / 100)
  const totalStr = formatPrice(totalPrice)

  if (option.discountPercent > 0) {
    return `${ownerLabel} — курс ${option.lessonsCount} занятий, ${totalStr} (скидка ${option.discountPercent}%)`
  }
  return `${ownerLabel} — курс ${option.lessonsCount} занятий, ${totalStr}`
}

// Получить основной или первый вариант цены
function getDefaultPricingOption(lessonType: LessonTypeForBooking): string | undefined {
  if (lessonType.pricingOptions.length === 0) {
    return undefined
  }
  const primary = lessonType.pricingOptions.find((po) => po.isPrimary)
  return primary?.id || lessonType.pricingOptions[0]?.id
}

// Сравнение дат (без времени)
function isSameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

// Проверка наличия действующих прав категории B
function hasValidLicense(licenses: StudentLicenseForBooking[]): boolean {
  const now = new Date()
  return licenses.some((l) => l.category === 'B' && new Date(l.expiresAt) > now)
}

export function InstructorSlotsCard({ instructor, studentLicenses }: InstructorSlotsCardProps) {
  // Проверяем, нужны ли права для записи к этому инструктору
  const requiresLicense = instructor.isFreelance
  const hasLicense = hasValidLicense(studentLicenses)
  const canBook = !requiresLicense || hasLicense

  const [selectedTypeId, setSelectedTypeId] = useState<string | undefined>(
    instructor.lessonTypes.length > 0 ? instructor.lessonTypes[0].id : undefined
  )

  // Выбранный вариант цены
  const [selectedPricingOptionId, setSelectedPricingOptionId] = useState<string | undefined>(() => {
    const firstType = instructor.lessonTypes[0]
    return firstType ? getDefaultPricingOption(firstType) : undefined
  })

  // При смене типа занятия — автовыбор основного варианта цены
  useEffect(() => {
    const selectedType = instructor.lessonTypes.find((t) => t.id === selectedTypeId)
    if (selectedType) {
      setSelectedPricingOptionId(getDefaultPricingOption(selectedType))
    } else {
      setSelectedPricingOptionId(undefined)
    }
  }, [selectedTypeId, instructor.lessonTypes])

  // Получаем уникальные даты из слотов
  const uniqueDates = useMemo(() => {
    const dateMap = new Map<string, Date>()
    instructor.slots.forEach((slot) => {
      const date = new Date(slot.startTime)
      const key = date.toDateString()
      if (!dateMap.has(key)) {
        dateMap.set(key, date)
      }
    })
    return Array.from(dateMap.values()).sort((a, b) => a.getTime() - b.getTime())
  }, [instructor.slots])

  // Выбранная дата (по умолчанию — первая или сегодня если есть)
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const today = new Date()
    const todaySlots = uniqueDates.find((d) => isSameDay(d, today))
    return todaySlots || uniqueDates[0] || null
  })

  // Фильтрация слотов по выбранной дате
  const filteredSlots = useMemo(() => {
    if (!selectedDate) {
      return instructor.slots
    }
    return instructor.slots.filter((slot) => {
      const slotDate = new Date(slot.startTime)
      return isSameDay(slotDate, selectedDate)
    })
  }, [instructor.slots, selectedDate])

  const primaryVehicle = instructor.instructorProfile?.primaryVehicle
  const carInfo = primaryVehicle ? `${primaryVehicle.brand} ${primaryVehicle.model}` : null

  const selectedType = instructor.lessonTypes.find((t) => t.id === selectedTypeId)

  return (
    <Card.Root>
      <Card.Body>
        <VStack align="stretch" gap={4}>
          {/* Информация об инструкторе */}
          <HStack gap={4}>
            <Avatar.Root size="lg">
              <Avatar.Fallback>
                <Icon>
                  <LuUser />
                </Icon>
              </Avatar.Fallback>
              {instructor.image && <Avatar.Image src={instructor.image} />}
            </Avatar.Root>

            <VStack align="start" gap={1}>
              <Heading size="md">{instructor.name}</Heading>
              {carInfo && (
                <HStack gap={2} color="fg.muted">
                  <Icon size="sm">
                    <LuCar />
                  </Icon>
                  <Text fontSize="sm">{carInfo}</Text>
                </HStack>
              )}
              {instructor.instructorProfile?.bio && (
                <Text fontSize="sm" color="fg.muted" lineClamp={2}>
                  {instructor.instructorProfile.bio}
                </Text>
              )}
            </VStack>
          </HStack>

          {/* Предупреждение о необходимости прав для частного инструктора */}
          {requiresLicense && !hasLicense && (
            <Alert.Root status="warning">
              <Alert.Indicator>
                <LuTriangleAlert />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>Требуются водительские права</Alert.Title>
                <Alert.Description>
                  Для записи к частному инструктору необходимо указать действующие водительские права в профиле.{' '}
                  <Link href="/my-profile" colorPalette="brand" fontWeight="medium">
                    <Icon mr={1}>
                      <LuCreditCard />
                    </Icon>
                    Добавить права
                  </Link>
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}

          {/* Бейдж частного инструктора */}
          {instructor.isFreelance && (
            <Badge colorPalette="purple" variant="subtle" size="sm">
              Частный инструктор
            </Badge>
          )}

          {/* Выбор типа занятия */}
          {instructor.lessonTypes.length > 0 && (
            <Box bg="bg.subtle" p={4} borderRadius="md">
              <Text fontWeight="medium" mb={2}>
                Тип занятия
              </Text>
              <NativeSelect.Root size="md">
                <NativeSelect.Field
                  value={selectedTypeId}
                  onChange={(e) => setSelectedTypeId(e.target.value || undefined)}
                >
                  {instructor.lessonTypes.map((lt) => {
                    const minPrice = getMinPrice(lt)
                    return (
                      <option key={lt.id} value={lt.id}>
                        {lt.name} — {minPrice !== null ? formatPrice(minPrice) : 'Цена не указана'} /{' '}
                        {formatDuration(lt.durationMinutes)}
                      </option>
                    )
                  })}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>

              {/* Выбор варианта цены */}
              {selectedType && selectedType.pricingOptions.length > 0 && (
                <Box mt={3}>
                  <Text fontWeight="medium" mb={2}>
                    Вариант
                  </Text>
                  <NativeSelect.Root size="md">
                    <NativeSelect.Field
                      value={selectedPricingOptionId}
                      onChange={(e) => setSelectedPricingOptionId(e.target.value || undefined)}
                    >
                      {selectedType.pricingOptions.map((po) => (
                        <option key={po.id} value={po.id}>
                          {formatPricingOption(po)}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>

                  {/* Детали выбранного типа */}
                  <HStack gap={2} flexWrap="wrap" mt={3}>
                    <Badge colorPalette="gray" variant="subtle">
                      {formatDuration(selectedType.durationMinutes)}
                    </Badge>
                    {selectedType.lessonCategory && (
                      <Badge colorPalette="blue" variant="subtle">
                        {selectedType.lessonCategory}
                      </Badge>
                    )}
                  </HStack>
                  {selectedType.description && (
                    <Text fontSize="sm" color="fg.muted" mt={2}>
                      {selectedType.description}
                    </Text>
                  )}
                </Box>
              )}

              {/* Если нет вариантов цены */}
              {selectedType && selectedType.pricingOptions.length === 0 && (
                <Box mt={3}>
                  <Text fontSize="sm" color="fg.muted">
                    Цена не указана
                  </Text>
                </Box>
              )}
            </Box>
          )}

          {/* Горизонтальный выбор даты и доступные слоты */}
          {instructor.slots.length > 0 ? (
            <Box>
              <Text fontWeight="medium" mb={3}>
                Доступное время ({instructor.slots.length})
              </Text>

              {/* Горизонтальный выбор даты */}
              {uniqueDates.length > 1 && (
                <Box mb={4} borderRadius="md" borderWidth="1px" p={2}>
                  <HorizontalDatePicker
                    dates={uniqueDates}
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    showArrows={uniqueDates.length > 5}
                  />
                </Box>
              )}

              {/* Слоты выбранного дня */}
              {filteredSlots.length > 0 ? (
                <SimpleGrid columns={{ base: 1, sm: 2 }} gap={2}>
                  {filteredSlots.map((slot) => (
                    <SlotCard
                      key={slot.id}
                      slot={slot}
                      instructorUserId={instructor.id}
                      selectedLessonTypeId={selectedTypeId}
                      selectedPricingOptionId={selectedPricingOptionId}
                      disabled={!canBook}
                    />
                  ))}
                </SimpleGrid>
              ) : (
                <Box bg="bg.muted" p={4} borderRadius="md" textAlign="center">
                  <Text color="fg.muted">Нет слотов на выбранный день</Text>
                </Box>
              )}
            </Box>
          ) : (
            <Box bg="bg.muted" p={4} borderRadius="md" textAlign="center">
              <Text color="fg.muted">Нет доступных слотов</Text>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
