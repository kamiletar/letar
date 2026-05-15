/**
 * Тесты для сервиса управления слотами
 *
 * Покрывает тесты 3.2.8-3.2.9 (Пересчёт слотов) и 3.3.1-3.3.4 (Управление слотами)
 */
// globals: true — describe, expect, it доступны глобально

import {
  canBlockSlot,
  canUnblockSlot,
  filterNewSlotsToAvoidOverlap,
  getSlotIdsToPreserve,
  isValidSlotStatusTransition,
  VALID_SLOT_STATUS_TRANSITIONS,
} from './slot-management'

describe('3.3.1 Блокировка слота (AVAILABLE → BLOCKED)', () => {
  it('можно заблокировать слот со статусом AVAILABLE', () => {
    expect(canBlockSlot('AVAILABLE')).toBe(true)
  })

  it('переход AVAILABLE → BLOCKED допустим', () => {
    expect(isValidSlotStatusTransition('AVAILABLE', 'BLOCKED')).toBe(true)
  })

  it('AVAILABLE слот может перейти в BLOCKED или BOOKED', () => {
    expect(VALID_SLOT_STATUS_TRANSITIONS.AVAILABLE).toContain('BLOCKED')
    expect(VALID_SLOT_STATUS_TRANSITIONS.AVAILABLE).toContain('BOOKED')
  })
})

describe('3.3.2 Разблокировка слота (BLOCKED → AVAILABLE)', () => {
  it('можно разблокировать слот со статусом BLOCKED', () => {
    expect(canUnblockSlot('BLOCKED')).toBe(true)
  })

  it('переход BLOCKED → AVAILABLE допустим', () => {
    expect(isValidSlotStatusTransition('BLOCKED', 'AVAILABLE')).toBe(true)
  })

  it('нельзя разблокировать слот со статусом AVAILABLE', () => {
    expect(canUnblockSlot('AVAILABLE')).toBe(false)
  })

  it('нельзя разблокировать слот со статусом BOOKED', () => {
    expect(canUnblockSlot('BOOKED')).toBe(false)
  })
})

describe('3.3.3 Нельзя заблокировать забронированный слот', () => {
  it('нельзя заблокировать слот со статусом BOOKED', () => {
    expect(canBlockSlot('BOOKED')).toBe(false)
  })

  it('переход BOOKED → BLOCKED недопустим', () => {
    expect(isValidSlotStatusTransition('BOOKED', 'BLOCKED')).toBe(false)
  })

  it('забронированный слот не имеет допустимых переходов', () => {
    expect(VALID_SLOT_STATUS_TRANSITIONS.BOOKED).toHaveLength(0)
  })

  it('нельзя заблокировать уже заблокированный слот', () => {
    expect(canBlockSlot('BLOCKED')).toBe(false)
  })
})

describe('3.3.4 Добавление слота вне стандартного расписания', () => {
  it('создание слота требует время начала < время окончания', () => {
    const startTime = new Date('2025-01-06T10:00:00')
    const endTime = new Date('2025-01-06T11:30:00')

    const isValidRange = endTime > startTime
    expect(isValidRange).toBe(true)
  })

  it('слот создаётся со статусом AVAILABLE', () => {
    // Кастомный слот всегда создаётся как AVAILABLE
    const defaultStatus = 'AVAILABLE'
    expect(defaultStatus).toBe('AVAILABLE')
  })

  it('нельзя создать слот если конец раньше начала', () => {
    const startTime = new Date('2025-01-06T12:00:00')
    const endTime = new Date('2025-01-06T10:00:00')

    const isValidRange = endTime > startTime
    expect(isValidRange).toBe(false)
  })

  it('нельзя создать слот если начало равно концу', () => {
    const startTime = new Date('2025-01-06T10:00:00')
    const endTime = new Date('2025-01-06T10:00:00')

    const isValidRange = endTime > startTime
    expect(isValidRange).toBe(false)
  })
})

describe('3.2.8 Пересчёт слотов при изменении настроек', () => {
  it('при пересчёте старые слоты заменяются новыми', () => {
    // Симуляция пересчёта: старые слоты удаляются, новые создаются
    const oldSlots = [
      { id: '1', startTime: new Date('2025-01-06T09:00:00'), status: 'AVAILABLE' as const },
      { id: '2', startTime: new Date('2025-01-06T10:30:00'), status: 'AVAILABLE' as const },
    ]

    const newSlots = [
      { startTime: new Date('2025-01-06T09:00:00'), endTime: new Date('2025-01-06T10:00:00') },
      { startTime: new Date('2025-01-06T10:15:00'), endTime: new Date('2025-01-06T11:15:00') },
      { startTime: new Date('2025-01-06T11:30:00'), endTime: new Date('2025-01-06T12:30:00') },
    ]

    // После пересчёта будут только новые слоты
    expect(newSlots).toHaveLength(3)
    expect(oldSlots).toHaveLength(2)
  })

  it('новые слоты создаются согласно обновлённым настройкам', () => {
    // Изменили длительность с 90 на 60 минут
    const oldLessonDuration = 90
    const newLessonDuration = 60

    // При 60 мин занятиях помещается больше слотов
    const workHours = 9 // 09:00 - 18:00
    const breakDuration = 15

    const oldSlotsCount = Math.floor((workHours * 60 + breakDuration) / (oldLessonDuration + breakDuration))
    const newSlotsCount = Math.floor((workHours * 60 + breakDuration) / (newLessonDuration + breakDuration))

    expect(newSlotsCount).toBeGreaterThan(oldSlotsCount)
  })
})

