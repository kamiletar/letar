export {
  generateSlotsForDay,
  generateSlotsForPeriod,
  getDayOfWeek,
  intervalsOverlap,
  timeToMinutes,
  type CustomBreakInput,
  type GenerateSlotsInput,
  type GeneratedSlot,
} from './generate-slots'

export {
  VALID_SLOT_STATUS_TRANSITIONS,
  blockSlot,
  canBlockSlot,
  canUnblockSlot,
  createCustomSlot,
  filterNewSlotsToAvoidOverlap,
  getSlotIdsToPreserve,
  isValidSlotStatusTransition,
  unblockSlot,
  type BlockSlotInput,
  type CreateCustomSlotInput,
  type RegenerateSlotsInput,
  type UnblockSlotInput,
} from './slot-management'

export {
  ACTIVE_LESSON_STATUSES,
  createNotificationsForAffectedLessons,
  detectAffectedLessons,
  filterAffectedLessons,
  isActiveLessonStatus,
  isLessonAffected,
  markLessonsAsNeedingReschedule,
  type AffectedLesson,
  type DetectConflictsInput,
  type HandleConflictsInput,
} from './schedule-conflicts'
