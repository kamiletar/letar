/**
 * Сервис для управления слотами
 */
import type { PrismaClient, SlotStatus } from '@letar/driving-school-db/prisma'

// === Типы ===

export interface BlockSlotInput {
  slotId: string
}

export interface UnblockSlotInput {
  slotId: string
}

export interface CreateCustomSlotInput {
  instructorId: string
  startTime: Date
  endTime: Date
}

export interface RegenerateSlotsInput {
  instructorId: string
  fromDate: Date
  preserveBooked: boolean
}

// === Допустимые переходы статусов слотов ===

export const VALID_SLOT_STATUS_TRANSITIONS: Record<SlotStatus, SlotStatus[]> = {
  AVAILABLE: ['BLOCKED', 'BOOKED'],
  BLOCKED: ['AVAILABLE'],
  BOOKED: [], // Забронированный слот нельзя менять напрямую
}

/**
 * Проверяет, допустим ли переход между статусами слота
 */
export function isValidSlotStatusTransition(from: SlotStatus, to: SlotStatus): boolean {
  return VALID_SLOT_STATUS_TRANSITIONS[from].includes(to)
}

/**
 * Проверяет, можно ли заблокировать слот
 */
export function canBlockSlot(status: SlotStatus): boolean {
  return status === 'AVAILABLE'
}

/**
 * Проверяет, можно ли разблокировать слот
 */
export function canUnblockSlot(status: SlotStatus): boolean {
  return status === 'BLOCKED'
}

// === Сервисные функции ===

/**
 * Блокирует слот (AVAILABLE → BLOCKED)
 */
export async function blockSlot(prisma: PrismaClient, input: BlockSlotInput) {
  const { slotId } = input

  const slot = await prisma.timeSlot.findUnique({
    where: { id: slotId },
  })

  if (!slot) {
    throw new Error('SLOT_NOT_FOUND')
  }

  if (!canBlockSlot(slot.status)) {
    throw new Error(`CANNOT_BLOCK_${slot.status}_SLOT`)
  }

  return prisma.timeSlot.update({
    where: { id: slotId },
    data: { status: 'BLOCKED' },
  })
}

/**
 * Разблокирует слот (BLOCKED → AVAILABLE)
 */
export async function unblockSlot(prisma: PrismaClient, input: UnblockSlotInput) {
  const { slotId } = input

  const slot = await prisma.timeSlot.findUnique({
    where: { id: slotId },
  })

  if (!slot) {
    throw new Error('SLOT_NOT_FOUND')
  }

  if (!canUnblockSlot(slot.status)) {
    throw new Error(`CANNOT_UNBLOCK_${slot.status}_SLOT`)
  }

  return prisma.timeSlot.update({
    where: { id: slotId },
    data: { status: 'AVAILABLE' },
  })
}

/**
 * Создаёт внеочередной слот (вне стандартного расписания)
 */
export async function createCustomSlot(prisma: PrismaClient, input: CreateCustomSlotInput) {
  const { instructorId, startTime, endTime } = input

  // Проверяем, что время окончания позже начала
  if (endTime <= startTime) {
    throw new Error('INVALID_TIME_RANGE')
  }

  // Проверяем, нет ли пересечения с существующими слотами
  const overlappingSlot = await prisma.timeSlot.findFirst({
    where: {
      instructorId,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  })

  if (overlappingSlot) {
    throw new Error('SLOT_OVERLAPS_WITH_EXISTING')
  }

  return prisma.timeSlot.create({
    data: {
      instructorId,
      startTime,
      endTime,
      status: 'AVAILABLE',
    },
  })
}

/**
 * Определяет, какие слоты нужно сохранить при пересчёте (забронированные)
 */
export function getSlotIdsToPreserve(
  slots: Array<{ id: string; status: SlotStatus }>,
  preserveBooked: boolean
): string[] {
  if (!preserveBooked) {
    return []
  }

  return slots.filter((slot) => slot.status === 'BOOKED').map((slot) => slot.id)
}

/**
 * Фильтрует новые слоты, исключая пересечения с сохраняемыми
 */
export function filterNewSlotsToAvoidOverlap<T extends { startTime: Date; endTime: Date }>(
  newSlots: T[],
  preservedSlots: Array<{ startTime: Date; endTime: Date }>
): T[] {
  return newSlots.filter((newSlot) => {
    return !preservedSlots.some(
      (preserved) => newSlot.startTime < preserved.endTime && newSlot.endTime > preserved.startTime
    )
  })
}
