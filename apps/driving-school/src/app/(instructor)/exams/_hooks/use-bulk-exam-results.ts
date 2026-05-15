'use client'

import { useBulkMutation } from '@/lib/hooks'

import { setBulkExamResultsAction } from '../_actions/exam.action'

interface BulkExamResultsData {
  results: Array<{
    registrationId: string
    result: 'PASSED' | 'FAILED' | 'NO_SHOW'
  }>
}

/**
 * Хук для массовой записи результатов экзамена.
 * Использует generic useBulkMutation для единообразия.
 */
export function useBulkExamResults() {
  return useBulkMutation(
    ({ results }: BulkExamResultsData) => setBulkExamResultsAction(results),
    ['ExamSession', 'ExamAttempt', 'ExamRegistration']
  )
}
