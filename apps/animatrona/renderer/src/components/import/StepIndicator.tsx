'use client'

/**
 * Индикатор прогресса шагов визарда
 */

import { Box, Circle, HStack, Text } from '@chakra-ui/react'
import { LuCheck } from 'react-icons/lu'

export interface Step {
  id: number
  title: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
}

/**
 * Отображает прогресс по шагам визарда
 */
export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <HStack gap={0} justify="center" w="full" flexWrap="nowrap" overflow="hidden" pt={3} pb={1}>
      {steps.map((step, index) => {
        const isCompleted = step.id < currentStep
        const isCurrent = step.id === currentStep
        const isLast = index === steps.length - 1

        return (
          <HStack key={step.id} gap={0} flexShrink={0}>
            {/* Круг с номером или галочкой */}
            <HStack gap={1}>
              <Circle
                size="6"
                bg={isCompleted ? 'primary.solid' : isCurrent ? 'primary.emphasized' : 'bg.emphasized'}
                color={isCompleted || isCurrent ? 'primary.contrast' : 'fg.muted'}
                fontWeight="medium"
                fontSize="xs"
                borderWidth={isCurrent ? '2px' : '0'}
                borderColor="primary.fg"
              >
                {isCompleted ? <LuCheck size={12} /> : step.id}
              </Circle>
              <Text
                fontSize="xs"
                color={isCurrent ? 'fg' : isCompleted ? 'fg.muted' : 'fg.subtle'}
                fontWeight={isCurrent ? 'medium' : 'normal'}
                whiteSpace="nowrap"
              >
                {step.title}
              </Text>
            </HStack>

            {/* Линия соединения */}
            {!isLast && (
              <Box w="24px" h="2px" bg={isCompleted ? 'primary.solid' : 'bg.emphasized'} mx={1} flexShrink={0} />
            )}
          </HStack>
        )
      })}
    </HStack>
  )
}
