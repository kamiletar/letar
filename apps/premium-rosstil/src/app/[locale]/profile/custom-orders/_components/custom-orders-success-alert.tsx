'use client'

import { Alert } from '@chakra-ui/react'

interface AlertConfig {
  message: string
  status: 'success' | 'info' | 'warning' | 'error'
}

const ALERT_MESSAGES: Record<string, AlertConfig> = {
  'made-to-order': {
    message:
      'Ваша заявка на пошив по индивидуальным меркам успешно отправлена! Мы свяжемся с вами для уточнения деталей.',
    status: 'success',
  },
  'custom-design': {
    message:
      'Ваша заявка на индивидуальный дизайн успешно отправлена! Наш дизайнер свяжется с вами для обсуждения проекта.',
    status: 'success',
  },
  'b2b-partnership': {
    message: 'Ваша заявка на сотрудничество успешно отправлена! Наш менеджер свяжется с вами в ближайшее время.',
    status: 'success',
  },
  cancelled: {
    message: 'Заказ успешно отменён.',
    status: 'info',
  },
}

interface CustomOrdersSuccessAlertProps {
  type: string
}

/**
 * Alert displayed after creating or cancelling a custom order.
 * Shows different messages and statuses based on action type.
 */
export function CustomOrdersSuccessAlert({ type }: CustomOrdersSuccessAlertProps) {
  const config = ALERT_MESSAGES[type] || { message: 'Ваша заявка успешно отправлена!', status: 'success' as const }

  return (
    <Alert.Root status={config.status} mb={6}>
      <Alert.Indicator />
      <Alert.Title>{config.message}</Alert.Title>
    </Alert.Root>
  )
}
