/**
 * Тесты для уведомлений при передаче учеников
 *
 * Покрывает тесты 7.0.7, 7.0.18, 7.0.22 из плана тестирования
 */
// globals: true — describe, expect, it доступны глобально

import {
  createTransferAcceptedNotification,
  createTransferNotificationForStudent,
  createTransferRejectedNotification,
  createTransferRequestNotification,
  type TransferNotificationData,
} from './transfer-notifications'

// === Тестовые данные ===

const mockTransferData: TransferNotificationData = {
  transferId: 'transfer-1',
  studentName: 'Иван Петров',
  fromInstructorName: 'Пётр Сидоров',
  toInstructorName: 'Анна Иванова',
  type: 'TEMPORARY',
  reason: 'VACATION',
  transferBalance: true,
  prepaidLessons: 5,
}

// === Тесты ===

describe('7.0.7 initiateTransfer — уведомление получателю', () => {
  it('создаёт уведомление для получателя с типом STUDENT_TRANSFER', () => {
    const notification = createTransferRequestNotification('recipient-user-id', mockTransferData)

    expect(notification.type).toBe('STUDENT_TRANSFER')
    expect(notification.userId).toBe('recipient-user-id')
  })

  it('уведомление содержит заголовок о запросе передачи', () => {
    const notification = createTransferRequestNotification('recipient-user-id', mockTransferData)

    expect(notification.title).toContain('Запрос')
    expect(notification.title).toContain('передач')
  })

  it('уведомление содержит имя инициатора', () => {
    const notification = createTransferRequestNotification('recipient-user-id', mockTransferData)

    expect(notification.body).toContain('Пётр Сидоров')
  })

  it('уведомление содержит имя ученика', () => {
    const notification = createTransferRequestNotification('recipient-user-id', mockTransferData)

    expect(notification.body).toContain('Иван Петров')
  })

  it('уведомление содержит тип передачи (временная)', () => {
    const notification = createTransferRequestNotification('recipient-user-id', mockTransferData)

    expect(notification.body).toContain('временную')
  })

  it('уведомление содержит тип передачи (постоянная)', () => {
    const permanentData = { ...mockTransferData, type: 'PERMANENT' as const }
    const notification = createTransferRequestNotification('recipient-user-id', permanentData)

    expect(notification.body).toContain('постоянную')
  })

  it('уведомление содержит причину передачи', () => {
    const notification = createTransferRequestNotification('recipient-user-id', mockTransferData)

    expect(notification.body).toContain('отпуск')
  })

  it('уведомление содержит информацию о балансе если transferBalance = true', () => {
    const notification = createTransferRequestNotification('recipient-user-id', mockTransferData)

    expect(notification.body).toContain('5 занятий')
    expect(notification.body).toContain('перенесён')
  })

  it('уведомление не содержит информацию о балансе если transferBalance = false', () => {
    const noBalanceData = { ...mockTransferData, transferBalance: false }
    const notification = createTransferRequestNotification('recipient-user-id', noBalanceData)

    expect(notification.body).not.toContain('перенесён')
  })

  it('уведомление содержит transferId в data', () => {
    const notification = createTransferRequestNotification('recipient-user-id', mockTransferData)

    expect(notification.data.transferId).toBe('transfer-1')
  })

  it('уведомление содержит все необходимые данные', () => {
    const notification = createTransferRequestNotification('recipient-user-id', mockTransferData)

    expect(notification.data).toEqual(
      expect.objectContaining({
        transferId: 'transfer-1',
        studentName: 'Иван Петров',
        fromInstructorName: 'Пётр Сидоров',
        type: 'TEMPORARY',
        reason: 'VACATION',
      })
    )
  })
})

describe('7.0.18 acceptTransfer — уведомление инициатору', () => {
  it('создаёт уведомление для инициатора с типом STUDENT_TRANSFER', () => {
    const notification = createTransferAcceptedNotification('initiator-user-id', mockTransferData)

    expect(notification.type).toBe('STUDENT_TRANSFER')
    expect(notification.userId).toBe('initiator-user-id')
  })

  it('уведомление содержит заголовок о принятии', () => {
    const notification = createTransferAcceptedNotification('initiator-user-id', mockTransferData)

    expect(notification.title).toContain('принята')
  })

  it('уведомление содержит имя получателя', () => {
    const notification = createTransferAcceptedNotification('initiator-user-id', mockTransferData)

    expect(notification.body).toContain('Анна Иванова')
  })

  it('уведомление содержит имя ученика', () => {
    const notification = createTransferAcceptedNotification('initiator-user-id', mockTransferData)

    expect(notification.body).toContain('Иван Петров')
  })

  it('уведомление информирует что ученик теперь с новым инструктором', () => {
    const notification = createTransferAcceptedNotification('initiator-user-id', mockTransferData)

    expect(notification.body).toContain('новым инструктором')
  })

  it('уведомление содержит флаг accepted в data', () => {
    const notification = createTransferAcceptedNotification('initiator-user-id', mockTransferData)

    expect(notification.data.accepted).toBe(true)
  })

  it('уведомление содержит transferId в data', () => {
    const notification = createTransferAcceptedNotification('initiator-user-id', mockTransferData)

    expect(notification.data.transferId).toBe('transfer-1')
  })
})

describe('7.0.22 rejectTransfer — уведомление инициатору', () => {
  it('создаёт уведомление для инициатора с типом STUDENT_TRANSFER', () => {
    const notification = createTransferRejectedNotification('initiator-user-id', mockTransferData)

    expect(notification.type).toBe('STUDENT_TRANSFER')
    expect(notification.userId).toBe('initiator-user-id')
  })

  it('уведомление содержит заголовок об отклонении', () => {
    const notification = createTransferRejectedNotification('initiator-user-id', mockTransferData)

    expect(notification.title).toContain('отклонена')
  })

  it('уведомление содержит имя получателя', () => {
    const notification = createTransferRejectedNotification('initiator-user-id', mockTransferData)

    expect(notification.body).toContain('Анна Иванова')
  })

  it('уведомление содержит имя ученика', () => {
    const notification = createTransferRejectedNotification('initiator-user-id', mockTransferData)

    expect(notification.body).toContain('Иван Петров')
  })

  it('уведомление информирует что ученик остаётся', () => {
    const notification = createTransferRejectedNotification('initiator-user-id', mockTransferData)

    expect(notification.body).toContain('остаётся')
  })

  it('уведомление содержит флаг rejected в data', () => {
    const notification = createTransferRejectedNotification('initiator-user-id', mockTransferData)

    expect(notification.data.rejected).toBe(true)
  })

  it('уведомление содержит transferId в data', () => {
    const notification = createTransferRejectedNotification('initiator-user-id', mockTransferData)

    expect(notification.data.transferId).toBe('transfer-1')
  })
})

describe('Уведомление ученику при передаче', () => {
  it('создаёт уведомление о принятии передачи', () => {
    const notification = createTransferNotificationForStudent('student-user-id', mockTransferData, true)

    expect(notification.type).toBe('STUDENT_TRANSFER')
    expect(notification.userId).toBe('student-user-id')
    expect(notification.title).toContain('Смена инструктора')
    expect(notification.body).toContain('Анна Иванова')
    expect(notification.data.accepted).toBe(true)
  })

  it('создаёт уведомление об отклонении передачи', () => {
    const notification = createTransferNotificationForStudent('student-user-id', mockTransferData, false)

    expect(notification.type).toBe('STUDENT_TRANSFER')
    expect(notification.title).toContain('отменена')
    expect(notification.body).toContain('отклонена')
    expect(notification.data.rejected).toBe(true)
  })
})
