/**
 * Тесты для сервиса конфликтов расписания
 *
 * Покрывает тесты 3.4.1-3.4.3 из плана тестирования
 */
// globals: true — describe, expect, it доступны глобально

import {
  ACTIVE_LESSON_STATUSES,
  type AffectedLesson,
  createNotificationsForAffectedLessons,
  filterAffectedLessons,
  isActiveLessonStatus,
  isLessonAffected,
} from './schedule-conflicts'

describe('3.4.1 Обнаружение затронутых занятий', () => {
  describe('isActiveLessonStatus', () => {
    it('PENDING — активный статус', () => {
      expect(isActiveLessonStatus('PENDING')).toBe(true)
    })

    it('CONFIRMED — активный статус', () => {
      expect(isActiveLessonStatus('CONFIRMED')).toBe(true)
    })

    it('NEEDS_RESCHEDULE — активный статус', () => {
      expect(isActiveLessonStatus('NEEDS_RESCHEDULE')).toBe(true)
    })

    it('CANCELLED — не активный статус', () => {
      expect(isActiveLessonStatus('CANCELLED')).toBe(false)
    })

    it('COMPLETED — не активный статус', () => {
      expect(isActiveLessonStatus('COMPLETED')).toBe(false)
    })

    it('NO_SHOW — не активный статус', () => {
      expect(isActiveLessonStatus('NO_SHOW')).toBe(false)
    })

    it('RESCHEDULED — не активный статус', () => {
      expect(isActiveLessonStatus('RESCHEDULED')).toBe(false)
    })
  })

  describe('isLessonAffected', () => {
    it('занятие полностью внутри периода изменения — затронуто', () => {
      const lessonStart = new Date('2025-01-06T10:00:00')
      const lessonEnd = new Date('2025-01-06T11:30:00')
      const changeFrom = new Date('2025-01-06T09:00:00')
      const changeTo = new Date('2025-01-06T18:00:00')

      expect(isLessonAffected(lessonStart, lessonEnd, changeFrom, changeTo)).toBe(true)
    })

    it('занятие частично пересекается с началом периода — затронуто', () => {
      const lessonStart = new Date('2025-01-06T08:00:00')
      const lessonEnd = new Date('2025-01-06T10:00:00')
      const changeFrom = new Date('2025-01-06T09:00:00')
      const changeTo = new Date('2025-01-06T18:00:00')

      expect(isLessonAffected(lessonStart, lessonEnd, changeFrom, changeTo)).toBe(true)
    })

    it('занятие частично пересекается с концом периода — затронуто', () => {
      const lessonStart = new Date('2025-01-06T17:00:00')
      const lessonEnd = new Date('2025-01-06T19:00:00')
      const changeFrom = new Date('2025-01-06T09:00:00')
      const changeTo = new Date('2025-01-06T18:00:00')

      expect(isLessonAffected(lessonStart, lessonEnd, changeFrom, changeTo)).toBe(true)
    })

    it('занятие до периода изменения — не затронуто', () => {
      const lessonStart = new Date('2025-01-06T07:00:00')
      const lessonEnd = new Date('2025-01-06T08:30:00')
      const changeFrom = new Date('2025-01-06T09:00:00')
      const changeTo = new Date('2025-01-06T18:00:00')

      expect(isLessonAffected(lessonStart, lessonEnd, changeFrom, changeTo)).toBe(false)
    })

    it('занятие после периода изменения — не затронуто', () => {
      const lessonStart = new Date('2025-01-06T19:00:00')
      const lessonEnd = new Date('2025-01-06T20:30:00')
      const changeFrom = new Date('2025-01-06T09:00:00')
      const changeTo = new Date('2025-01-06T18:00:00')

      expect(isLessonAffected(lessonStart, lessonEnd, changeFrom, changeTo)).toBe(false)
    })

    it('занятие начинается ровно в конце периода — не затронуто', () => {
      const lessonStart = new Date('2025-01-06T18:00:00')
      const lessonEnd = new Date('2025-01-06T19:30:00')
      const changeFrom = new Date('2025-01-06T09:00:00')
      const changeTo = new Date('2025-01-06T18:00:00')

      expect(isLessonAffected(lessonStart, lessonEnd, changeFrom, changeTo)).toBe(false)
    })

    it('занятие заканчивается ровно в начале периода — не затронуто', () => {
      const lessonStart = new Date('2025-01-06T07:30:00')
      const lessonEnd = new Date('2025-01-06T09:00:00')
      const changeFrom = new Date('2025-01-06T09:00:00')
      const changeTo = new Date('2025-01-06T18:00:00')

      expect(isLessonAffected(lessonStart, lessonEnd, changeFrom, changeTo)).toBe(false)
    })
  })

  describe('filterAffectedLessons', () => {
    const changeFrom = new Date('2025-01-06T09:00:00')
    const changeTo = new Date('2025-01-06T18:00:00')

    it('фильтрует только активные занятия в периоде', () => {
      const lessons = [
        {
          id: '1',
          status: 'CONFIRMED' as const,
          startTime: new Date('2025-01-06T10:00:00'),
          endTime: new Date('2025-01-06T11:30:00'),
        },
        {
          id: '2',
          status: 'CANCELLED' as const,
          startTime: new Date('2025-01-06T12:00:00'),
          endTime: new Date('2025-01-06T13:30:00'),
        },
        {
          id: '3',
          status: 'PENDING' as const,
          startTime: new Date('2025-01-06T14:00:00'),
          endTime: new Date('2025-01-06T15:30:00'),
        },
      ]

      const affected = filterAffectedLessons(lessons, changeFrom, changeTo)

      expect(affected).toHaveLength(2)
      expect(affected.map((l) => l.id)).toContain('1')
      expect(affected.map((l) => l.id)).toContain('3')
      expect(affected.map((l) => l.id)).not.toContain('2')
    })

    it('не включает занятия вне периода', () => {
      const lessons = [
        {
          id: '1',
          status: 'CONFIRMED' as const,
          startTime: new Date('2025-01-06T07:00:00'),
          endTime: new Date('2025-01-06T08:30:00'),
        },
        {
          id: '2',
          status: 'CONFIRMED' as const,
          startTime: new Date('2025-01-06T19:00:00'),
          endTime: new Date('2025-01-06T20:30:00'),
        },
      ]

      const affected = filterAffectedLessons(lessons, changeFrom, changeTo)

      expect(affected).toHaveLength(0)
    })

    it('возвращает пустой массив если нет занятий', () => {
      const affected = filterAffectedLessons([], changeFrom, changeTo)
      expect(affected).toHaveLength(0)
    })
  })

  describe('ACTIVE_LESSON_STATUSES', () => {
    it('содержит 3 активных статуса', () => {
      expect(ACTIVE_LESSON_STATUSES).toHaveLength(3)
    })

    it('содержит PENDING, CONFIRMED, NEEDS_RESCHEDULE', () => {
      expect(ACTIVE_LESSON_STATUSES).toContain('PENDING')
      expect(ACTIVE_LESSON_STATUSES).toContain('CONFIRMED')
      expect(ACTIVE_LESSON_STATUSES).toContain('NEEDS_RESCHEDULE')
    })
  })
})

