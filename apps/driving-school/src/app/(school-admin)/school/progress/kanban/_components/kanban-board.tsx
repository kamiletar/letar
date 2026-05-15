'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, HStack } from '@chakra-ui/react'
import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useState, useTransition } from 'react'

import type { StudentProgressSummary } from '../../_actions/progress.action'
import type { KanbanData } from '../_actions/kanban.action'
import { moveStudentAction } from '../_actions/move-student.action'
import { KANBAN_COLUMNS, type KanbanStage } from '../_lib/kanban-config'
import { KanbanCardOverlay } from './kanban-card'
import { KanbanColumn } from './kanban-column'

interface KanbanBoardProps {
  initialData: KanbanData
  schoolId: string
}

/**
 * Kanban-доска для визуализации учеников по этапам обучения
 * Поддерживает drag & drop с оптимистичным обновлением
 */
export function KanbanBoard({ initialData, schoolId }: KanbanBoardProps) {
  const [data, setData] = useState(initialData)
  const [activeStudent, setActiveStudent] = useState<StudentProgressSummary | null>(null)
  const [isPending, startTransition] = useTransition()

  // Настройка сенсоров для drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Минимальное расстояние для начала перетаскивания
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  /**
   * Начало перетаскивания — сохраняем активного ученика для overlay
   */
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const studentId = active.id as string

    // Находим ученика в данных
    for (const column of data.columns) {
      const student = column.students.find((s) => s.id === studentId)
      if (student) {
        setActiveStudent(student)
        break
      }
    }
  }

  /**
   * Завершение перетаскивания — перемещаем ученика
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    // Сбрасываем активного ученика
    setActiveStudent(null)

    if (!over) {
      return
    }

    const studentId = active.id as string
    const targetColumnId = over.id as string

    // Проверяем, что целевая колонка — это колонка (а не другая карточка)
    const isColumn = KANBAN_COLUMNS.some((col) => col.id === targetColumnId)
    if (!isColumn) {
      return
    }

    // Находим текущую колонку ученика
    let fromStage: KanbanStage | null = null
    let student: StudentProgressSummary | null = null

    for (const column of data.columns) {
      const found = column.students.find((s) => s.id === studentId)
      if (found) {
        fromStage = column.id
        student = found
        break
      }
    }

    if (!fromStage || !student) {
      return
    }

    const toStage = targetColumnId as KanbanStage

    // Если колонка та же — ничего не делаем
    if (fromStage === toStage) {
      return
    }

    // Оптимистичное обновление
    setData((prev) => {
      const newColumns = prev.columns.map((column) => {
        if (column.id === fromStage) {
          return {
            ...column,
            students: column.students.filter((s) => s.id !== studentId),
            count: column.count - 1,
          }
        }
        if (column.id === toStage) {
          return {
            ...column,

            students: [...column.students, student!],
            count: column.count + 1,
          }
        }
        return column
      })

      return {
        ...prev,
        columns: newColumns,
        stats: {
          ...prev.stats,
          byStage: {
            ...prev.stats.byStage,

            [fromStage!]: prev.stats.byStage[fromStage!] - 1,
            [toStage]: prev.stats.byStage[toStage] + 1,
          },
        },
      }
    })

    // Сохраняем на сервере
    startTransition(async () => {
      const result = await moveStudentAction(studentId, fromStage!, toStage)

      if (!result.success) {
        // Откатываем при ошибке
        setData(initialData)

        toaster.error({
          title: 'Ошибка перемещения',
          description: result.message || 'Не удалось переместить ученика',
        })
      } else {
        toaster.success({
          title: 'Ученик перемещён',
          description: `Этап изменён на "${KANBAN_COLUMNS.find((c) => c.id === toStage)?.title}"`,
        })
      }
    })
  }

  /**
   * Отмена перетаскивания
   */
  const handleDragCancel = () => {
    setActiveStudent(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Box overflowX="auto" pb={4}>
        <HStack gap={4} align="start" minW="fit-content">
          {data.columns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              students={column.students}
              schoolId={schoolId}
              isLoading={isPending}
            />
          ))}
        </HStack>
      </Box>

      {/* Overlay для перетаскиваемой карточки */}
      <DragOverlay>
        {activeStudent ? <KanbanCardOverlay student={activeStudent} schoolId={schoolId} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
