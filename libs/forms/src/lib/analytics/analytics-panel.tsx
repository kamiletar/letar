'use client'

import { Box, Code, HStack, Text, VStack } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { UseFormAnalyticsResult } from './types'

export interface AnalyticsPanelProps {
  /** Результат useFormAnalytics */
  analytics: UseFormAnalyticsResult
  /** Позиция панели */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

/**
 * Form.Analytics.Panel — dev-only панель с live-аналитикой формы.
 * Показывает: completion rate, время на полях, ошибки, corrections.
 */
export function AnalyticsPanel({ analytics, position = 'bottom-right' }: AnalyticsPanelProps): ReactElement {
  const positionStyles = {
    'bottom-right': { bottom: 4, right: 4 },
    'bottom-left': { bottom: 4, left: 4 },
    'top-right': { top: 4, right: 4 },
    'top-left': { top: 4, left: 4 },
  }

  const topFields = Array.from(analytics.fieldAnalytics.entries())
    .sort((a, b) => b[1].totalTimeMs - a[1].totalTimeMs)
    .slice(0, 5)

  return (
    <Box
      position="fixed"
      {...positionStyles[position]}
      zIndex={9999}
      bg="gray.900"
      color="white"
      p={3}
      borderRadius="md"
      fontSize="xs"
      maxW="300px"
      opacity={0.9}
      boxShadow="lg"
    >
      <Text fontWeight="bold" mb={2}>
        Form Analytics
      </Text>

      <HStack gap={4} mb={2}>
        <VStack gap={0} align="start">
          <Text color="gray.400">Completion</Text>
          <Text fontWeight="bold" color={analytics.completionRate > 80 ? 'green.400' : 'yellow.400'}>
            {analytics.completionRate}%
          </Text>
        </VStack>
        <VStack gap={0} align="start">
          <Text color="gray.400">Errors</Text>
          <Text fontWeight="bold" color={analytics.totalErrors > 0 ? 'red.400' : 'green.400'}>
            {analytics.totalErrors}
          </Text>
        </VStack>
        <VStack gap={0} align="start">
          <Text color="gray.400">Time</Text>
          <Text fontWeight="bold">{Math.round(analytics.totalTimeMs / 1000)}s</Text>
        </VStack>
      </HStack>

      {topFields.length > 0 && (
        <>
          <Text color="gray.400" mb={1}>
            Top fields by time:
          </Text>
          {topFields.map(([field, fa]) => (
            <HStack key={field} justify="space-between">
              <Code fontSize="xs" bg="transparent" color="gray.300">
                {field}
              </Code>
              <Text>
                {Math.round(fa.totalTimeMs / 1000)}s {fa.errorCount > 0 && `(${fa.errorCount} err)`}
              </Text>
            </HStack>
          ))}
        </>
      )}

      {analytics.lastFocusedField && (
        <Text color="gray.500" mt={1}>
          Last: {analytics.lastFocusedField}
        </Text>
      )}
    </Box>
  )
}
