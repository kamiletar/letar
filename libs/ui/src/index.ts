// Оверлеи
export { AdminEditOverlay, type AdminEditOverlayProps } from './lib/admin-edit-overlay'
export {
  ConfirmDialog,
  type ConfirmDialogProps,
  type ConfirmDialogVariant,
  DeleteConfirmDialog,
  StopConfirmDialog,
  TriggerConfirmDialog,
  type TriggerConfirmDialogProps,
  useConfirmDialog,
} from './lib/confirm-dialog'
export { type LightboxSlide, LightboxViewer, type LightboxViewerProps } from './lib/lightbox-viewer'

// Навигация
export {
  Header,
  HeaderActions,
  type HeaderActionsProps,
  HeaderLogo,
  type HeaderLogoProps,
  HeaderMobileActions,
  HeaderMobileMenu,
  type HeaderMobileMenuProps,
  HeaderMobileProvider,
  HeaderNav,
  type HeaderNavProps,
  type HeaderProps,
  HeaderRoot,
  type HeaderRootProps,
  type NavItem,
  useHeaderMobile,
} from './lib/header'
export { MobileAuthSection, type MobileAuthSectionProps } from './lib/mobile-auth-section'
export { UserMenu, type UserMenuItemConfig, type UserMenuProps, type UserMenuSession } from './lib/user-menu'

// Медиа
export { CoverImage, type CoverImageProps } from './lib/cover-image'
export { ImageMagnifier, type ImageMagnifierProps, type MagnifierPoint } from './lib/image-magnifier'
export { OptimizedAvatar } from './lib/optimized-avatar'
export { PhotoGallery, type PhotoItem } from './lib/photo-gallery'

// Согласия и аналитика
export { AnalyticsGate, type AnalyticsGateProps } from './lib/analytics-gate'
export { type ConsentConfig, type CookieConsentState, createConsentConfig, readConsentState } from './lib/consent-types'
export { CookieBanner, type CookieBannerProps } from './lib/cookie-banner'
export { CookieSettingsButton, type CookieSettingsButtonProps } from './lib/cookie-settings-button'
export { useAnalyticsConsent } from './lib/use-analytics-consent'

// Формы
export { FileTrigger, type FileTriggerProps } from './lib/file-trigger'
export {
  PasswordInput,
  type PasswordInputProps,
  PasswordStrengthMeter,
  type PasswordVisibilityProps,
} from './lib/password-input'
export { QuantityStepper, type QuantityStepperProps } from './lib/quantity-stepper'

// Отзывы и рейтинги
export { RatingDisplay, type RatingDisplayProps } from './lib/rating-display'
export { RatingStars, type RatingStarsProps } from './lib/rating-stars'
export { type ReviewAuthor, ReviewCard, type ReviewCardProps, type ReviewData } from './lib/review-card'
export { RoleStat, type RoleStatProps, StatCard, type StatCardProps } from './lib/stat-card'

// Интерактивность и обратная связь
export { AppEmptyState, type AppEmptyStateProps } from './lib/empty-state'
export { FaqAccordion, type FaqAccordionProps, type FaqItem } from './lib/faq-accordion'
export { Pressable, pressableConfig, type PressableProps, RippleEl, useRipple } from './lib/pressable'
export { PressableButton, type PressableButtonProps } from './lib/pressable-button'
export { StatusBadge, type StatusConfig } from './lib/status-badge'
export { StickyActionBar, type StickyActionBarProps } from './lib/sticky-action-bar'
export { Tooltip, type TooltipProps } from './lib/tooltip'

// Служебное
export { BuildVersion, type BuildVersionProps } from './lib/build-version'
export { DeleteAccountZone, type DeleteAccountZoneProps } from './lib/delete-account-zone'
export { ExternalLink, type ExternalLinkProps } from './lib/external-link'
export { StudioCredit, type StudioCreditProps } from './lib/studio-credit'
export { TopLoader, type TopLoaderProps } from './lib/top-loader'
export { useScrollGate, type UseScrollGateOptions, type UseScrollGateResult } from './lib/use-scroll-gate'
export { useServiceWorker, type UseServiceWorkerOptions } from './lib/use-service-worker'
