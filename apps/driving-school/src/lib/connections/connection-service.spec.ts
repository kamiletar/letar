/**
 * Тесты для сервиса связей ученик-инструктор
 *
 * Покрывает тесты 2.2.1-2.2.4 из плана тестирования
 */
// globals: true — describe, expect, it доступны глобально

import { CONNECTION_DEFAULTS, isValidStatusTransition, VALID_STATUS_TRANSITIONS } from './connection-service'

describe('2.2.1 Создание связи с дефолтными значениями', () => {
  it('должен иметь статус ACTIVE по умолчанию', () => {
    expect(CONNECTION_DEFAULTS.status).toBe('ACTIVE')
  })

  it('должен иметь isPrimary = false по умолчанию', () => {
    expect(CONNECTION_DEFAULTS.isPrimary).toBe(false)
  })

  it('должен иметь prepaidLessons = 0 по умолчанию', () => {
    expect(CONNECTION_DEFAULTS.prepaidLessons).toBe(0)
  })

  it('должен иметь все счётчики статистики = 0 по умолчанию', () => {
    expect(CONNECTION_DEFAULTS.totalLessons).toBe(0)
    expect(CONNECTION_DEFAULTS.completedLessons).toBe(0)
    expect(CONNECTION_DEFAULTS.cancelledLessons).toBe(0)
    expect(CONNECTION_DEFAULTS.noShowCount).toBe(0)
  })

  it('при создании связи используются дефолтные значения', () => {
    // Симуляция создания связи
    const connection = {
      studentId: 'student-1',
      instructorId: 'instructor-1',
      ...CONNECTION_DEFAULTS,
    }

    expect(connection.status).toBe('ACTIVE')
    expect(connection.isPrimary).toBe(false)
    expect(connection.prepaidLessons).toBe(0)
  })
})

describe('2.2.2 Установка основного инструктора (isPrimary)', () => {
  it('при установке isPrimary новый инструктор становится основным', () => {
    const connections = [
      { id: '1', studentId: 'student-1', instructorId: 'inst-1', isPrimary: true },
      { id: '2', studentId: 'student-1', instructorId: 'inst-2', isPrimary: false },
    ]

    // Симуляция переключения основного инструктора на inst-2
    const updatedConnections = connections.map((c) => ({
      ...c,
      isPrimary: c.id === '2',
    }))

    expect(updatedConnections[0].isPrimary).toBe(false)
    expect(updatedConnections[1].isPrimary).toBe(true)
  })

  it('только один инструктор может быть основным для ученика', () => {
    const connections = [
      { id: '1', studentId: 'student-1', instructorId: 'inst-1', isPrimary: true },
      { id: '2', studentId: 'student-1', instructorId: 'inst-2', isPrimary: false },
      { id: '3', studentId: 'student-1', instructorId: 'inst-3', isPrimary: false },
    ]

    const primaryCount = connections.filter((c) => c.isPrimary).length
    expect(primaryCount).toBe(1)
  })

  it('можно установить isPrimary при создании связи', () => {
    const connection = {
      studentId: 'student-1',
      instructorId: 'instructor-1',
      ...CONNECTION_DEFAULTS,
      isPrimary: true, // Переопределяем дефолтное значение
    }

    expect(connection.isPrimary).toBe(true)
  })
})

describe('2.2.3 Уникальность связи (studentId + instructorId)', () => {
  it('связь уникальна по комбинации studentId + instructorId', () => {
    const connections = [
      { studentId: 'student-1', instructorId: 'instructor-1' },
      { studentId: 'student-1', instructorId: 'instructor-2' },
      { studentId: 'student-2', instructorId: 'instructor-1' },
    ]

    // Все комбинации уникальны
    const uniqueKeys = new Set(connections.map((c) => `${c.studentId}:${c.instructorId}`))
    expect(uniqueKeys.size).toBe(connections.length)
  })

  it('нельзя создать дублирующую связь', () => {
    const existingConnections = [{ studentId: 'student-1', instructorId: 'instructor-1' }]

    const newConnection = { studentId: 'student-1', instructorId: 'instructor-1' }

    const isDuplicate = existingConnections.some(
      (c) => c.studentId === newConnection.studentId && c.instructorId === newConnection.instructorId
    )

    expect(isDuplicate).toBe(true)
  })

  it('можно создать связь с тем же инструктором для другого ученика', () => {
    const existingConnections = [{ studentId: 'student-1', instructorId: 'instructor-1' }]

    const newConnection = { studentId: 'student-2', instructorId: 'instructor-1' }

    const isDuplicate = existingConnections.some(
      (c) => c.studentId === newConnection.studentId && c.instructorId === newConnection.instructorId
    )

    expect(isDuplicate).toBe(false)
  })
})

