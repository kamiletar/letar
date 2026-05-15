/**
 * Централизованный экспорт всех E2E хелперов
 *
 * @example
 * import {
 *   navigateAndWait,
 *   testUnauthenticatedRedirect,
 *   Locators,
 *   fillAndSubmit
 * } from './helpers'
 */

// Page helpers — работа со страницами
export {
  checkEmptyState,
  expectHeading,
  expectSignInRedirect,
  expectToast,
  findFirstVisible,
  findFirstVisibleText,
  gotoAndExpectHeading,
  navigateAndWait,
  safeIsVisible,
  safeIsVisibleWithTimeout,
  skipWithLog,
  waitForFormHydration,
  waitForPageLoad,
} from './page.helpers'

// Auth helpers — авторизация
export {
  UNAUTHENTICATED_STATE,
  createAuthenticatedContext,
  createUnauthenticatedContext,
  expectAuthenticated,
  storagePaths,
  storageStateExists,
  testUnauthenticatedRedirect,
  withAuthenticatedContext,
} from './auth.helpers'
export type { UserRole } from './auth.helpers'

// Locators helpers — стабильные локаторы
export {
  Locators,
  getButton,
  getCardByText,
  getCheckbox,
  getCombobox,
  getLink,
  getMenuItem,
  getRadio,
  getTab,
} from './locators.helpers'

// Form helpers — работа с формами
export {
  addTag,
  addTags,
  clearAndFill,
  clickCheckboxField,
  enterPin,
  expectFormNotSubmitted,
  expectFormSuccess,
  expectValidationError,
  fillAndPressEnter,
  fillAndSubmit,
  fillLoginForm,
  fillRegistrationForm,
  removeTag,
  submitLoginForm,
  submitRegistrationForm,
} from './form.helpers'

// DB helpers — работа с базой данных
export {
  activateUser,
  createTestUser,
  deleteTestUsers,
  disconnectDb,
  ensureExamSession,
  ensureInstructorProfile,
  ensureOwnerRole,
  ensureSchoolAdmin,
  ensureSearchableInstructor,
  ensureStudentProfile,
  getSchoolIdForAdmin,
  getUser,
  userExists,
} from './db.helpers'

// MailHog helpers — работа с email
export {
  clearAllEmails,
  extractVerificationLink,
  getEmailsForRecipient,
  getLatestEmailForRecipient,
  isMailHogAvailable,
  waitForEmail,
} from './mailhog.helpers'
export type { MailHogMessage } from './mailhog.helpers'
