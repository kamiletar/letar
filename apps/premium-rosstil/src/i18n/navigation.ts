import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

// Навигационные хелперы с поддержкой i18n
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
