/**
 * Email notification system for IMOT
 * Централизованный экспорт всех email функций
 */

export { sendEmail, verifyEmailConnection } from './email.service'
export type { SendEmailOptions } from './email.service'

export { getNewPracticeTemplate, getPracticeDiaryReminderTemplate, getSessionReminderTemplate } from './email.templates'

export type { NewPracticeData, PracticeDiaryReminderData, SessionReminderData } from './email.templates'

export { sendNewPracticeEmail } from './notifications/new-practice'
export { sendPracticeDiaryReminderEmail } from './notifications/practice-diary-reminder'
export { sendSessionReminderEmail } from './notifications/session-reminder'
