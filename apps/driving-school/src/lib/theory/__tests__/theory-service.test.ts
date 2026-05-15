/**
 * Тесты для сервиса теоретических занятий
 */
// globals: true — describe, expect, it доступны глобально

import {
  type AttendanceRecord,
  buildAttendanceList,
  calculateAttendanceRate,
  calculateAttendanceStats,
  calculateLessonStats,
  canCancelLesson,
  canEditLesson,
  canMarkAttendance,
  filterActiveMembers,
  getNextLessonStatus,
  type GroupMember,
  type TheoryLessonStatus,
} from '../theory-service'

// ============================================
// buildAttendanceList
// ============================================

describe('buildAttendanceList', () => {
  it('должен возвращать пустой список для пустой группы', () => {
    const members: GroupMember[] = []
    const attendances: AttendanceRecord[] = []

    const result = buildAttendanceList(members, attendances)

    expect(result).toHaveLength(0)
  })

  it('должен возвращать неотмеченных членов с isPresent: false', () => {
    const members: GroupMember[] = [
      { id: 'member-1', userId: 'user-1', user: { id: 'user-1', name: 'Иван', email: 'ivan@test.com', image: null } },
      { id: 'member-2', userId: 'user-2', user: { id: 'user-2', name: 'Мария', email: 'maria@test.com', image: null } },
    ]
    const attendances: AttendanceRecord[] = []

    const result = buildAttendanceList(members, attendances)

    expect(result).toHaveLength(2)
    expect(result[0].isPresent).toBe(false)
    expect(result[1].isPresent).toBe(false)
  })

  it('должен правильно объединять посещаемость с членами', () => {
    const members: GroupMember[] = [
      { id: 'member-1', userId: 'user-1', user: { id: 'user-1', name: 'Иван', email: 'ivan@test.com', image: null } },
      { id: 'member-2', userId: 'user-2', user: { id: 'user-2', name: 'Мария', email: 'maria@test.com', image: null } },
    ]
    const markedAt = new Date()
    const attendances: AttendanceRecord[] = [{ memberId: 'member-1', isPresent: true, markedAt }]

    const result = buildAttendanceList(members, attendances)

    expect(result[0].isPresent).toBe(true)
    expect(result[0].markedAt).toBe(markedAt)
    expect(result[1].isPresent).toBe(false)
    expect(result[1].markedAt).toBeNull()
  })

  it('должен сохранять данные пользователя', () => {
    const members: GroupMember[] = [
      {
        id: 'member-1',
        userId: 'user-1',
        user: { id: 'user-1', name: 'Иван Петров', email: 'ivan@test.com', image: '/avatar.jpg' },
      },
    ]
    const attendances: AttendanceRecord[] = []

    const result = buildAttendanceList(members, attendances)

    expect(result[0].userName).toBe('Иван Петров')
    expect(result[0].userEmail).toBe('ivan@test.com')
    expect(result[0].userImage).toBe('/avatar.jpg')
    expect(result[0].userId).toBe('user-1')
    expect(result[0].memberId).toBe('member-1')
  })
})

// ============================================
// calculateAttendanceRate
// ============================================

describe('calculateAttendanceRate', () => {
  it('должен возвращать null для нулевого количества занятий', () => {
    const result = calculateAttendanceRate(0, 0)
    expect(result).toBeNull()
  })

  it('должен возвращать 0 для нулевой посещаемости', () => {
    const result = calculateAttendanceRate(0, 10)
    expect(result).toBe(0)
  })

  it('должен возвращать 100 для полной посещаемости', () => {
    const result = calculateAttendanceRate(10, 10)
    expect(result).toBe(100)
  })

  it('должен округлять до целых', () => {
    const result = calculateAttendanceRate(1, 3)
    expect(result).toBe(33) // 33.33... округляется до 33
  })

  it('должен корректно считать 75%', () => {
    const result = calculateAttendanceRate(3, 4)
    expect(result).toBe(75)
  })
})

