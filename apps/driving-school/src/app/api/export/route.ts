import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  type ExportDataType,
  type ExportFormat,
  type ExportRow,
  generateExportFile,
  getExportFilename,
  getExportMimeType,
  toInstructorExportRow,
  toLessonExportRow,
  toStatsExportRows,
  toStudentExportRow,
} from '@/lib/excel'
import type { LessonStatus } from '@letar/driving-school-db/prisma'
import { NextResponse } from 'next/server'

interface LessonStatusCount {
  status: LessonStatus
  _count: { status: number }
}

// Лимит записей за один запрос для предотвращения переполнения памяти
const EXPORT_BATCH_SIZE = 1000

// GET /api/export?type=students&format=xlsx&schoolId=xxx&dateFrom=...&dateTo=...
export async function GET(request: Request) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dataType = searchParams.get('type') as ExportDataType | null
    const format = (searchParams.get('format') || 'xlsx') as ExportFormat
    const schoolId = searchParams.get('schoolId')

    // Валидация типа данных
    const validTypes: ExportDataType[] = ['students', 'instructors', 'lessons', 'stats']
    if (!dataType || !validTypes.includes(dataType)) {
      return NextResponse.json(
        { error: 'Некорректный тип данных. Допустимые значения: students, instructors, lessons, stats' },
        { status: 400 }
      )
    }

    // Валидация формата
    const validFormats: ExportFormat[] = ['xlsx', 'ods', 'csv']
    if (!validFormats.includes(format)) {
      return NextResponse.json({ error: 'Некорректный формат. Допустимые значения: xlsx, ods, csv' }, { status: 400 })
    }

    // Проверка schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'Не указан ID школы' }, { status: 400 })
    }

    // Проверяем права доступа (owner, super_manager или manager организации)
    const membership = await prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: schoolId,
          userId: session.user.id,
        },
      },
    })

    if (!membership || !['owner', 'super_manager', 'manager'].includes(membership.role)) {
      return NextResponse.json({ error: 'Недостаточно прав. Требуется роль владельца или менеджера' }, { status: 403 })
    }

    // Фильтры для занятий
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const status = searchParams.get('status')
    const instructorId = searchParams.get('instructorId')

    // Получаем данные в зависимости от типа
    let rows: ExportRow[]

    switch (dataType) {
      case 'students': {
        const members = await prisma.member.findMany({
          where: {
            organizationId: schoolId,
            role: 'member',
          },
          include: {
            user: {
              include: {
                studentProfile: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          // Ограничиваем выборку для предотвращения переполнения памяти
          take: EXPORT_BATCH_SIZE,
        })

        rows = members.map((member) =>
          toStudentExportRow({
            user: member.user,
            joinedAt: member.createdAt, // Member.createdAt → joinedAt для обратной совместимости
          })
        )
        break
      }

      case 'instructors': {
        const members = await prisma.member.findMany({
          where: {
            organizationId: schoolId,
            role: {
              in: ['instructor', 'theory_instructor'],
            },
          },
          include: {
            user: {
              include: {
                instructorProfile: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          // Ограничиваем выборку для предотвращения переполнения памяти
          take: EXPORT_BATCH_SIZE,
        })

        rows = members.map((member) =>
          toInstructorExportRow({
            user: member.user,
            joinedAt: member.createdAt,
          })
        )
        break
      }

      case 'lessons': {
        // Получаем инструкторов организации для фильтрации занятий
        const schoolInstructors = await prisma.member.findMany({
          where: {
            organizationId: schoolId,
            role: 'instructor',
          },
          select: {
            userId: true,
          },
        })

        const instructorIds = schoolInstructors.map((i: { userId: string }) => i.userId)

        // Формируем фильтр по датам
        const dateFilter: { gte?: Date; lte?: Date } = {}
        if (dateFrom) {
          dateFilter.gte = new Date(dateFrom)
        }
        if (dateTo) {
          dateFilter.lte = new Date(dateTo)
        }

        // Формируем фильтр по статусу
        const statusFilter = status ? status.split(',') : undefined

        const lessons = await prisma.lesson.findMany({
          where: {
            instructorId: instructorId || { in: instructorIds },
            ...(Object.keys(dateFilter).length > 0 && {
              slot: {
                startTime: dateFilter,
              },
            }),
            ...(statusFilter && {
              status: { in: statusFilter as LessonStatus[] },
            }),
          },
          include: {
            slot: true,
            student: true,
            instructor: true,
            lessonType: true,
          },
          orderBy: {
            slot: {
              startTime: 'desc',
            },
          },
          // Ограничиваем выборку для предотвращения переполнения памяти
          take: EXPORT_BATCH_SIZE,
        })

        rows = lessons.map((lesson) => toLessonExportRow(lesson))
        break
      }

      case 'stats': {
        // Получаем инструкторов организации
        const schoolInstructors = await prisma.member.findMany({
          where: {
            organizationId: schoolId,
            role: 'instructor',
          },
          select: {
            userId: true,
          },
        })

        const instructorIds = schoolInstructors.map((i: { userId: string }) => i.userId)

        // Подсчитываем статистику
        const [totalStudents, totalInstructors, lessonStats] = await Promise.all([
          prisma.member.count({
            where: { organizationId: schoolId, role: 'member' },
          }),
          prisma.member.count({
            where: { organizationId: schoolId, role: { in: ['instructor', 'theory_instructor'] } },
          }),
          prisma.lesson.groupBy({
            by: ['status'],
            where: {
              instructorId: { in: instructorIds },
            },
            _count: {
              status: true,
            },
          }),
        ])

        // Преобразуем статистику занятий
        const statusCounts = lessonStats.reduce(
          (acc: Record<string, number>, item: LessonStatusCount) => {
            acc[item.status] = item._count.status
            return acc
          },
          {} as Record<string, number>
        )

        const totalLessons = (Object.values(statusCounts) as number[]).reduce((sum, count) => sum + count, 0)

        rows = toStatsExportRows({
          totalStudents,
          totalInstructors,
          totalLessons,
          completedLessons: statusCounts['COMPLETED'] || 0,
          cancelledLessons: statusCounts['CANCELLED'] || 0,
          noShowLessons: statusCounts['NO_SHOW'] || 0,
          pendingLessons: statusCounts['PENDING'] || 0,
          confirmedLessons: statusCounts['CONFIRMED'] || 0,
        })
        break
      }
    }

    // Генерируем файл
    const result = generateExportFile(dataType, rows, format)

    // Возвращаем файл
    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type': getExportMimeType(format),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(getExportFilename(dataType, format))}"`,
      },
    })
  } catch (error) {
    console.error('Ошибка экспорта:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка экспорта данных' },
      { status: 500 }
    )
  }
}