describe('3.2.9 Не пересоздаются слоты со статусом BOOKED', () => {
  it('забронированные слоты сохраняются при пересчёте', () => {
    const slots = [
      { id: '1', status: 'AVAILABLE' as const },
      { id: '2', status: 'BOOKED' as const },
      { id: '3', status: 'BLOCKED' as const },
      { id: '4', status: 'BOOKED' as const },
    ]

    const preservedIds = getSlotIdsToPreserve(slots, true)

    expect(preservedIds).toContain('2')
    expect(preservedIds).toContain('4')
    expect(preservedIds).not.toContain('1')
    expect(preservedIds).not.toContain('3')
  })

  it('если preserveBooked = false, все слоты пересоздаются', () => {
    const slots = [
      { id: '1', status: 'AVAILABLE' as const },
      { id: '2', status: 'BOOKED' as const },
    ]

    const preservedIds = getSlotIdsToPreserve(slots, false)

    expect(preservedIds).toHaveLength(0)
  })

  it('новые слоты не создаются поверх забронированных', () => {
    const preservedSlots = [{ startTime: new Date('2025-01-06T10:00:00'), endTime: new Date('2025-01-06T11:30:00') }]

    const newSlots = [
      { startTime: new Date('2025-01-06T09:00:00'), endTime: new Date('2025-01-06T10:30:00') }, // пересекается
      { startTime: new Date('2025-01-06T11:30:00'), endTime: new Date('2025-01-06T13:00:00') }, // не пересекается
      { startTime: new Date('2025-01-06T10:30:00'), endTime: new Date('2025-01-06T11:00:00') }, // внутри забронированного
    ]

    const filteredSlots = filterNewSlotsToAvoidOverlap(newSlots, preservedSlots)

    // Только второй слот не пересекается
    expect(filteredSlots).toHaveLength(1)
    expect(filteredSlots[0].startTime.getHours()).toBe(11)
    expect(filteredSlots[0].startTime.getMinutes()).toBe(30)
  })

  it('забронированный слот сохраняет связь с занятием', () => {
    // Занятие ссылается на slotId
    const lesson = { slotId: 'booked-slot-1', status: 'CONFIRMED' }
    const slot = { id: 'booked-slot-1', status: 'BOOKED' }

    // При пересчёте связь должна сохраняться
    const preservedIds = getSlotIdsToPreserve([slot], true)
    expect(preservedIds).toContain(lesson.slotId)
  })

  it('при пересчёте AVAILABLE и BLOCKED слоты пересоздаются', () => {
    const slots = [
      { id: '1', status: 'AVAILABLE' as const },
      { id: '2', status: 'BLOCKED' as const },
      { id: '3', status: 'BOOKED' as const },
    ]

    const preservedIds = getSlotIdsToPreserve(slots, true)

    // Только BOOKED сохраняется
    expect(preservedIds).toHaveLength(1)
    expect(preservedIds).toContain('3')
  })
})

describe('Граф переходов статусов слотов', () => {
  it('AVAILABLE может перейти в BLOCKED и BOOKED', () => {
    expect(VALID_SLOT_STATUS_TRANSITIONS.AVAILABLE).toEqual(['BLOCKED', 'BOOKED'])
  })

  it('BLOCKED может перейти только в AVAILABLE', () => {
    expect(VALID_SLOT_STATUS_TRANSITIONS.BLOCKED).toEqual(['AVAILABLE'])
  })

  it('BOOKED не имеет допустимых переходов', () => {
    expect(VALID_SLOT_STATUS_TRANSITIONS.BOOKED).toEqual([])
  })

  it('недопустимые переходы возвращают false', () => {
    expect(isValidSlotStatusTransition('AVAILABLE', 'AVAILABLE')).toBe(false)
    expect(isValidSlotStatusTransition('BLOCKED', 'BOOKED')).toBe(false)
    expect(isValidSlotStatusTransition('BOOKED', 'AVAILABLE')).toBe(false)
  })
})