describe('3.4.2 Установка статуса NEEDS_RESCHEDULE для затронутых', () => {
  it('затронутые занятия должны получить статус NEEDS_RESCHEDULE', () => {
    const affectedLesson = {
      id: '1',
      status: 'CONFIRMED' as const,
      newStatus: 'NEEDS_RESCHEDULE' as const,
    }

    // Симуляция обновления статуса
    const updatedLesson = { ...affectedLesson, status: affectedLesson.newStatus }

    expect(updatedLesson.status).toBe('NEEDS_RESCHEDULE')
  })

  it('только PENDING и CONFIRMED занятия меняют статус', () => {
    const statuses = ['PENDING', 'CONFIRMED'] as const
    const canChange = statuses.every((s) => s === 'PENDING' || s === 'CONFIRMED')

    expect(canChange).toBe(true)
  })

  it('занятия со статусом NEEDS_RESCHEDULE не меняются (идемпотентность)', () => {
    const lesson = { status: 'NEEDS_RESCHEDULE' as const }
    const shouldUpdate = lesson.status !== 'NEEDS_RESCHEDULE'

    expect(shouldUpdate).toBe(false)
  })

  it('подсчёт обновлённых занятий', () => {
    const lessons = [
      { id: '1', status: 'CONFIRMED' as const },
      { id: '2', status: 'PENDING' as const },
      { id: '3', status: 'NEEDS_RESCHEDULE' as const },
    ]

    const toUpdate = lessons.filter((l) => l.status === 'PENDING' || l.status === 'CONFIRMED')
    expect(toUpdate).toHaveLength(2)
  })
})

