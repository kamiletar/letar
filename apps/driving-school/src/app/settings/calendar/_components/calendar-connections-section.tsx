'use client'

/**
 * Calendar Connections Section
 *
 * Клиентский wrapper для подключённых календарей с управлением диалогом.
 */

import { useState } from 'react'

import type { CalendarConnection } from '@letar/driving-school-db/prisma'
import { AddCalendarDialog } from './add-calendar-dialog'
import { ConnectedCalendarsList } from './connected-calendars-list'

// === Типы ===

type ConnectionData = Pick<
  CalendarConnection,
  'id' | 'provider' | 'calendarName' | 'syncDirection' | 'syncStatus' | 'lastSyncAt' | 'lastSyncError' | 'createdAt'
>

interface CalendarConnectionsSectionProps {
  initialConnections: ConnectionData[]
}

// === Component ===

export function CalendarConnectionsSection({ initialConnections }: CalendarConnectionsSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <ConnectedCalendarsList connections={initialConnections} onAddClick={() => setIsDialogOpen(true)} />

      <AddCalendarDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
    </>
  )
}
