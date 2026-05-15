/**
 * Централизованный экспорт всех переиспользуемых компонентов ИМОТ
 *
 * Используйте этот файл для импорта компонентов:
 *
 * @example
 * import { ProfileCard, ProgressCircle, SessionCard } from '@/app/_components';
 */

// Основные UI компоненты
export { ProfileCard } from './profile-card'
export type { ProfileCardProps } from './profile-card'

export { ProgressCircle } from './progress-circle'
export type { ProgressCircleProps } from './progress-circle'

export { SessionCard } from './session-card'
export type { SessionCardProps } from './session-card'

export { TransformationTimeline } from './transformation-timeline'
export type { TimelineEvent, TransformationTimelineProps } from './transformation-timeline'

// Специализированные компоненты визуализации
export { ChakraWheel } from './chakra-wheel'
export type { ChakraData, ChakraType, ChakraWheelProps } from './chakra-wheel'

export { BodyMap } from './body-map'
export type { BodyMapProps, BodyZone } from './body-map'

export { LevelIcon } from './level-icon'
export { LevelVisualization } from './level-visualization'

export { MetricCard } from './metric-card'
export type { MetricCardProps } from './metric-card'

// Компоненты интеграции
export { IntegrationGraph } from './integration-graph'
export { IntegrationHighlights } from './integration-highlights'
export { IntegrationReport } from './integration-report'

// Существующие компоненты
export { AuthButton } from './auth-button'
export { AvatarUpload } from './avatar-upload'
export { ImotLogo } from './imot-logo'
export { ProfileEditForm } from './profile-edit-form'
export { RoleCard } from './role-card'
export { ThemeProvider } from './theme-provider'
export { UserAvatar } from './user-avatar'

// UI компоненты
export { Toaster } from './ui/toaster'
