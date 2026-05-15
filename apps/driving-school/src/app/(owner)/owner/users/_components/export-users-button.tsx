'use client'

import { ExportButton, type ExportConfig } from '@/app/_components/export-button'

import { exportUsersAction } from '../_actions/user.action'

/**
 * Кнопка экспорта пользователей с выбором полей
 */
export function ExportUsersButton() {
  const exportConfig: ExportConfig = {
    filename: `users-export-${new Date().toISOString().slice(0, 10)}`,
    fields: [
      { key: 'id', label: 'ID', defaultSelected: false },
      { key: 'name', label: 'Имя', defaultSelected: true },
      { key: 'email', label: 'Email', defaultSelected: true },
      { key: 'roles', label: 'Роли', defaultSelected: true },
      { key: 'status', label: 'Статус', defaultSelected: true },
      { key: 'createdAt', label: 'Дата регистрации', defaultSelected: true },
      { key: 'organizationMembers', label: 'Членств в школах', defaultSelected: false },
      { key: 'lessonsTotal', label: 'Всего занятий', defaultSelected: false },
    ],
    fetchData: async (_selectedFields) => {
      const result = await exportUsersAction()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data as unknown as Record<string, unknown>[]
    },
  }

  return <ExportButton config={exportConfig} label="Экспорт" size="sm" colorPalette="blue" />
}
