import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

// Экспортируем навигационные хуки и компоненты
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