// ============================================
// calculateAttendanceStats
// ============================================

describe('calculateAttendanceStats', () => {
  it('должен возвращать нулевую статистику для пустого списка', () => {
    const result = calculateAttendanceStats([])

    expect(result.total).toBe(0)
    expect(result.present).toBe(0)
    expect(result.absent).toBe(0)
    expect(result.rate).toBeNull()
  })

  it('должен корректно считать присутствующих и отсутствующих', () => {
    const attendances: AttendanceRecord[] = [
      { memberId: 'm-1', isPresent: true, markedAt: new Date() },
      { memberId: 'm-2', isPresent: false, markedAt: new Date() },
      { memberId: 'm-3', isPresent: true, markedAt: new Date() },
      { memberId: 'm-4', isPresent: true, markedAt: new Date() },
    ]

    const result = calculateAttendanceStats(attendances)

    expect(result.total).toBe(4)
    expect(result.present).toBe(3)
    expect(result.absent).toBe(1)
    expect(result.rate).toBe(75)
  })
})

// ============================================
// calculateLessonStats
// ============================================

describe('calculateLessonStats', () => {
  it('должен возвращать нулевую статистику для пустого списка', () => {
    const result = calculateLessonStats([])

    expect(result.totalLessons).toBe(0)
    expect(result.completedLessons).toBe(0)
    expect(result.cancelledLessons).toBe(0)
    expect(result.scheduledLessons).toBe(0)
    expect(result.averageAttendanceRate).toBeNull()
  })

  it('должен корректно считать занятия по статусам', () => {
    const lessons: Array<{ status: TheoryLessonStatus; attendances: AttendanceRecord[] }> = [
      { status: 'COMPLETED', attendances: [] },
      { status: 'COMPLETED', attendances: [] },
      { status: 'CANCELLED', attendances: [] },
      { status: 'SCHEDULED', attendances: [] },
      { status: 'IN_PROGRESS', attendances: [] },
    ]

    const result = calculateLessonStats(lessons)

    expect(result.totalLessons).toBe(5)
    expect(result.completedLessons).toBe(2)
    expect(result.cancelledLessons).toBe(1)
    expect(result.scheduledLessons).toBe(1)
  })

  it('должен считать среднюю посещаемость по завершённым занятиям', () => {
    const lessons: Array<{ status: TheoryLessonStatus; attendances: AttendanceRecord[] }> = [
      {
        status: 'COMPLETED',
        attendances: [
          { memberId: 'm-1', isPresent: true, markedAt: new Date() },
          { memberId: 'm-2', isPresent: true, markedAt: new Date() },
        ],
      },
      {
        status: 'COMPLETED',
        attendances: [
          { memberId: 'm-1', isPresent: true, markedAt: new Date() },
          { memberId: 'm-2', isPresent: false, markedAt: new Date() },
        ],
      },
      { status: 'SCHEDULED', attendances: [] },
    ]

    const result = calculateLessonStats(lessons)

    // Первое: 100%, второе: 50%, среднее: 75%
    expect(result.averageAttendanceRate).toBe(75)
  })
})

// ============================================
// canEditLesson, canCancelLesson, canMarkAttendance
// ============================================

describe('canEditLesson', () => {
  it('должен разрешать редактирование SCHEDULED', () => {
    expect(canEditLesson('SCHEDULED')).toBe(true)
  })

  it('должен запрещать редактирование IN_PROGRESS', () => {
    expect(canEditLesson('IN_PROGRESS')).toBe(false)
  })

  it('должен запрещать редактирование COMPLETED', () => {
    expect(canEditLesson('COMPLETED')).toBe(false)
  })

  it('должен запрещать редактирование CANCELLED', () => {
    expect(canEditLesson('CANCELLED')).toBe(false)
  })
})

