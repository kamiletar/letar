/**
 * Централизованный экспорт всех E2E хелперов
 *
 * @example
 * import {
 *   navigateAndWait,
 *   expectSignInRedirect,
 *   Locators,
 *   fillAndSubmit
 * } from '../helpers'
 */

// Page helpers — работа со страницами
export {
  checkEmptyState,
  clickAndWait,
  expectErrorToast,
  expectHeading,
  expectSignInRedirect,
  expectSuccessToast,
  expectToast,
  findFirstVisible,
  findFirstVisibleText,
  gotoAndExpectHeading,
  navigateAndWait,
  safeIsVisible,
  safeIsVisibleWithTimeout,
  skipWithLog,
  waitForAction,
  waitForFormHydration,
  waitForPageLoad,
} from './page.helpers'

// Locators helpers — стабильные локаторы Chakra UI v3
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

// Auth helpers — авторизация
export { isLoggedIn, login, logout, register } from './auth.helpers'

// DB helpers — работа с базой данных
export {
  activateAndPromoteToAdmin,
  activateUser,
  deleteTestUsers,
  disconnectDb,
  ensureTestAdmin,
  ensureTestUser,
  getUser,
  promoteToAdmin,
  resetRateLimit,
  userExists,
} from './db.helpers'

// MailHog helpers — работа с email
export {
  deleteAllMessages,
  deleteMessage,
  extractLinksFromMessage,
  findMessagesByRecipient,
  findMessagesBySubject,
  getLatestMessageForRecipient,
  getMessageBody,
  getMessages,
  isMailhogAvailable,
  waitForMessage,
} from './mailhog.helpers'
export type { MailhogMessage } from './mailhog.helpers'
