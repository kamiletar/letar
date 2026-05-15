'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Button } from '@chakra-ui/react'
import { useState } from 'react'
import { LuDownload } from 'react-icons/lu'
import type { PeriodType } from '../_actions/stats.action'
import { exportLessonsToCSV } from '../_actions/stats.action'

interface ExportButtonProps {
  period: PeriodType
}

export function ExportButton({ period }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const result = await exportLessonsToCSV(period)

      if (!result.success) {
        toaster.error({
          title: 'Ошибка экспорта',
          description: result.error,
        })
        return
      }

      // Формируем CSV контент
      const headers = ['Дата', 'Время', 'Ученик', 'Статус', 'Заметки']
      const rows = result.data.map((row) => [row.date, row.time, row.student, row.status, `"${row.notes}"`])

      // Добавляем BOM для корректного отображения кириллицы в Excel
      const BOM = '\uFEFF'
      const csvContent = BOM + [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n')

      // Создаём и скачиваем файл
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toaster.success({
        title: 'Экспорт завершён',
        description: `Экспортировано ${result.data.length} занятий`,
      })
    } catch {
      toaster.error({
        title: 'Ошибка экспорта',
        description: 'Не удалось экспортировать данные',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleExport} loading={isExporting} disabled={isExporting}>
      <LuDownload />
      Экспорт CSV
    </Button>
  )
}