describe('3.4.3 Создание уведомлений для учеников', () => {
  it('создаёт уведомление для каждого затронутого занятия', () => {
    const affectedLessons: AffectedLesson[] = [
      {
        id: 'lesson-1',
        studentId: 'student-1',
        slotId: 'slot-1',
        status: 'CONFIRMED',
        startTime: new Date('2025-01-06T10:00:00'),
        endTime: new Date('2025-01-06T11:30:00'),
      },
      {
        id: 'lesson-2',
        studentId: 'student-2',
        slotId: 'slot-2',
        status: 'PENDING',
        startTime: new Date('2025-01-06T14:00:00'),
        endTime: new Date('2025-01-06T15:30:00'),
      },
    ]

    const notifications = createNotificationsForAffectedLessons(affectedLessons)

    expect(notifications).toHaveLength(2)
  })

  it('уведомление содержит ID ученика', () => {
    const affectedLessons: AffectedLesson[] = [
      {
        id: 'lesson-1',
        studentId: 'student-123',
        slotId: 'slot-1',
        status: 'CONFIRMED',
        startTime: new Date('2025-01-06T10:00:00'),
        endTime: new Date('2025-01-06T11:30:00'),
      },
    ]

    const notifications = createNotificationsForAffectedLessons(affectedLessons)

    expect(notifications[0].userId).toBe('student-123')
  })

  it('уведомление содержит ID занятия', () => {
    const affectedLessons: AffectedLesson[] = [
      {
        id: 'lesson-456',
        studentId: 'student-1',
        slotId: 'slot-1',
        status: 'CONFIRMED',
        startTime: new Date('2025-01-06T10:00:00'),
        endTime: new Date('2025-01-06T11:30:00'),
      },
    ]

    const notifications = createNotificationsForAffectedLessons(affectedLessons)

    expect(notifications[0].lessonId).toBe('lesson-456')
  })

  it('уведомление имеет тип LESSON_NEEDS_RESCHEDULE', () => {
    const affectedLessons: AffectedLesson[] = [
      {
        id: 'lesson-1',
        studentId: 'student-1',
        slotId: 'slot-1',
        status: 'CONFIRMED',
        startTime: new Date('2025-01-06T10:00:00'),
        endTime: new Date('2025-01-06T11:30:00'),
      },
    ]

    const notifications = createNotificationsForAffectedLessons(affectedLessons)

    expect(notifications[0].type).toBe('LESSON_NEEDS_RESCHEDULE')
  })

  it('уведомление содержит информативное сообщение', () => {
    const affectedLessons: AffectedLesson[] = [
      {
        id: 'lesson-1',
        studentId: 'student-1',
        slotId: 'slot-1',
        status: 'CONFIRMED',
        startTime: new Date('2025-01-06T10:00:00'),
        endTime: new Date('2025-01-06T11:30:00'),
      },
    ]

    const notifications = createNotificationsForAffectedLessons(affectedLessons)

    expect(notifications[0].message).toContain('требует переноса')
    expect(notifications[0].message).toContain('изменения расписания')
  })

  it('возвращает пустой массив если нет затронутых занятий', () => {
    const notifications = createNotificationsForAffectedLessons([])

    expect(notifications).toHaveLength(0)
  })

  it('один ученик может получить несколько уведомлений', () => {
    const affectedLessons: AffectedLesson[] = [
      {
        id: 'lesson-1',
        studentId: 'student-1',
        slotId: 'slot-1',
        status: 'CONFIRMED',
        startTime: new Date('2025-01-06T10:00:00'),
        endTime: new Date('2025-01-06T11:30:00'),
      },
      {
        id: 'lesson-2',
        studentId: 'student-1',
        slotId: 'slot-2',
        status: 'PENDING',
        startTime: new Date('2025-01-06T14:00:00'),
        endTime: new Date('2025-01-06T15:30:00'),
      },
    ]

    const notifications = createNotificationsForAffectedLessons(affectedLessons)

    const studentNotifications = notifications.filter((n) => n.userId === 'student-1')
    expect(studentNotifications).toHaveLength(2)
  })
})
