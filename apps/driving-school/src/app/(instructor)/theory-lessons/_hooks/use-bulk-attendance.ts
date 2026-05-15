'use client'

import { useBulkMutation } from '@/lib/hooks'

import { markBulkAttendanceAction } from '../_actions/theory-lesson.action'

interface BulkAttendanceData {
  lessonId: string
  attendance: Array<{ memberId: string; isPresent: boolean }>
}

/**
 * Хук для массовой отметки посещаемости на занятии.
 * Использует generic useBulkMutation для единообразия.
 */
export function useBulkAttendance() {
  return useBulkMutation(
    ({ lessonId, attendance }: BulkAttendanceData) => markBulkAttendanceAction(lessonId, attendance),
    ['TheoryLesson', 'TheoryAttendance']
  )
}
