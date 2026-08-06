/**
 * App — корневой компонент mobile-ui
 *
 * Функции:
 * - Роутинг между страницами
 * - Page transitions с CSS анимациями
 * - Offline indicator при потере связи с desktop
 * - prefers-reduced-motion поддержка
 */

import { Box } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'

import { OfflineIndicator } from './components/OfflineIndicator'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import { AnimePage } from './pages/Anime'
import { LibraryPage } from './pages/Library'
import { PlayerPage } from './pages/Player'

/** Хук для определения prefers-reduced-motion */
function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

export function App() {
  const location = useLocation()
  const networkStatus = useNetworkStatus()
  const prefersReducedMotion = useReducedMotion()
  const [isNavigating, setIsNavigating] = useState(false)
  const [displayLocation, setDisplayLocation] = useState(location)

  // Определяем направление перехода на основе пути
  const getTransitionDirection = useCallback((from: string, to: string): 'forward' | 'back' => {
    const paths = ['/', '/anime', '/player']
    const fromIndex = paths.findIndex((p) => from.startsWith(p) || from === p)
    const toIndex = paths.findIndex((p) => to.startsWith(p) || to === p)

    // Особый случай: корень
    if (from === '/') {
      return 'forward'
    }
    if (to === '/') {
      return 'back'
    }

    return toIndex >= fromIndex ? 'forward' : 'back'
  }, [])

  // Page transition effect
  useEffect(() => {
    if (prefersReducedMotion) {
      // Без анимации
      setDisplayLocation(location)
      return
    }

    if (location.key !== displayLocation.key) {
      setIsNavigating(true)

      // Задержка для анимации выхода
      const timer = setTimeout(() => {
        setDisplayLocation(location)
        setIsNavigating(false)
      }, 150)

      return () => clearTimeout(timer)
    }
  }, [location, displayLocation, prefersReducedMotion])

  const direction = getTransitionDirection(displayLocation.pathname, location.pathname)

  // Retry handler для offline indicator
  const handleRetry = useCallback(() => {
    window.location.reload()
  }, [])

  // CSS для page transitions
  const pageTransitionStyles = prefersReducedMotion
    ? {}
    : {
      transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
      opacity: isNavigating ? 0 : 1,
      transform: isNavigating
        ? direction === 'forward'
          ? 'translateX(-20px)'
          : 'translateX(20px)'
        : 'translateX(0)',
    }

  return (
    <Box minH="100vh" bg="gray.950" color="white">
      {/* Offline indicator */}
      <OfflineIndicator status={networkStatus} onRetry={handleRetry} />

      {/* Контент с учётом offline banner */}
      <Box
        pt={!networkStatus.isOnline || !networkStatus.isDesktopConnected ? 'calc(env(safe-area-inset-top) + 60px)' : 0}
        transition={prefersReducedMotion ? undefined : 'padding 0.3s ease-out'}
      >
        {/* Page transition wrapper */}
        <Box style={pageTransitionStyles}>
          <Routes location={displayLocation}>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/anime/:animeId" element={<AnimePage />} />
            <Route path="/player/:episodeId" element={<PlayerPage />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  )
}
