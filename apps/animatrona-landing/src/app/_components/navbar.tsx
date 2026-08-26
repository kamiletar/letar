'use client'

import {
  Box,
  CloseButton,
  Container,
  Drawer,
  Flex,
  HStack,
  IconButton,
  Link,
  Portal,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuMenu } from 'react-icons/lu'

interface NavItem {
  label: string
  href: string
  /** Если true — ссылка ведёт на отдельную страницу, а не на секцию */
  isPage?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Возможности', href: '#features' },
  { label: 'Скачать', href: '#downloads' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Документация', href: '/docs', isPage: true },
  { label: 'Изменения', href: '#changelog' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Отслеживание скролла
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Intersection Observer для определения активной секции
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(`#${entry.target.id}`)
          }
        })
      },
      {
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0,
      },
    )

    // Наблюдаем за всеми секциями (только якорные ссылки)
    NAV_ITEMS.filter((item) => !item.isPage).forEach((item) => {
      const element = document.querySelector(item.href)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [])

  // Плавный скролл к секции
  const scrollToSection = (href: string) => {
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setDrawerOpen(false)
    }
  }

  return (
    <Box
      as="nav"
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={100}
      bg={scrolled ? 'rgba(17, 17, 27, 0.9)' : 'transparent'}
      backdropFilter={scrolled ? 'blur(12px)' : 'none'}
      borderBottom={scrolled ? '1px solid' : 'none'}
      borderColor="gray.800"
      transitionProperty="background-color, backdrop-filter, border-bottom-width"
      transitionDuration="0.3s"
      transitionTimingFunction="ease"
    >
      <Container maxW="container.xl" py={4}>
        <Flex justify="space-between" align="center">
          {/* Логотип */}
          <Link href="/" _hover={{ textDecoration: 'none' }}>
            <HStack gap={2}>
              <Text fontSize="xl" fontWeight="bold" className="gradient-text">
                Animatrona
              </Text>
            </HStack>
          </Link>

          {/* Навигация Desktop */}
          <HStack gap={6} display={{ base: 'none', md: 'flex' }}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={item.isPage
                  ? undefined
                  : (e) => {
                    e.preventDefault()
                    scrollToSection(item.href)
                  }}
                color={activeSection === item.href ? 'white' : 'gray.400'}
                fontSize="sm"
                fontWeight="medium"
                transition="color 0.2s"
                position="relative"
                _hover={{ color: 'white', textDecoration: 'none' }}
                _after={activeSection === item.href
                  ? {
                    content: '""',
                    position: 'absolute',
                    bottom: '-8px',
                    left: 0,
                    right: 0,
                    height: '2px',
                    bg: 'brand.500',
                    borderRadius: 'full',
                    transition: 'all 0.2s ease',
                  }
                  : undefined}
              >
                {item.label}
              </Link>
            ))}
          </HStack>

          {/* GitHub + Mobile Menu Button */}
          <HStack gap={2}>
            <Link
              href="https://github.com/kamiletar/letar/tree/main/apps/animatrona"
              target="_blank"
              rel="noopener noreferrer"
              color="gray.400"
              fontSize="sm"
              _hover={{ color: 'white' }}
              display={{ base: 'none', md: 'block' }}
            >
              GitHub
            </Link>

            {/* Mobile Menu Button */}
            <Drawer.Root open={drawerOpen} onOpenChange={(e) => setDrawerOpen(e.open)} placement="end">
              <Drawer.Trigger asChild>
                <IconButton
                  aria-label="Открыть меню"
                  variant="ghost"
                  color="gray.400"
                  display={{ base: 'flex', md: 'none' }}
                  _hover={{ color: 'white', bg: 'gray.800' }}
                >
                  <LuMenu size={20} />
                </IconButton>
              </Drawer.Trigger>

              <Portal>
                <Drawer.Backdrop bg="blackAlpha.700" />
                <Drawer.Positioner>
                  <Drawer.Content bg="gray.900" borderLeft="1px solid" borderColor="gray.800">
                    <Drawer.Header borderBottom="1px solid" borderColor="gray.800">
                      <Drawer.Title>
                        <Text className="gradient-text" fontWeight="bold">
                          Animatrona
                        </Text>
                      </Drawer.Title>
                      <Drawer.CloseTrigger asChild>
                        <CloseButton size="sm" />
                      </Drawer.CloseTrigger>
                    </Drawer.Header>

                    <Drawer.Body py={6}>
                      <VStack align="stretch" gap={2}>
                        {NAV_ITEMS.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={item.isPage
                              ? () => setDrawerOpen(false)
                              : (e) => {
                                e.preventDefault()
                                scrollToSection(item.href)
                              }}
                            color={activeSection === item.href ? 'white' : 'gray.400'}
                            fontSize="lg"
                            fontWeight="medium"
                            p={3}
                            borderRadius="lg"
                            bg={activeSection === item.href ? 'brand.500/10' : 'transparent'}
                            borderLeft={activeSection === item.href ? '3px solid' : '3px solid transparent'}
                            borderColor={activeSection === item.href ? 'brand.500' : 'transparent'}
                            transitionProperty="color, background-color, border-color"
                            transitionDuration="0.2s"
                            _hover={{
                              color: 'white',
                              bg: 'gray.800',
                              textDecoration: 'none',
                            }}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </VStack>
                    </Drawer.Body>

                    <Drawer.Footer borderTop="1px solid" borderColor="gray.800">
                      <Link
                        href="https://github.com/kamiletar/letar/tree/main/apps/animatrona"
                        target="_blank"
                        rel="noopener noreferrer"
                        color="gray.400"
                        fontSize="sm"
                        _hover={{ color: 'white' }}
                      >
                        GitHub →
                      </Link>
                    </Drawer.Footer>
                  </Drawer.Content>
                </Drawer.Positioner>
              </Portal>
            </Drawer.Root>
          </HStack>
        </Flex>
      </Container>
    </Box>
  )
}
