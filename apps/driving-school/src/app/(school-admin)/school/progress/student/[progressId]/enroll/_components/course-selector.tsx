'use client'

import { Badge, Box, Card, Checkbox, HStack, Input, Text, VStack } from '@chakra-ui/react'
import type { LicenseCategory } from '@letar/driving-school-db/prisma'
import { LuCheck, LuGraduationCap, LuWallet } from 'react-icons/lu'

import type { TrainingCourseSummary } from '../../../../../courses/_actions/courses.action'

interface SelectedCourse {
  courseId: string
  initialPayment: number
}

interface CourseSelectorProps {
  courses: TrainingCourseSummary[]
  selectedCourses: SelectedCourse[]
  existingCategories: LicenseCategory[]
  onToggle: (courseId: string, selected: boolean) => void
  onPaymentChange: (courseId: string, amount: number) => void
}

export function CourseSelector({
  courses,
  selectedCourses,
  existingCategories,
  onToggle,
  onPaymentChange,
}: CourseSelectorProps) {
  if (courses.length === 0) {
    return (
      <Card.Root>
        <Card.Header>
          <HStack gap={2}>
            <LuGraduationCap size={20} />
            <Text fontWeight="semibold">Курсы обучения</Text>
          </HStack>
        </Card.Header>
        <Card.Body>
          <Text color="fg.muted">Нет доступных курсов. Создайте курс в разделе "Курсы".</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack gap={2}>
          <LuGraduationCap size={20} />
          <Text fontWeight="semibold">Выберите курсы</Text>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap={3}>
          {courses.map((course) => {
            const isSelected = selectedCourses.some((c) => c.courseId === course.id)
            const selectedData = selectedCourses.find((c) => c.courseId === course.id)
            const alreadyEnrolled = existingCategories.includes(course.category)

            return (
              <CourseCard
                key={course.id}
                course={course}
                isSelected={isSelected}
                alreadyEnrolled={alreadyEnrolled}
                initialPayment={selectedData?.initialPayment || 0}
                onToggle={(selected) => onToggle(course.id, selected)}
                onPaymentChange={(amount) => onPaymentChange(course.id, amount)}
              />
            )
          })}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

interface CourseCardProps {
  course: TrainingCourseSummary
  isSelected: boolean
  alreadyEnrolled: boolean
  initialPayment: number
  onToggle: (selected: boolean) => void
  onPaymentChange: (amount: number) => void
}

function CourseCard({
  course,
  isSelected,
  alreadyEnrolled,
  initialPayment,
  onToggle,
  onPaymentChange,
}: CourseCardProps) {
  const transmissionLabel =
    course.transmissionType === 'AUTOMATIC' ? 'АТ' : course.transmissionType === 'MANUAL' ? 'МТ' : ''

  return (
    <Box
      p={4}
      borderWidth="2px"
      borderColor={isSelected ? 'brand.500' : 'border.muted'}
      borderRadius="lg"
      bg={isSelected ? 'brand.50' : 'transparent'}
      opacity={alreadyEnrolled ? 0.5 : 1}
      _dark={{
        bg: isSelected ? 'brand.900/20' : 'transparent',
      }}
    >
      <VStack align="stretch" gap={3}>
        <HStack justify="space-between">
          <Checkbox.Root
            checked={isSelected}
            onCheckedChange={(e) => !alreadyEnrolled && onToggle(!!e.checked)}
            disabled={alreadyEnrolled}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control>
              <Checkbox.Indicator>
                <LuCheck />
              </Checkbox.Indicator>
            </Checkbox.Control>
            <Checkbox.Label>
              <HStack gap={2}>
                <Text fontWeight="medium">{course.name}</Text>
                <Badge colorPalette="purple">
                  {course.category}
                  {transmissionLabel && ` (${transmissionLabel})`}
                </Badge>
                {alreadyEnrolled && <Badge colorPalette="yellow">Уже записан</Badge>}
              </HStack>
            </Checkbox.Label>
          </Checkbox.Root>

          <Text fontWeight="bold" color="brand.600">
            {course.price.toLocaleString('ru-RU')} ₽
          </Text>
        </HStack>

        {course.description && (
          <Text fontSize="sm" color="fg.muted">
            {course.description}
          </Text>
        )}

        <HStack gap={4} fontSize="sm" color="fg.muted">
          {course.theoryHours && <Text>Теория: {course.theoryHours} ч.</Text>}
          <Text>Практика: {course.practiceLessons} занятий</Text>
        </HStack>

        {/* Первоначальный взнос */}
        {isSelected && (
          <HStack gap={3} pt={2} borderTop="1px solid" borderColor="border.muted">
            <HStack gap={2}>
              <LuWallet />
              <Text fontSize="sm">Первоначальный взнос:</Text>
            </HStack>
            <Input
              type="number"
              min={0}
              max={course.price}
              value={initialPayment || ''}
              onChange={(e) => onPaymentChange(Number(e.target.value) || 0)}
              size="sm"
              w="120px"
              placeholder="0"
            />
            <Text fontSize="sm" color="fg.muted">
              ₽
            </Text>
          </HStack>
        )}
      </VStack>
    </Box>
  )
}
