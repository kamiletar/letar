'use client'

import { Box, Flex, Link, Text, VStack } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { HEADER_HEIGHT, scrollbarStyles } from '@/lib/constants'

interface TocItem {
  id: string
  text: string
  level: number
}

/**
 * Table of Contents - автоматически строится из h2/h3 на странице.
 * Sticky справа на десктопе, скрыт на мобильных.
 * Включает индикатор прогресса чтения и плавные переходы.
 */
export function TableOfContents() {
  const pathname = usePathname()
  const [headings, setHeadings] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)
  const rafIdRef = useRef<number | null>(null)
  const tocRef = useRef<HTMLElement>(null)

  // Автоскролл к активному пункту в TOC
  useEffect(() => {
    if (!activeId || !tocRef.current) {
      return
    }

    const activeLink = tocRef.current.querySelector(`[data-toc-id="${activeId}"]`)
    if (activeLink) {
      activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeId])

  // Объединённый эффект: заголовки, IntersectionObserver, scroll handler
  // pathname в зависимостях — перезапуск при клиентской навигации
  useEffect(() => {
    // Сбрасываем состояние при смене страницы
    setActiveId('')
    setProgress(0)

    // 1. Собираем заголовки (один проход по DOM)
    const elements = Array.from(document.querySelectorAll('h2[id], h3[id], [id^="section-"], [id^="chapter-"]'))

    const items: TocItem[] = elements.map((el) => {
      let text = ''

      // Для Section/Chapter ищем заголовок внутри
      if (el.id.startsWith('section-') || el.id.startsWith('chapter-')) {
        const heading = el.querySelector('h2, h3')
        text = heading?.textContent || ''

        // Для Chapter добавляем "Глава X" из Badge
        if (el.id.startsWith('chapter-')) {
          const badge = el.querySelector('[class*="badge"]')
          const badgeText = badge?.textContent || ''
          text = badgeText ? `${badgeText}. ${text}` : text
        }
      } else {
        text = el.textContent || ''
      }

      return {
        id: el.id,
        text,
        level: el.tagName === 'H2' || el.id.startsWith('section-') ? 2 : 3,
      }
    })

    setHeadings(items)

    // 2. IntersectionObserver (используем elements напрямую)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -80% 0px' },
    )

    for (const el of elements) {
      observer.observe(el)
    }

    // 3. Scroll handler с throttle через requestAnimationFrame
    const handleScroll = () => {
      // Пропускаем если уже запланировано обновление
      if (rafIdRef.current !== null) {
        return
      }

      rafIdRef.current = requestAnimationFrame(() => {
        const scrollTop = window.scrollY
        const docHeight = document.documentElement.scrollHeight - window.innerHeight
        const scrollProgress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
        setProgress(Math.min(100, Math.max(0, scrollProgress)))
        rafIdRef.current = null
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Инициализируем значение

    // Общий cleanup
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [pathname])

  if (headings.length === 0) {
    return null
  }

  return (
    <Box
      ref={tocRef}
      as="nav"
      aria-label="Содержание документа"
      w="220px"
      h={`calc(100vh - ${HEADER_HEIGHT})`}
      position="sticky"
      top={HEADER_HEIGHT}
      overflowY="auto"
      py={4}
      px={3}
      borderLeftWidth="1px"
      borderLeftColor="border"
      display={{ base: 'none', xl: 'block' }}
      css={scrollbarStyles}
    >
      {/* Заголовок с индикатором прогресса */}
      <Box mb={4}>
        <Flex align="center" justify="space-between" mb={2}>
          <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wide" color="fg.muted">
            Содержание
          </Text>
          {/* Процент прочитанного */}
          <Text fontSize="xs" fontWeight="semibold" color="brand.500">
            {Math.round(progress)}%
          </Text>
        </Flex>

        {/* Прогресс-бар чтения */}
        <Box
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Прогресс чтения"
          h="2px"
          bg="bg.subtle"
          borderRadius="full"
          overflow="hidden"
        >
          <Box
            h="full"
            bg="brand.500"
            borderRadius="full"
            transition="width 0.15s ease-out"
            style={{ width: `${progress}%` }}
          />
        </Box>
      </Box>

      {/* Список заголовков с вертикальной линией-индикатором */}
      <Box position="relative">
        {/* Вертикальная линия */}
        <Box position="absolute" left="0" top="0" bottom="0" w="2px" bg="border" borderRadius="full" />

        <VStack align="stretch" gap={0.5} pl={3}>
          {headings.map((heading) => {
            const isActive = activeId === heading.id

            return (
              <Box key={heading.id} position="relative">
                {/* Индикатор активного элемента с glow эффектом */}
                <Box
                  position="absolute"
                  left="-12px"
                  top="50%"
                  transform="translateY(-50%)"
                  w="2px"
                  h={isActive ? '16px' : '0px'}
                  bg="brand.500"
                  borderRadius="full"
                  transition="all 0.2s ease"
                  boxShadow={isActive ? '0 0 8px var(--chakra-colors-brand-500)' : 'none'}
                />

                <Link
                  href={`#${heading.id}`}
                  data-toc-id={heading.id}
                  aria-current={isActive ? 'location' : undefined}
                  display="block"
                  py={1.5}
                  px={2}
                  pl={heading.level === 3 ? 4 : 2}
                  fontSize="xs"
                  color={isActive ? 'brand.600' : 'fg.muted'}
                  fontWeight={isActive ? 'semibold' : 'normal'}
                  borderRadius="sm"
                  transition="all 0.2s ease"
                  _hover={{
                    color: 'brand.600',
                    textDecoration: 'none',
                    bg: 'bg.subtle',
                  }}
                  _focus={{
                    outline: 'none',
                    boxShadow: 'outline',
                  }}
                  _dark={{ color: isActive ? 'brand.400' : 'fg.muted' }}
                  onClick={(e) => {
                    e.preventDefault()
                    const target = document.getElementById(heading.id)
                    if (target) {
                      target.scrollIntoView({ behavior: 'smooth' })
                      // Обновляем URL без перезагрузки
                      window.history.pushState(null, '', `#${heading.id}`)
                    }
                  }}
                >
                  {heading.text}
                </Link>
              </Box>
            )
          })}
        </VStack>
      </Box>
    </Box>
  )
}
