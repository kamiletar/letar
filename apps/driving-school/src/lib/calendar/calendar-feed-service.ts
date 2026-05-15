/**
 * Calendar Feed Service — управление iCal feeds
 *
 * Сервис для создания и получения данных для iCal feeds пользователей.
 */

import { prisma } from '@/lib/db'
import type { ExamType } from '@letar/driving-school-db/prisma'
import { ICalGenerator } from './ical-generator'

/** Получить человекочитаемое название типа экзамена */
function getExamTypeName(type: ExamType): string {
  const names: Record<ExamType, string> = {
    INTERNAL_THEORY: 'Внутренний теоретический',
    INTERNAL_PRACTICE: 'Внутренний практический',
    GIBDD_THEORY: 'ГИБДД теория',
    GIBDD_PRACTICE_AREA: 'ГИБДД площадка',
    GIBDD_PRACTICE_CITY: 'ГИБДД город',
  }
  return names[type] || type
}

/** Опции генерации feed */
export interface CalendarFeedOptions {
  /** Включить занятия */
  includeLessons?: boolean
  /** Включить экзамены */
  includeExams?: boolean
  /** Включить теоретические занятия */
  includeTheoryLessons?: boolean
  /** Включить отсутствия (для инструкторов) */
  includeAbsences?: boolean
  /** Период в днях назад от сегодня */
  daysBack?: number
  /** Период в днях вперёд от сегодня */
  daysForward?: number
}

const DEFAULT_OPTIONS: Required<CalendarFeedOptions> = {
  includeLessons: true,
  includeExams: true,
  includeTheoryLessons: true,
  includeAbsences: false,
  daysBack: 30,
  daysForward: 90,
}

/**
 * Получить или создать CalendarFeed для пользователя
 */
export async function getOrCreateCalendarFeed(userId: string) {
  let feed = await prisma.calendarFeed.findUnique({
    where: { userId },
  })

  if (!feed) {
    feed = await prisma.calendarFeed.create({
      data: { userId },
    })
  }

  return feed
}

/**
 * Обновить счётчик доступа к feed
 */
export async function updateFeedAccessStats(feedId: string) {
  await prisma.calendarFeed.update({
    where: { id: feedId },
    data: {
      lastAccessedAt: new Date(),
      accessCount: { increment: 1 },
    },
  })
}

/**
 * Получить CalendarFeed по токену
 */
export async function getCalendarFeedByToken(token: string) {
  return prisma.calendarFeed.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          roles: true,
          timezone: true,
        },
      },
    },
  })
}

/**
 * Сгенерировать iCal feed для пользователя
 */
export async function generateUserCalendarFeed(
  userId: string,
  options: CalendarFeedOptions = {},
  feedUrl?: string
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Период дат
  const now = new Date()
  const startDate = new Date(now.getTime() - opts.daysBack * 24 * 60 * 60 * 1000)
  const endDate = new Date(now.getTime() + opts.daysForward * 24 * 60 * 60 * 1000)

  // Получаем пользователя с ролями
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      roles: true,
      timezone: true,
      instructorProfile: { select: { id: true } },
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const isInstructor = user.roles.includes('FREELANCE_INSTRUCTOR')
  const calendarName = isInstructor
    ? `Расписание инструктора — ${user.name || 'Автошкола'}`
    : `Мои занятия — ${user.name || 'Автошкола'}`

  const generator = new ICalGenerator({
    calendarName,
    calendarDescription: 'Календарь занятий автошколы',
    timezone: user.timezone,
    refreshUrl: feedUrl,
    refreshInterval: 30, // Обновлять каждые 30 минут
  })

  // Загружаем занятия
  if (opts.includeLessons) {
    const lessons = await prisma.lesson.findMany({
      where: {
        OR: [{ studentId: userId }, { instructorId: userId }],
        slot: {
          startTime: { gte: startDate },
          endTime: { lte: endDate },
        },
        status: { not: 'CANCELLED' }, // Пропускаем отменённые
      },
      include: {
        slot: { select: { startTime: true, endTime: true } },
        student: { select: { name: true, email: true } },
        instructor: { select: { name: true, email: true } },
        lessonType: { select: { name: true } },
      },
      orderBy: { slot: { startTime: 'asc' } },
    })

    for (const lesson of lessons) {
      const viewerRole = lesson.studentId === userId ? 'student' : 'instructor'
      const event = ICalGenerator.lessonToEvent(lesson, viewerRole)
      generator.addEvent(event)
    }
  }

  // Загружаем экзамены (для учеников)
  if (opts.includeExams) {
    const examRegistrations = await prisma.examRegistration.findMany({
      where: {
        userId: userId,
        session: {
          scheduledAt: { gte: startDate, lte: endDate },
          status: { not: 'CANCELLED' },
        },
      },
      include: {
        session: true,
      },
    })

    for (const reg of examRegistrations) {
      const examTypeName = getExamTypeName(reg.session.type)
      const event = ICalGenerator.examToEvent(reg.session, examTypeName)
      generator.addEvent(event)
    }
  }

  // Загружаем теоретические занятия
  if (opts.includeTheoryLessons) {
    // Для учеников — через StudyGroupMember
    const studentTheoryLessons = await prisma.theoryLesson.findMany({
      where: {
        group: {
          members: {
            some: { userId },
          },
        },
        scheduledAt: { gte: startDate, lte: endDate },
        status: { not: 'CANCELLED' },
      },
      include: {
        topic: { select: { name: true } },
        instructor: { select: { name: true, email: true } },
        group: { select: { name: true } },
      },
    })

    // Для инструкторов теории — через instructorId
    const instructorTheoryLessons = isInstructor
      ? await prisma.theoryLesson.findMany({
          where: {
            instructorId: userId,
            scheduledAt: { gte: startDate, lte: endDate },
            status: { not: 'CANCELLED' },
          },
          include: {
            topic: { select: { name: true } },
            instructor: { select: { name: true, email: true } },
            group: { select: { name: true } },
          },
        })
      : []

    // Объединяем и убираем дубликаты
    const theoryLessonsMap = new Map<string, (typeof studentTheoryLessons)[0]>()
    for (const tl of [...studentTheoryLessons, ...instructorTheoryLessons]) {
      theoryLessonsMap.set(tl.id, tl)
    }

    for (const theoryLesson of theoryLessonsMap.values()) {
      const event = ICalGenerator.theoryLessonToEvent(theoryLesson)
      generator.addEvent(event)
    }
  }

  // Загружаем отсутствия (только для инструкторов и только свои)
  if (opts.includeAbsences && isInstructor && user.instructorProfile) {
    const absences = await prisma.absence.findMany({
      where: {
        instructorId: user.instructorProfile.id,
        isActive: true,
        OR: [{ startDate: { gte: startDate, lte: endDate } }, { endDate: { gte: startDate, lte: endDate } }],
      },
    })

    for (const absence of absences) {
      const event = ICalGenerator.absenceToEvent(absence, user.name || 'Инструктор')
      generator.addEvent(event)
    }
  }

  return generator.generate()
}

/**
 * Удалить CalendarFeed пользователя
 */
export async function deleteCalendarFeed(userId: string) {
  return prisma.calendarFeed.delete({
    where: { userId },
  })
}

/**
 * Перегенерировать токен feed (для безопасности)
 */
export async function regenerateFeedToken(userId: string) {
  // Генерируем новый cuid
  const newToken = crypto.randomUUID()

  return prisma.calendarFeed.update({
    where: { userId },
    data: { token: newToken },
  })
}
