/**
 * Calendar Module — синхронизация с внешними календарями
 *
 * Экспортирует:
 * - ICalGenerator — генерация iCalendar файлов
 * - Calendar Feed Service — управление iCal feeds
 * - Google Calendar Service — двусторонняя синхронизация с Google Calendar
 */

export {
  deleteCalendarFeed,
  generateUserCalendarFeed,
  getCalendarFeedByToken,
  getOrCreateCalendarFeed,
  regenerateFeedToken,
  updateFeedAccessStats,
  type CalendarFeedOptions,
} from './calendar-feed-service'
export {
  googleCalendarService,
  syncLessonToGoogle,
  type GoogleCalendarEvent,
  type GoogleCalendarListEntry,
  type TokenInfo,
} from './google-calendar-service'
export { ICalGenerator, type CalendarEventType, type ICalEvent, type ICalGeneratorOptions } from './ical-generator'
