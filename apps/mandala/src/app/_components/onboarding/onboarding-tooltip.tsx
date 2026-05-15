'use client'

import { Box, Button, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRef } from 'react'
import { LuArrowLeft, LuArrowRight, LuX } from 'react-icons/lu'
import { useOnboarding } from './onboarding-provider'
import { arrowStyles, useTargetHighlight, useTooltipPosition } from './use-tooltip-position'

const MotionBox = motion.create(Box)

/**
 * Tooltip для онбординга.
 * Позиционируется относительно целевого элемента с data-onboarding атрибутом.
 */
export function OnboardingTooltip() {
  const { currentStep, currentStepIndex, totalSteps, isActive, nextStep, prevStep, skip } = useOnboarding()

  const tooltipRef = useRef<HTMLDivElement>(null)

  // Позиционирование тултипа
  const { position, targetElement } = useTooltipPosition({
    tooltipRef,
    currentStep,
    isActive,
  })

  // Подсветка целевого элемента
  useTargetHighlight(targetElement)

  return (
    <AnimatePresence>
      {isActive && currentStep && (
        <>
          {/* Оверлей для затемнения */}
          <MotionBox
            position="fixed"
            inset={0}
            zIndex={10000}
            bg="blackAlpha.600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            pointerEvents="none"
          />

          {/* Tooltip */}
          <MotionBox
            ref={tooltipRef}
            position="fixed"
            top={`${position.top}px`}
            left={`${position.left}px`}
            zIndex={10002}
            bg="gray.800"
            borderRadius="xl"
            border="1px solid"
            borderColor="whiteAlpha.200"
            boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            p={5}
            maxW="320px"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.3 }}
          >
            {/* Стрелка */}
            <Box
              position="absolute"
              w="16px"
              h="16px"
              bg="gray.800"
              borderTop="1px solid"
              borderLeft="1px solid"
              borderColor="whiteAlpha.200"
              {...arrowStyles[position.arrowPosition]}
            />

            {/* Контент */}
            <VStack align="stretch" gap={3}>
              {/* Заголовок и кнопка закрытия */}
              <HStack justify="space-between">
                <Heading as="h3" size="sm" color="white">
                  {currentStep.title}
                </Heading>
                <Button size="xs" variant="ghost" colorPalette="gray" onClick={skip} p={0} minW="auto" h="auto">
                  <LuX size={16} />
                </Button>
              </HStack>

              {/* Описание */}
              <Text fontSize="sm" color="gray.300" lineHeight="tall">
                {currentStep.description}
              </Text>

              {/* Навигация */}
              <HStack justify="space-between" pt={2}>
                {/* Прогресс */}
                <HStack gap={1}>
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <Box
                      key={`step-${i}`}
                      w="8px"
                      h="8px"
                      borderRadius="full"
                      bg={i === currentStepIndex ? 'brand.400' : 'whiteAlpha.300'}
                      transition="background 0.2s"
                    />
                  ))}
                </HStack>

                {/* Кнопки */}
                <HStack gap={2}>
                  {currentStepIndex > 0 && (
                    <Button size="sm" variant="ghost" colorPalette="gray" onClick={prevStep}>
                      <LuArrowLeft size={14} />
                      Назад
                    </Button>
                  )}
                  <Button size="sm" colorPalette="brand" onClick={nextStep}>
                    {currentStepIndex < totalSteps - 1 ? (
                      <>
                        Далее
                        <LuArrowRight size={14} />
                      </>
                    ) : (
                      'Готово'
                    )}
                  </Button>
                </HStack>
              </HStack>
            </VStack>
          </MotionBox>
        </>
      )}
    </AnimatePresence>
  )
}
