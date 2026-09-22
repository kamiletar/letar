'use client'

import { Box, CloseButton, Drawer, Flex, IconButton, Link, Portal, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuList } from 'react-icons/lu'

import { scrollbarStyles } from '@/lib/constants'

import { useTocScroll } from './use-toc-scroll'

/**
 * Мобильный Table of Contents.
 * FAB (Floating Action Button) внизу справа, открывает Drawer снизу.
 * Показывается только на экранах < xl (1280px).
 */
export function MobileTOC() {
  // Без resetKey — сбор заголовков и scroll-spy запускаются один раз при монтировании
  // (см. use-toc-scroll.ts), как и раньше.
  const { headings, activeId, progress } = useTocScroll()
  const [open, setOpen] = useState(false)

  // Не показываем FAB если нет заголовков
  if (headings.length === 0) {
    return null
  }

  const handleLinkClick = (id: string) => {
    const target = document.getElementById(id)
    if (target) {
      // 'instant', не 'smooth' — см. комментарий у аналогичного клика в toc.tsx
      target.scrollIntoView({ behavior: 'instant' })
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
              transitionProperty="background-color, transform"
              transitionDuration="0.2s"
              transitionTimingFunction="ease"
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
                          transitionProperty="color, background-color, border-left-width"
                          transitionDuration="0.2s"
                          transitionTimingFunction="ease"
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
