'use client'

import { Box, Container, Flex, HStack, IconButton, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { FaKeyboard } from 'react-icons/fa6'
import { LuMenu, LuX } from 'react-icons/lu'

/** Секции навигации */
const NAV_SECTIONS = [
  { id: 'features', label: 'Возможности' },
  { id: 'demo', label: 'Демо' },
  { id: 'downloads', label: 'Скачать' },
  { id: 'faq', label: 'FAQ' },
] as const

/**
 * Фиксированная навигационная панель
 * Прозрачная, с backdrop-blur при скролле
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  /* Определяем, проскроллена ли страница (для фона навбара) */
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* IntersectionObserver для подсветки активной секции */
  useEffect(() => {
    const observers: IntersectionObserver[] = []

    for (const section of NAV_SECTIONS) {
      const el = document.getElementById(section.id)
      if (!el) { continue }

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveSection(section.id)
            }
          }
        },
        { rootMargin: '-40% 0px -50% 0px', threshold: 0 },
      )
      observer.observe(el)
      observers.push(observer)
    }

    return () => {
      for (const obs of observers) { obs.disconnect() }
    }
  }, [])

  const handleNavClick = useCallback((id: string) => {
    setMobileOpen(false)
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <Box
      as="nav"
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={100}
      transition="all 0.3s ease"
      bg={scrolled ? 'rgba(10, 10, 15, 0.85)' : 'transparent'}
      backdropFilter={scrolled ? 'blur(16px)' : 'none'}
      borderBottom={scrolled ? '1px solid rgba(57, 255, 20, 0.1)' : '1px solid transparent'}
      aria-label="Главная навигация"
    >
      <Container maxW="7xl" px={{ base: 4, md: 8 }}>
        <Flex h="64px" align="center" justify="space-between">
          {/* Логотип */}
          <HStack gap={2} cursor="pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <FaKeyboard size={20} color="#4dff7a" />
            <Text className="font-mono neon-text" fontSize="lg" fontWeight="700" letterSpacing="tight">
              KamiKeyThe
            </Text>
          </HStack>

          {/* Десктопное меню */}
          <HStack gap={1} display={{ base: 'none', md: 'flex' }}>
            {NAV_SECTIONS.map((section) => (
              <Box
                key={section.id}
                as="button"
                px={3}
                py={1.5}
                borderRadius="md"
                fontSize="sm"
                fontWeight="500"
                className="font-mono"
                color={activeSection === section.id ? 'brand.400' : 'gray.400'}
                bg={activeSection === section.id ? 'rgba(57, 255, 20, 0.08)' : 'transparent'}
                transition="all 0.2s ease"
                _hover={{ color: 'brand.400', bg: 'rgba(57, 255, 20, 0.05)' }}
                onClick={() => handleNavClick(section.id)}
                aria-current={activeSection === section.id ? 'true' : undefined}
              >
                {section.label}
              </Box>
            ))}
          </HStack>

          {/* Мобильный бургер */}
          <IconButton
            display={{ base: 'flex', md: 'none' }}
            aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
            variant="ghost"
            size="sm"
            color="brand.400"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? <LuX /> : <LuMenu />}
          </IconButton>
        </Flex>

        {/* Мобильное меню */}
        {mobileOpen && (
          <Box display={{ base: 'block', md: 'none' }} pb={4} className="glass" borderRadius="lg" mt={1} mb={2}>
            {NAV_SECTIONS.map((section) => (
              <Box
                key={section.id}
                as="button"
                display="block"
                w="100%"
                textAlign="left"
                px={4}
                py={3}
                fontSize="sm"
                fontWeight="500"
                className="font-mono"
                color={activeSection === section.id ? 'brand.400' : 'gray.400'}
                _hover={{ color: 'brand.400', bg: 'rgba(57, 255, 20, 0.05)' }}
                onClick={() => handleNavClick(section.id)}
              >
                {section.label}
              </Box>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  )
}
