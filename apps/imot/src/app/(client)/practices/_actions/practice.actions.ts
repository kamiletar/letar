'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Отметить практику как завершенную или вернуть в активные
 */
export async function togglePracticeCompletion(practiceId: string) {
  const session = await getSession()

  if (!session?.user || session.user.role !== 'CLIENT') {
    throw new Error('Unauthorized')
  }

  const db = getEnhancedPrisma(session.user)

  // Получаем текущий статус практики
  const practice = await db.practice.findUnique({
    where: { id: practiceId },
  })

  if (!practice) {
    throw new Error('Practice not found')
  }

  // Переключаем статус
  await db.practice.update({
    where: { id: practiceId },
    data: {
      isCompleted: !practice.isCompleted,
      completedAt: !practice.isCompleted ? new Date() : null,
    },
  })

  revalidatePath('/practices')
}

/**
 * Обновить заметки клиента о практике
 */
export async function updatePracticeNotes(practiceId: string, notes: string) {
  const session = await getSession()

  if (!session?.user || session.user.role !== 'CLIENT') {
    throw new Error('Unauthorized')
  }

  const db = getEnhancedPrisma(session.user)

  await db.practice.update({
    where: { id: practiceId },
    data: {
      clientNotes: notes,
    },
  })

  revalidatePath('/practices')
}
