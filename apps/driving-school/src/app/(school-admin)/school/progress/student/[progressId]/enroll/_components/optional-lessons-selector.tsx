'use client'

import { Badge, Card, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { LuPlus } from 'react-icons/lu'

import type { OptionalLessonTypeSummary } from '../../../../../courses/_actions/optional-lessons.action'

interface SelectedOptional {
  lessonTypeId: string
  quantity: number
  price: number
}

interface OptionalLessonsSelectorProps {
  lessonTypes: OptionalLessonTypeSummary[]
  selectedOptionals: SelectedOptional[]
  onChange: (lessonTypeId: string, quantity: number, price: number) => void
}

export function OptionalLessonsSelector({ lessonTypes, selectedOptionals, onChange }: OptionalLessonsSelectorProps) {
  return (
    <Card.Root>
      <Card.Header>
        <HStack gap={2}>
          <LuPlus size={20} />
          <Text fontWeight="semibold">Дополнительные занятия (опционально)</Text>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap={3}>
          {lessonTypes.map((lessonType) => {
            const selected = selectedOptionals.find((o) => o.lessonTypeId === lessonType.id)
            const quantity = selected?.quantity || 0

            return (
              <HStack
                key={lessonType.id}
                justify="space-between"
                p={3}
                borderWidth="1px"
                borderColor="border.muted"
                borderRadius="md"
              >
                <VStack align="start" gap={1}>
                  <HStack gap={2}>
                    <Text fontWeight="medium">{lessonType.name}</Text>
                    {lessonType.category && (
                      <Badge colorPalette="purple" size="sm">
                        {lessonType.category}
                      </Badge>
                    )}
                  </HStack>
                  {lessonType.description && (
                    <Text fontSize="sm" color="fg.muted">
                      {lessonType.description}
                    </Text>
                  )}
                </VStack>

                <HStack gap={3}>
                  <Text fontWeight="medium" color="brand.600">
                    {lessonType.price.toLocaleString('ru-RU')} ₽
                  </Text>
                  <HStack gap={1}>
                    <Text fontSize="sm">×</Text>
                    <Input
                      type="number"
                      min={0}
                      max={99}
                      value={quantity || ''}
                      onChange={(e) => onChange(lessonType.id, Number(e.target.value) || 0, lessonType.price)}
                      size="sm"
                      w="60px"
                      textAlign="center"
                      placeholder="0"
                    />
                  </HStack>
                  {quantity > 0 && (
                    <Text fontWeight="bold" minW="80px" textAlign="right">
                      = {(lessonType.price * quantity).toLocaleString('ru-RU')} ₽
                    </Text>
                  )}
                </HStack>
              </HStack>
            )
          })}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
