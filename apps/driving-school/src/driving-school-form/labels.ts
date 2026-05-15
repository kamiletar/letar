/**
 * Русские названия для всех ENUM'ов driving-school
 *
 * ⚠️ ГЕНЕРИРУЕТСЯ АВТОМАТИЧЕСКИ из schema.zmodel через @letar/zenstack-form-plugin
 * Не редактируй вручную — изменяй doc-comments в schema.zmodel
 *
 * @example
 * ```zmodel
 * enum TransmissionType {
 *   /// Механика
 *   MANUAL
 *   /// Автомат
 *   AUTOMATIC
 * }
 * ```
 */

// ============================================================================
// ОСНОВНЫЕ ENUM'Ы
// ============================================================================

export { AbsenceTypeLabels as absenceTypeLabels } from '@letar/driving-school-db/form-schemas/enums/AbsenceType.form'
export { ConnectionStatusLabels as connectionStatusLabels } from '@letar/driving-school-db/form-schemas/enums/ConnectionStatus.form'
export { DayOfWeekLabels as dayOfWeekLabels } from '@letar/driving-school-db/form-schemas/enums/DayOfWeek.form'
export { ExamResultLabels as examResultLabels } from '@letar/driving-school-db/form-schemas/enums/ExamResult.form'
export { ExamSessionStatusLabels as examSessionStatusLabels } from '@letar/driving-school-db/form-schemas/enums/ExamSessionStatus.form'
export { ExamTypeLabels as examTypeLabels } from '@letar/driving-school-db/form-schemas/enums/ExamType.form'
export { FileCategoryLabels as fileCategoryLabels } from '@letar/driving-school-db/form-schemas/enums/FileCategory.form'
export { InvitationStatusLabels as invitationStatusLabels } from '@letar/driving-school-db/form-schemas/enums/InvitationStatus.form'
export { LessonStatusLabels as lessonStatusLabels } from '@letar/driving-school-db/form-schemas/enums/LessonStatus.form'
export { LicenseCategoryLabels as licenseCategoryLabels } from '@letar/driving-school-db/form-schemas/enums/LicenseCategory.form'
export { LocationTypeLabels as locationTypeLabels } from '@letar/driving-school-db/form-schemas/enums/LocationType.form'
export { PenaltyStatusLabels as penaltyStatusLabels } from '@letar/driving-school-db/form-schemas/enums/PenaltyStatus.form'
export { PenaltyTypeLabels as penaltyTypeLabels } from '@letar/driving-school-db/form-schemas/enums/PenaltyType.form'
export { SlotStatusLabels as slotStatusLabels } from '@letar/driving-school-db/form-schemas/enums/SlotStatus.form'
export { StudyGroupScheduleLabels as studyGroupScheduleLabels } from '@letar/driving-school-db/form-schemas/enums/StudyGroupSchedule.form'
export { SyncStatusLabels as syncStatusLabels } from '@letar/driving-school-db/form-schemas/enums/SyncStatus.form'
export { TheoryLessonStatusLabels as theoryLessonStatusLabels } from '@letar/driving-school-db/form-schemas/enums/TheoryLessonStatus.form'
export { TransferReasonLabels as transferReasonLabels } from '@letar/driving-school-db/form-schemas/enums/TransferReason.form'
export { TransferStatusLabels as transferStatusLabels } from '@letar/driving-school-db/form-schemas/enums/TransferStatus.form'
export { TransferTypeLabels as transferTypeLabels } from '@letar/driving-school-db/form-schemas/enums/TransferType.form'
export { TransmissionTypeLabels as transmissionTypeLabels } from '@letar/driving-school-db/form-schemas/enums/TransmissionType.form'
export { UserRoleLabels as userRoleLabels } from '@letar/driving-school-db/form-schemas/enums/UserRole.form'

// ============================================================================
// ШКОЛА
// ============================================================================

/**
 * Метки для ролей участников школы (Better Auth строковые роли)
 *
 * Маппинг:
 * - owner → Владелец (было ADMIN)
 * - super_manager → Супер-менеджер
 * - manager → Менеджер
 * - instructor → Инструктор
 * - theory_instructor → Преподаватель теории
 * - member → Ученик (было STUDENT)
 */