describe('canCancelLesson', () => {
  it('должен разрешать отмену SCHEDULED', () => {
    expect(canCancelLesson('SCHEDULED')).toBe(true)
  })

  it('должен разрешать отмену IN_PROGRESS', () => {
    expect(canCancelLesson('IN_PROGRESS')).toBe(true)
  })

  it('должен запрещать отмену COMPLETED', () => {
    expect(canCancelLesson('COMPLETED')).toBe(false)
  })

  it('должен запрещать отмену CANCELLED', () => {
    expect(canCancelLesson('CANCELLED')).toBe(false)
  })
})

describe('canMarkAttendance', () => {
  it('должен запрещать отметку посещаемости для SCHEDULED', () => {
    expect(canMarkAttendance('SCHEDULED')).toBe(false)
  })

  it('должен разрешать отметку посещаемости для IN_PROGRESS', () => {
    expect(canMarkAttendance('IN_PROGRESS')).toBe(true)
  })

  it('должен разрешать отметку посещаемости для COMPLETED', () => {
    expect(canMarkAttendance('COMPLETED')).toBe(true)
  })

  it('должен запрещать отметку посещаемости для CANCELLED', () => {
    expect(canMarkAttendance('CANCELLED')).toBe(false)
  })
})

// ============================================
// getNextLessonStatus
// ============================================

describe('getNextLessonStatus', () => {
  describe('action: start', () => {
    it('должен переводить SCHEDULED в IN_PROGRESS', () => {
      expect(getNextLessonStatus('SCHEDULED', 'start')).toBe('IN_PROGRESS')
    })

    it('должен возвращать null для IN_PROGRESS', () => {
      expect(getNextLessonStatus('IN_PROGRESS', 'start')).toBeNull()
    })

    it('должен возвращать null для COMPLETED', () => {
      expect(getNextLessonStatus('COMPLETED', 'start')).toBeNull()
    })
  })

  describe('action: complete', () => {
    it('должен переводить IN_PROGRESS в COMPLETED', () => {
      expect(getNextLessonStatus('IN_PROGRESS', 'complete')).toBe('COMPLETED')
    })

    it('должен возвращать null для SCHEDULED', () => {
      expect(getNextLessonStatus('SCHEDULED', 'complete')).toBeNull()
    })
  })

  describe('action: cancel', () => {
    it('должен переводить SCHEDULED в CANCELLED', () => {
      expect(getNextLessonStatus('SCHEDULED', 'cancel')).toBe('CANCELLED')
    })

    it('должен переводить IN_PROGRESS в CANCELLED', () => {
      expect(getNextLessonStatus('IN_PROGRESS', 'cancel')).toBe('CANCELLED')
    })

    it('должен возвращать null для COMPLETED', () => {
      expect(getNextLessonStatus('COMPLETED', 'cancel')).toBeNull()
    })

    it('должен возвращать null для CANCELLED', () => {
      expect(getNextLessonStatus('CANCELLED', 'cancel')).toBeNull()
    })
  })
})

// ============================================
// filterActiveMembers
// ============================================

describe('filterActiveMembers', () => {
  it('должен возвращать пустой массив для пустого входа', () => {
    const result = filterActiveMembers([])
    expect(result).toHaveLength(0)
  })

  it('должен фильтровать только активных участников', () => {
    const members = [
      { id: 'm-1', leftAt: null },
      { id: 'm-2', leftAt: new Date() },
      { id: 'm-3', leftAt: null },
    ]

    const result = filterActiveMembers(members)

    expect(result).toHaveLength(2)
    expect(result.map((m) => m.id)).toEqual(['m-1', 'm-3'])
  })

  it('должен возвращать всех если никто не ушёл', () => {
    const members = [
      { id: 'm-1', leftAt: null },
      { id: 'm-2', leftAt: null },
    ]

    const result = filterActiveMembers(members)

    expect(result).toHaveLength(2)
  })
})
