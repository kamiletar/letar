'use client'

/**
 * DrivingSchoolForm — расширенный Form компонент для driving-school
 *
 * Включает:
 * - 3 Field компонента (PlateNumber — госномер с маской, VehicleOwner — SegmentedControl, WorkingAreas)
 * - 46 Select компонентов для всех ENUM'ов приложения (LAZY — загружаются при рендере)
 * - 10 Combobox компонентов для асинхронного поиска моделей (LAZY — загружаются при рендере)
 * - 1 Listbox компонент для множественного выбора (LAZY — загружается при рендере)
 *
 * ОПТИМИЗАЦИЯ ПАМЯТИ:
 * Все Select/Combobox/Listbox компоненты загружаются ЛЕНИВО через динамический импорт.
 * Это позволяет снизить потребление памяти при SSR с ~1.7GB до ~500MB.
 *
 * @example
 * ```tsx
 * import { DrivingSchoolForm } from '@/driving-school-form'
 *
 * <DrivingSchoolForm initialValue={data} onSubmit={handleSubmit}>
 *   <DrivingSchoolForm.Field.String name="name" label="Имя" />
 *   <DrivingSchoolForm.Field.PlateNumber name="plateNumber" label="Госномер" />
 *   <DrivingSchoolForm.Field.VehicleOwner name="vehicleOwner" label="Чья машина" />
 *   <DrivingSchoolForm.Select.LicenseCategory name="category" label="Категория" />
 *   <DrivingSchoolForm.Select.LessonCategory name="lessonCategory" label="Тип занятия" />
 *   <DrivingSchoolForm.Select.TransmissionType name="transmission" label="КПП" />
 *   <DrivingSchoolForm.Combobox.Instructor name="instructorId" label="Инструктор" />
 *   <DrivingSchoolForm.Listbox.LicenseCategories name="categories" />
 *   <DrivingSchoolForm.Button.Submit>Сохранить</DrivingSchoolForm.Button.Submit>
 * </DrivingSchoolForm>
 * ```
 */

import { createForm } from '@letar/forms'

// Segmented control компоненты (синхронные — маленькие)
import { SegmentedVehicleOwner } from './segmented'

// Field компоненты со специальной логикой (синхронные — маленькие)
import { FieldPlateNumber, FieldWorkingAreas } from './fields'

