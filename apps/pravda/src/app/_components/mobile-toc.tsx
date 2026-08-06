'use client'

import { Box, CloseButton, Drawer, Flex, IconButton, Link, Portal, Text, VStack } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'
import { LuList } from 'react-icons/lu'

import { scrollbarStyles } from '@/lib/constants'

interface TocItem {
  id: string
  text: string
  level: number
}

/**
 * Мобильный Table of Contents.
 * FAB (Floating Action Button) внизу справа, открывает Drawer снизу.
 * Показывается только на экранах < xl (1280px).
 */
export function MobileTOC() {
  const [headings, setHeadings] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)
  const [open, setOpen] = useState(false)
  const rafIdRef = useRef<number | null>(null)

  // Собираем заголовки и настраиваем observers
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll('h2[id], h3[id], [id^="section-"], [id^="chapter-"]'))

    const items: TocItem[] = elements.map((el) => {
      let text = ''

      if (el.id.startsWith('section-') || el.id.startsWith('chapter-')) {
        const heading = el.querySelector('h2, h3')
        text = heading?.textContent || ''

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

    // IntersectionObserver
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

    // Scroll handler с throttle
    const handleScroll = () => {
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
    handleScroll()

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  // Не показываем FAB если нет заголовков
  if (headings.length === 0) {
    return null
  }

  const handleLinkClick = (id: string) => {
    const target = document.getElementById(id)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' })
      window.history.pushState(null, '', `#${id}`)
      setOpen(false)
    }
  }

  return (
    <>
      {/* FAB — только на экранах < xl */}
      <Box position="fixed" bottom={6} right={6} zIndex="sticky" display={{ base: 'block', xl: 'none' }}>
        <Drawer.Root open={open} onOpenChange={(e) => setOpen(e.open)} placement="bottom">
          <Drawer.Trigger asChild>
            <IconButton
              aria-label="Открыть содержание"
              size="lg"
              borderRadius="full"
              bg="brand.500"
              color="white"
              shadow="lg"
              _hover={{ bg: 'brand.600', transform: 'scale(1.05)' }}
              _active={{ transform: 'scale(0.95)' }}
              transition="all 0.2s ease"
            >
              <LuList />
            </IconButton>
          </Drawer.Trigger>

          <Portal>
            <Drawer.Backdrop />
            <Drawer.Positioner>
              <Drawer.Content roundedTop="2xl" maxH="70vh">
                <Drawer.Header borderBottomWidth="1px">
                  <Flex align="center" justify="space-between" w="full">
                    <Flex align="center" gap={3}>
                      <Drawer.Title fontSize="md" fontWeight="bold">
                        Содержание
                      </Drawer.Title>
                      <Text fontSize="sm" fontWeight="semibold" color="brand.500">
                        {Math.round(progress)}%
                      </Text>
                    </Flex>
                    <Drawer.CloseTrigger asChild>
                      <CloseButton size="sm" />
                    </Drawer.CloseTrigger>
                  </Flex>

                  {/* Прогресс-бар */}
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
                    mt={2}
                  >
                    <Box
                      h="full"
                      bg="brand.500"
                      borderRadius="full"
                      transition="width 0.15s ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </Box>
                </Drawer.Header>

                <Drawer.Body overflowY="auto" css={scrollbarStyles} py={4}>
                  <VStack align="stretch" gap={1}>
                    {headings.map((heading) => {
                      const isActive = activeId === heading.id

                      return (
                        <Link
                          key={heading.id}
                          onClick={() => handleLinkClick(heading.id)}
                          aria-current={isActive ? 'location' : undefined}
                          display="block"
                          py={2}
                          px={3}
                          pl={heading.level === 3 ? 6 : 3}
                          fontSize="sm"
                          color={isActive ? 'brand.600' : 'fg.default'}
                          fontWeight={isActive ? 'semibold' : 'normal'}
                          bg={isActive ? 'brand.50' : 'transparent'}
                          borderRadius="md"
                          borderLeftWidth={isActive ? '3px' : '0'}
                          borderLeftColor="brand.500"
                          transition="all 0.2s ease"
                          cursor="pointer"
                          _hover={{
                            bg: 'bg.subtle',
                            textDecoration: 'none',
                          }}
                          _dark={{
                            color: isActive ? 'brand.400' : 'fg.default',
                            bg: isActive ? 'brand.900' : 'transparent',
                          }}
                        >
                          {heading.text}
                        </Link>
                      )
                    })}
                  </VStack>
                </Drawer.Body>
              </Drawer.Content>
            </Drawer.Positioner>
          </Portal>
        </Drawer.Root>
      </Box>
    </>
  )
}
