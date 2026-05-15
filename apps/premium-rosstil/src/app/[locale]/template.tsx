'use client'

import type { Variants } from 'framer-motion'
import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

/**
 * Template для анимации входа страниц.
 *
 * ⚠️ Важно: в Next.js App Router `template.tsx` сам полностью перемонтируется
 * на каждой навигации. Поэтому AnimatePresence/mode="wait" здесь НЕ работают
 * (нет старого ребёнка, чей exit нужно ждать) и БЛОКИРУЮТ навигацию —
 * страница «не открывается», пока не откроешь её в новой вкладке.
 *
 * Здесь только enter-анимация через `initial → animate`. Exit обрабатывается
 * самим демонтированием template.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Тип анимации в зависимости от маршрута
  const variants = useMemo<Variants>(() => {
    // Админ-панель — минимальный fade
    if (pathname.startsWith('/admin')) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
      }
    }

    // Каталог — slide
    if (pathname.startsWith('/catalog')) {
      return {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
      }
    }

    // Остальные страницы — fade + сдвиг по Y
    return {
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
    }
  }, [pathname])

  // Длительность анимации
  const duration = useMemo(() => {
    if (pathname.startsWith('/admin')) {
      return 0.15
    }
    if (pathname.startsWith('/catalog')) {
      return 0.25
    }
    return 0.2
  }, [pathname])

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={variants}
      transition={{
        duration,
        ease: 'easeInOut',
      }}
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      {children}
    </motion.div>
  )
}