export const DrivingSchoolForm = createForm({
  // Синхронные extraFields — маленькие, можно грузить сразу
  extraFields: {
    PlateNumber: FieldPlateNumber,
    VehicleOwner: SegmentedVehicleOwner,
    WorkingAreas: FieldWorkingAreas,
  },

  // ============================================================
  // LAZY SELECTS — загружаются только при рендере компонента
  // ============================================================
  lazySelects: {
    // Справочники
    LicenseCategory: () => import('./selects/select-license-category').then((m) => m.SelectLicenseCategory),
    LessonCategory: () => import('./selects/select-lesson-category').then((m) => m.SelectLessonCategory),
    TransmissionType: () => import('./selects/select-transmission-type').then((m) => m.SelectTransmissionType),
    DayOfWeek: () => import('./selects/select-day-of-week').then((m) => m.SelectDayOfWeek),
    LocationType: () => import('./selects/select-location-type').then((m) => m.SelectLocationType),
    StudyGroupSchedule: () => import('./selects/select-study-group-schedule').then((m) => m.SelectStudyGroupSchedule),

    // Роли
    SchoolMemberRole: () => import('./selects/select-school-member-role').then((m) => m.SelectSchoolMemberRole),
    UserRole: () => import('./selects/select-user-role').then((m) => m.SelectUserRole),

    // Статусы занятий и слотов
    SlotStatus: () => import('./selects/select-slot-status').then((m) => m.SelectSlotStatus),
    LessonStatus: () => import('./selects/select-lesson-status').then((m) => m.SelectLessonStatus),
    TheoryLessonStatus: () => import('./selects/select-theory-lesson-status').then((m) => m.SelectTheoryLessonStatus),

    // Экзамены
    ExamType: () => import('./selects/select-exam-type').then((m) => m.SelectExamType),
    ExamSessionStatus: () => import('./selects/select-exam-session-status').then((m) => m.SelectExamSessionStatus),
    ExamResult: () => import('./selects/select-exam-result').then((m) => m.SelectExamResult),

    // Штрафы и отсутствия
    PenaltyType: () => import('./selects/select-penalty-type').then((m) => m.SelectPenaltyType),
    PenaltyStatus: () => import('./selects/select-penalty-status').then((m) => m.SelectPenaltyStatus),
    AbsenceType: () => import('./selects/select-absence-type').then((m) => m.SelectAbsenceType),

    // Связи и передачи
    ConnectionStatus: () => import('./selects/select-connection-status').then((m) => m.SelectConnectionStatus),
    TransferType: () => import('./selects/select-transfer-type').then((m) => m.SelectTransferType),
    TransferStatus: () => import('./selects/select-transfer-status').then((m) => m.SelectTransferStatus),
    TransferReason: () => import('./selects/select-transfer-reason').then((m) => m.SelectTransferReason),

    // Приглашения и записи
    InvitationStatus: () => import('./selects/select-invitation-status').then((m) => m.SelectInvitationStatus),
    EnrollmentStatus: () => import('./selects/select-enrollment-status').then((m) => m.SelectEnrollmentStatus),

    // Отзывы и жалобы
    ReviewTargetType: () => import('./selects/select-review-target-type').then((m) => m.SelectReviewTargetType),
    ReviewStatus: () => import('./selects/select-review-status').then((m) => m.SelectReviewStatus),
    ReportReason: () => import('./selects/select-report-reason').then((m) => m.SelectReportReason),
    ReportStatus: () => import('./selects/select-report-status').then((m) => m.SelectReportStatus),

    // Поддержка
    TicketCategory: () => import('./selects/select-ticket-category').then((m) => m.SelectTicketCategory),
    TicketStatus: () => import('./selects/select-ticket-status').then((m) => m.SelectTicketStatus),

    // Чаты и файлы
    ChatType: () => import('./selects/select-chat-type').then((m) => m.SelectChatType),
    FileCategory: () => import('./selects/select-file-category').then((m) => m.SelectFileCategory),

    // Подписки и платежи
    SubscriptionPlanType: () =>
      import('./selects/select-subscription-plan-type').then((m) => m.SelectSubscriptionPlanType),
    SubscriptionStatus: () => import('./selects/select-subscription-status').then((m) => m.SelectSubscriptionStatus),
    PaymentStatus: () => import('./selects/select-payment-status').then((m) => m.SelectPaymentStatus),
    PaymentMethod: () => import('./selects/select-payment-method').then((m) => m.SelectPaymentMethod),

    // Юридические документы и API
    LegalDocumentType: () => import('./selects/select-legal-document-type').then((m) => m.SelectLegalDocumentType),
    ApiKeyStatus: () => import('./selects/select-api-key-status').then((m) => m.SelectApiKeyStatus),

    // Синхронизация
    SyncStatus: () => import('./selects/select-sync-status').then((m) => m.SelectSyncStatus),

    // Прогресс ученика
    TheoryFormat: () => import('./selects/select-theory-format').then((m) => m.SelectTheoryFormat),
    DocumentsStatus: () => import('./selects/select-documents-status').then((m) => m.SelectDocumentsStatus),
    TheoryStatus: () => import('./selects/select-theory-status').then((m) => m.SelectTheoryStatus),
    PracticeStatus: () => import('./selects/select-practice-status').then((m) => m.SelectPracticeStatus),
    ApprovalStatus: () => import('./selects/select-approval-status').then((m) => m.SelectApprovalStatus),
    ProgressStatus: () => import('./selects/select-progress-status').then((m) => m.SelectProgressStatus),
    PersonalDataChangeType: () =>
      import('./selects/select-personal-data-change-type').then((m) => m.SelectPersonalDataChangeType),
    ChangeStatus: () => import('./selects/select-change-status').then((m) => m.SelectChangeStatus),
  },

  // ============================================================
  // LAZY COMBOBOXES — загружаются только при рендере компонента
  // ============================================================
  lazyComboboxes: {
    Instructor: () => import('./comboboxes/combobox-instructor').then((m) => m.ComboboxInstructor),
    Student: () => import('./comboboxes/combobox-student').then((m) => m.ComboboxStudent),
    School: () => import('./comboboxes/combobox-school').then((m) => m.ComboboxSchool),
    StudyGroup: () => import('./comboboxes/combobox-study-group').then((m) => m.ComboboxStudyGroup),
    TheoryTopic: () => import('./comboboxes/combobox-theory-topic').then((m) => m.ComboboxTheoryTopic),
    Vehicle: () => import('./comboboxes/combobox-vehicle').then((m) => m.ComboboxVehicle),
    VehicleBrand: () => import('./comboboxes/combobox-vehicle-brand').then((m) => m.ComboboxVehicleBrand),
    VehicleModel: () => import('./comboboxes/combobox-vehicle-model').then((m) => m.ComboboxVehicleModel),
    LessonType: () => import('./comboboxes/combobox-lesson-type').then((m) => m.ComboboxLessonType),
    SchoolLocation: () => import('./comboboxes/combobox-school-location').then((m) => m.ComboboxSchoolLocation),
  },

  // ============================================================
  // LAZY LISTBOXES — загружаются только при рендере компонента
  // ============================================================
  lazyListboxes: {
    LicenseCategories: () => import('./listboxes/listbox-license-categories').then((m) => m.ListboxLicenseCategories),
  },
})
