'use client'

/**
 * Хук для управления состоянием редактора перерывов
 */

import { useState, useTransition } from 'react'

import { toaster } from '@/app/_components/ui/toaster'
import type { DayOfWeek } from '@letar/driving-school-db/prisma'

import {
  createCustomBreak,
  type CustomBreakData,
  deleteCustomBreak,
  updateCustomBreak,
} from '../_actions/custom-breaks.action'
import { type BreakFormData, INITIAL_FORM_DATA } from '../_components/custom-breaks-constants'

export interface UseCustomBreaksOptions {
  initialBreaks: CustomBreakData[]
}

export interface UseCustomBreaksReturn {
  /** Список перерывов */
  breaks: CustomBreakData[]
  /** Показывать форму добавления/редактирования */
  isAdding: boolean
  /** ID редактируемого перерыва (null если создаём новый) */
  editingBreakId: string | null
  /** Данные формы */
  formData: BreakFormData
  /** Ожидание ответа сервера */
  isPending: boolean
  /** Режим редактирования (true если editingBreakId !== null) */
  isEditing: boolean
  /** Минимальная дата для разового перерыва (сегодня) */
  today: string

  // Хэндлеры
  handleStartAdd: () => void
  handleStartEdit: (breakItem: CustomBreakData) => void
  handleCancel: () => void
  handleAdd: () => void
  handleUpdate: () => void
  handleDelete: (id: string) => void
  setFormData: React.Dispatch<React.SetStateAction<BreakFormData>>
}

/**
 * Хук управления перерывами инструктора
 */
export function useCustomBreaks({ initialBreaks }: UseCustomBreaksOptions): UseCustomBreaksReturn {
  const [breaks, setBreaks] = useState<CustomBreakData[]>(initialBreaks)
  const [isAdding, setIsAdding] = useState(false)
  const [editingBreakId, setEditingBreakId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState<BreakFormData>(INITIAL_FORM_DATA)

  // Минимальная дата для разового перерыва (сегодня)
  const today = new Date().toISOString().split('T')[0]

  // Определяем режим формы
  const isEditing = editingBreakId !== null

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA)
  }

  const handleStartAdd = () => {
    resetForm()
    setEditingBreakId(null)
    setIsAdding(true)
  }

  const handleStartEdit = (breakItem: CustomBreakData) => {
    setFormData({
      breakType: breakItem.isRecurring ? 'recurring' : 'oneTime',
      dayOfWeek: breakItem.dayOfWeek || 'MONDAY',
      specificDate: breakItem.specificDate ? new Date(breakItem.specificDate).toISOString().split('T')[0] : '',
      startTime: breakItem.startTime,
      endTime: breakItem.endTime,
      reason: breakItem.reason || '',
    })
    setEditingBreakId(breakItem.id)
    setIsAdding(true)
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingBreakId(null)
    resetForm()
  }

  const handleAdd = () => {
    startTransition(async () => {
      const isRecurring = formData.breakType === 'recurring'

      const result = await createCustomBreak({
        isRecurring,
        dayOfWeek: isRecurring ? formData.dayOfWeek : null,
        specificDate: !isRecurring && formData.specificDate ? new Date(formData.specificDate) : null,
        startTime: formData.startTime,
        endTime: formData.endTime,
        reason: formData.reason || null,
      })

      if (result.success) {
        setBreaks((prev) => [...prev, ...result.data])
        handleCancel()
        const count = result.data.length
        toaster.success({
          title: count > 1 ? `Добавлено ${count} перерывов` : 'Перерыв добавлен',
        })
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    })
  }

  const handleUpdate = () => {
    if (!editingBreakId) {
      return
    }

    startTransition(async () => {
      const editingBreak = breaks.find((b) => b.id === editingBreakId)
      if (!editingBreak) {
        return
      }

      const result = await updateCustomBreak({
        id: editingBreakId,
        dayOfWeek: editingBreak.isRecurring ? (formData.dayOfWeek as DayOfWeek) : null,
        specificDate: !editingBreak.isRecurring && formData.specificDate ? new Date(formData.specificDate) : null,
        startTime: formData.startTime,
        endTime: formData.endTime,
        reason: formData.reason || null,
      })

      if (result.success) {
        setBreaks((prev) => prev.map((b) => (b.id === editingBreakId ? result.data : b)))
        handleCancel()
        toaster.success({ title: 'Перерыв обновлён' })
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteCustomBreak(id)
      if (result.success) {
        setBreaks((prev) => prev.filter((b) => b.id !== id))
        toaster.success({ title: 'Перерыв удалён' })
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    })
  }

  return {
    breaks,
    isAdding,
    editingBreakId,
    formData,
    isPending,
    isEditing,
    today,
    handleStartAdd,
    handleStartEdit,
    handleCancel,
    handleAdd,
    handleUpdate,
    handleDelete,
    setFormData,
  }
}