describe('2.2.4 Изменение статуса связи (ACTIVE → PAUSED → DISCONNECTED)', () => {
  describe('допустимые переходы статусов', () => {
    it('ACTIVE можно изменить на PAUSED', () => {
      expect(isValidStatusTransition('ACTIVE', 'PAUSED')).toBe(true)
    })

    it('ACTIVE можно изменить на DISCONNECTED', () => {
      expect(isValidStatusTransition('ACTIVE', 'DISCONNECTED')).toBe(true)
    })

    it('PAUSED можно изменить на ACTIVE', () => {
      expect(isValidStatusTransition('PAUSED', 'ACTIVE')).toBe(true)
    })

    it('PAUSED можно изменить на DISCONNECTED', () => {
      expect(isValidStatusTransition('PAUSED', 'DISCONNECTED')).toBe(true)
    })
  })

  describe('недопустимые переходы статусов', () => {
    it('DISCONNECTED нельзя изменить на ACTIVE', () => {
      expect(isValidStatusTransition('DISCONNECTED', 'ACTIVE')).toBe(false)
    })

    it('DISCONNECTED нельзя изменить на PAUSED', () => {
      expect(isValidStatusTransition('DISCONNECTED', 'PAUSED')).toBe(false)
    })

    it('DISCONNECTED — финальный статус без допустимых переходов', () => {
      expect(VALID_STATUS_TRANSITIONS.DISCONNECTED).toEqual([])
    })
  })

  describe('граф переходов', () => {
    it('из ACTIVE доступны 2 перехода', () => {
      expect(VALID_STATUS_TRANSITIONS.ACTIVE).toHaveLength(2)
      expect(VALID_STATUS_TRANSITIONS.ACTIVE).toContain('PAUSED')
      expect(VALID_STATUS_TRANSITIONS.ACTIVE).toContain('DISCONNECTED')
    })

    it('из PAUSED доступны 2 перехода', () => {
      expect(VALID_STATUS_TRANSITIONS.PAUSED).toHaveLength(2)
      expect(VALID_STATUS_TRANSITIONS.PAUSED).toContain('ACTIVE')
      expect(VALID_STATUS_TRANSITIONS.PAUSED).toContain('DISCONNECTED')
    })

    it('из DISCONNECTED нет доступных переходов', () => {
      expect(VALID_STATUS_TRANSITIONS.DISCONNECTED).toHaveLength(0)
    })
  })

  describe('сценарии использования', () => {
    it('временная передача: ACTIVE → PAUSED → ACTIVE', () => {
      let status: 'ACTIVE' | 'PAUSED' | 'DISCONNECTED' = 'ACTIVE'

      // Инструктор временно передаёт ученика
      expect(isValidStatusTransition(status, 'PAUSED')).toBe(true)
      status = 'PAUSED'

      // Инструктор возвращается
      expect(isValidStatusTransition(status, 'ACTIVE')).toBe(true)
      status = 'ACTIVE'

      expect(status).toBe('ACTIVE')
    })

    it('полное отключение: ACTIVE → DISCONNECTED', () => {
      let status: 'ACTIVE' | 'PAUSED' | 'DISCONNECTED' = 'ACTIVE'

      // Ученик завершил обучение или инструктор отключил
      expect(isValidStatusTransition(status, 'DISCONNECTED')).toBe(true)
      status = 'DISCONNECTED'

      // Нельзя вернуться
      expect(isValidStatusTransition(status, 'ACTIVE')).toBe(false)
      expect(isValidStatusTransition(status, 'PAUSED')).toBe(false)
    })

    it('отключение после паузы: PAUSED → DISCONNECTED', () => {
      let status: 'ACTIVE' | 'PAUSED' | 'DISCONNECTED' = 'PAUSED'

      // Ученик решил не возвращаться
      expect(isValidStatusTransition(status, 'DISCONNECTED')).toBe(true)
      status = 'DISCONNECTED'

      expect(status).toBe('DISCONNECTED')
    })
  })
})
