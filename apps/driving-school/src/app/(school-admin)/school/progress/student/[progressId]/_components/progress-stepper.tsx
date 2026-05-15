'use client'

import { Box, HStack, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuCircle, LuClock } from 'react-icons/lu'

import type { StudentProgressDetails } from '../../../_actions/progress.action'

type StepStatus = 'completed' | 'in_progress' | 'pending'

interface Step {
  id: string
  label: string
  status: StepStatus
}

interface ProgressStepperProps {
  progress: StudentProgressDetails
}

export function ProgressStepper({ progress }: ProgressStepperProps) {
  // Определяем статусы шагов
  const steps: Step[] = [
    {
      id: 'documents',
      label: 'Документы',
      status:
        progress.documentsStatus === 'READY'
          ? 'completed'
          : progress.documentsStatus === 'IN_PROGRESS'
            ? 'in_progress'
            : 'pending',
    },
    {
      id: 'state_fee',
      label: 'Госпошлина',
      status: progress.stateFeePaidAt ? 'completed' : 'pending',
    },
    {
      id: 'theory',
      label: 'Теория',
      status:
        progress.theoryStatus === 'COMPLETED'
          ? 'completed'
          : progress.theoryStatus === 'IN_PROGRESS'
            ? 'in_progress'
            : 'pending',
    },
    {
      id: 'gibdd_docs',
      label: 'Подача в ГИБДД',
      status: progress.docsSubmittedToGibdd ? 'completed' : 'pending',
    },
    {
      id: 'practice',
      label: 'Практика',
      status: progress.categories.some((c) => c.practiceStatus === 'COMPLETED')
        ? 'completed'
        : progress.categories.some((c) => c.practiceStatus === 'IN_PROGRESS')
          ? 'in_progress'
          : 'pending',
    },
    {
      id: 'internal_exam',
      label: 'Внутренний экзамен',
      status: progress.categories.some((c) => c.instructorApprovalStatus === 'APPROVED')
        ? 'completed'
        : progress.categories.some((c) => c.instructorApprovalStatus === 'REQUESTED')
          ? 'in_progress'
          : 'pending',
    },
    {
      id: 'gibdd_exam',
      label: 'Экзамен ГИБДД',
      status: progress.licenseIssuedAt ? 'completed' : 'pending',
    },
    {
      id: 'license',
      label: 'Права получены',
      status: progress.licenseIssuedAt ? 'completed' : 'pending',
    },
  ]

  return (
    <Box overflowX="auto" pb={4}>
      <HStack gap={0} minW="max-content">
        {steps.map((step, index) => (
          <HStack key={step.id} gap={0}>
            <StepItem step={step} />
            {index < steps.length - 1 && (
              <Box w="40px" h="2px" bg={step.status === 'completed' ? 'green.solid' : 'bg.emphasized'} />
            )}
          </HStack>
        ))}
      </HStack>
    </Box>
  )
}

interface StepItemProps {
  step: Step
}

function StepItem({ step }: StepItemProps) {
  const getIcon = () => {
    switch (step.status) {
      case 'completed':
        return <LuCheck size={16} />
      case 'in_progress':
        return <LuClock size={16} />
      default:
        return <LuCircle size={16} />
    }
  }

  const getColor = () => {
    switch (step.status) {
      case 'completed':
        return 'green'
      case 'in_progress':
        return 'yellow'
      default:
        return 'gray'
    }
  }

  const color = getColor()

  return (
    <VStack gap={1}>
      <Box
        w="32px"
        h="32px"
        borderRadius="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={step.status === 'completed' ? `${color}.solid` : 'bg.emphasized'}
        color={step.status === 'completed' ? 'white' : `${color}.fg`}
        borderWidth={step.status !== 'completed' ? '2px' : '0'}
        borderColor={`${color}.emphasized`}
      >
        {getIcon()}
      </Box>
      <Text
        fontSize="xs"
        fontWeight={step.status === 'in_progress' ? 'medium' : 'normal'}
        color={step.status === 'pending' ? 'fg.muted' : 'fg'}
        textAlign="center"
        w="70px"
      >
        {step.label}
      </Text>
    </VStack>
  )
}
