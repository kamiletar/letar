/**
 * Синхронизация чатов при передаче учеников
 *
 * Выделен из transfer.action.ts для переиспользуемости
 * Управляет добавлением/удалением учеников из чатов инструкторов
 */

import {
  addStudentToInstructorChatAction,
  removeStudentFromInstructorChatAction,
} from '@/app/(chats)/chats/_actions/chat.action'

/**
 * Обновляет чаты при принятии передачи (перемещение ученика)
 * Удаляет из чата старого инструктора, добавляет в чат нового
 */
export async function syncChatsOnTransferAccepted(params: {
  studentUserId: string
  fromInstructorUserId: string
  toInstructorUserId: string
}): Promise<void> {
  // Удаляем ученика из чата старого инструктора
  await removeStudentFromInstructorChatAction(params.fromInstructorUserId, params.studentUserId)

  // Добавляем ученика в чат нового инструктора
  await addStudentToInstructorChatAction(params.toInstructorUserId, params.studentUserId)
}

/**
 * Обновляет чаты при возврате ученика (временная передача)
 * Удаляет из чата временного инструктора, возвращает в чат исходного
 */
export async function syncChatsOnStudentReclaimed(params: {
  studentUserId: string
  originalInstructorUserId: string
  temporaryInstructorUserId: string
}): Promise<void> {
  // Удаляем ученика из чата временного инструктора
  await removeStudentFromInstructorChatAction(params.temporaryInstructorUserId, params.studentUserId)

  // Возвращаем ученика в чат исходного инструктора
  await addStudentToInstructorChatAction(params.originalInstructorUserId, params.studentUserId)
}
