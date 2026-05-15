'use client'

import type { CustomOrderStatus } from '@/generated/prisma'
import { Box, HStack, Steps, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuClock, LuPackage, LuSettings, LuX } from 'react-icons/lu'

interface OrderStatusProgressProps {
  status: CustomOrderStatus
}

const STATUS_STEPS = [
  { status: 'NEW', label: 'Новый', icon: <LuClock /> },
  { status: 'CONFIRMED', label: 'Подтверждён', icon: <LuCheck /> },
  { status: 'IN_PRODUCTION', label: 'В производстве', icon: <LuSettings /> },
  { status: 'COMPLETED', label: 'Выполнен', icon: <LuPackage /> },
] as const

function getStepIndex(status: CustomOrderStatus): number {
  const index = STATUS_STEPS.findIndex((s) => s.status === status)
  return index >= 0 ? index : 0
}

/**
 * Visual progress bar showing order status.
 * Displays 4 steps: NEW → CONFIRMED → IN_PRODUCTION → COMPLETED
 * Shows cancelled status separately with warning style.
 */
export function OrderStatusProgress({ status }: OrderStatusProgressProps) {
  // Special case for cancelled orders
  if (status === 'CANCELLED') {
    return (
      <Box bg="bg.error" borderRadius="lg" p={4} borderWidth={1} borderColor="border.error">
        <HStack gap={3}>
          <Box
            bg="red.500"
            color="white"
            borderRadius="full"
            p={2}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <LuX size={20} />
          </Box>
          <VStack align="start" gap={0}>
            <Text fontWeight="semibold" color="fg.error">
              Заказ отменён
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Этот заказ был отменён
            </Text>
          </VStack>
        </HStack>
      </Box>
    )
  }

  const currentStep = getStepIndex(status)

  return (
    <Box>
      <Steps.Root step={currentStep} count={STATUS_STEPS.length} size="sm" colorPalette="green" variant="subtle">
        <Steps.List>
          {STATUS_STEPS.map((step) => (
            <Steps.Item key={step.status} index={STATUS_STEPS.indexOf(step)}>
              <Steps.Indicator>
                <Steps.Status incomplete={step.icon} current={step.icon} complete={<LuCheck />} />
              </Steps.Indicator>
              <Steps.Title
                fontSize={{ base: 'xs', md: 'sm' }}
                display={{ base: STATUS_STEPS.indexOf(step) === currentStep ? 'block' : 'none', md: 'block' }}
              >
                {step.label}
              </Steps.Title>
              <Steps.Separator />
            </Steps.Item>
          ))}
        </Steps.List>
      </Steps.Root>
    </Box>
  )
}