export const schoolMemberRoleLabels = {
  owner: 'Владелец',
  super_manager: 'Супер-менеджер',
  manager: 'Менеджер',
  instructor: 'Инструктор',
  theory_instructor: 'Преподаватель теории',
  member: 'Ученик',
} as const

// ============================================================================
// ОТЗЫВЫ И ЖАЛОБЫ
// ============================================================================

export { ChatTypeLabels as chatTypeLabels } from '@letar/driving-school-db/form-schemas/enums/ChatType.form'
export { ReportReasonLabels as reportReasonLabels } from '@letar/driving-school-db/form-schemas/enums/ReportReason.form'
export { ReportStatusLabels as reportStatusLabels } from '@letar/driving-school-db/form-schemas/enums/ReportStatus.form'
export { ReviewStatusLabels as reviewStatusLabels } from '@letar/driving-school-db/form-schemas/enums/ReviewStatus.form'
export { ReviewTargetTypeLabels as reviewTargetTypeLabels } from '@letar/driving-school-db/form-schemas/enums/ReviewTargetType.form'
export { TicketCategoryLabels as ticketCategoryLabels } from '@letar/driving-school-db/form-schemas/enums/TicketCategory.form'
export { TicketStatusLabels as ticketStatusLabels } from '@letar/driving-school-db/form-schemas/enums/TicketStatus.form'

// ============================================================================
// МОНЕТИЗАЦИЯ
// ============================================================================

export { ApiKeyStatusLabels as apiKeyStatusLabels } from '@letar/driving-school-db/form-schemas/enums/ApiKeyStatus.form'
export { LegalDocumentTypeLabels as legalDocumentTypeLabels } from '@letar/driving-school-db/form-schemas/enums/LegalDocumentType.form'
export { PaymentMethodLabels as paymentMethodLabels } from '@letar/driving-school-db/form-schemas/enums/PaymentMethod.form'
export { PaymentStatusLabels as paymentStatusLabels } from '@letar/driving-school-db/form-schemas/enums/PaymentStatus.form'
export { SubscriptionPlanTypeLabels as subscriptionPlanTypeLabels } from '@letar/driving-school-db/form-schemas/enums/SubscriptionPlanType.form'
export { SubscriptionStatusLabels as subscriptionStatusLabels } from '@letar/driving-school-db/form-schemas/enums/SubscriptionStatus.form'

// ============================================================================
// ЗАЯВКИ НА ОБУЧЕНИЕ
// ============================================================================

export { EnrollmentRequestTypeLabels as enrollmentRequestTypeLabels } from '@letar/driving-school-db/form-schemas/enums/EnrollmentRequestType.form'
export { EnrollmentStatusLabels as enrollmentStatusLabels } from '@letar/driving-school-db/form-schemas/enums/EnrollmentStatus.form'
export { LessonCategoryLabels as lessonCategoryLabels } from '@letar/driving-school-db/form-schemas/enums/LessonCategory.form'
export { VehicleOwnerLabels as vehicleOwnerLabels } from '@letar/driving-school-db/form-schemas/enums/VehicleOwner.form'

// ============================================================================
// ПРОГРЕСС УЧЕНИКА (Фаза 6)
// ============================================================================

export { ApprovalStatusLabels as approvalStatusLabels } from '@letar/driving-school-db/form-schemas/enums/ApprovalStatus.form'
export { ChangeStatusLabels as changeStatusLabels } from '@letar/driving-school-db/form-schemas/enums/ChangeStatus.form'
export { DocumentsStatusLabels as documentsStatusLabels } from '@letar/driving-school-db/form-schemas/enums/DocumentsStatus.form'
export { PersonalDataChangeTypeLabels as personalDataChangeTypeLabels } from '@letar/driving-school-db/form-schemas/enums/PersonalDataChangeType.form'
export { PracticeStatusLabels as practiceStatusLabels } from '@letar/driving-school-db/form-schemas/enums/PracticeStatus.form'
export { ProgressStatusLabels as progressStatusLabels } from '@letar/driving-school-db/form-schemas/enums/ProgressStatus.form'
export { TheoryFormatLabels as theoryFormatLabels } from '@letar/driving-school-db/form-schemas/enums/TheoryFormat.form'
export { TheoryStatusLabels as theoryStatusLabels } from '@letar/driving-school-db/form-schemas/enums/TheoryStatus.form'
