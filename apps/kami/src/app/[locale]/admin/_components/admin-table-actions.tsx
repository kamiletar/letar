'use client'

import { Button, HStack, Icon } from '@chakra-ui/react'
import { Pencil, Trash } from 'lucide-react'
import Link from 'next/link'

/**
 * Props для AdminTableActions
 */
export interface AdminTableActionsProps {
  /** URL для редактирования */
  editPath?: string
  /** Callback для удаления */
  onDelete?: () => void
  /** Показывать ли кнопку удаления */
  showDelete?: boolean
}

/**
 * Кнопки действий для строки таблицы (Edit, Delete)
 */
export function AdminTableActions({ editPath, onDelete, showDelete = true }: AdminTableActionsProps) {
  return (
    <HStack gap={1} justify="flex-end">
      {editPath && (
        <Button asChild variant="ghost" size="sm">
          <Link href={editPath}>
            <Icon>
              <Pencil />
            </Icon>
          </Link>
        </Button>
      )}
      {showDelete && onDelete && (
        <Button variant="ghost" size="sm" colorPalette="red" onClick={onDelete}>
          <Icon>
            <Trash />
          </Icon>
        </Button>
      )}
    </HStack>
  )
}
