'use client'

import {
  Badge,
  Box,
  CloseButton,
  Dialog,
  Flex,
  HStack,
  Input,
  Kbd,
  Link,
  Portal,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuSearch } from 'react-icons/lu'

import { useSearch } from '@/hooks/use-search'
import { scrollbarStyles } from '@/lib/constants'

import { Highlight } from './highlight'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Command Palette — быстрый поиск через Cmd+K / Ctrl+K.
 * Модальное окно с fuzzy search и keyboard navigation.
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const { query, setQuery, results, hasResults, isSearching, isPending, isLoading } = useSearch()

  // Сброс при открытии
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      // Focus с задержкой для анимации
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, setQuery])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!hasResults) {
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
          break
        case 'Enter': {
          e.preventDefault()
          const selected = results[selectedIndex]
          if (selected) {
            router.push(selected.item.href)
            onOpenChange(false)
          }
          break
        }
      }
    },
    [hasResults, results, selectedIndex, router, onOpenChange],
  )

  // Сброс индекса при изменении результатов
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      placement="top"
      motionPreset="slide-in-bottom"
      lazyMount
    >
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.700" />
        <Dialog.Positioner pt={{ base: '10vh', md: '15vh' }}>
          <Dialog.Content maxW="600px" w="90vw" borderRadius="xl" overflow="hidden">
            {/* Поисковая строка */}
            <Box borderBottomWidth="1px" borderBottomColor="border">
              <HStack px={4} gap={3}>
                {isPending || isLoading
                  ? <Spinner size="sm" color="brand.500" />
                  : <LuSearch color="var(--chakra-colors-fg-muted)" />}
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Поиск по законам..."
                  variant="flushed"
                  size="lg"
                  border="none"
                  outline="none"
                  _focus={{ boxShadow: 'none' }}
                  py={4}
                />
                <HStack gap={1}>
                  <Kbd size="sm">Esc</Kbd>
                </HStack>
              </HStack>
            </Box>

            {/* Результаты */}
            <Box maxH="400px" overflowY="auto" css={scrollbarStyles}>
              {isLoading
                ? (
                  <Flex justify="center" align="center" py={8}>
                    <Spinner size="lg" color="brand.500" />
                  </Flex>
                )
                : isSearching && !hasResults
                ? (
                  <Flex justify="center" align="center" py={8}>
                    <Text color="fg.muted">Ничего не найдено</Text>
                  </Flex>
                )
                : hasResults
                ? (
                  <VStack align="stretch" gap={0} py={2}>
                    {results.map((result, index) => {
                      const isSelected = index === selectedIndex
                      const { item, matches } = result

                      return (
                        <Link
                          key={`${item.href}-${item.articleNumber}`}
                          href={item.href}
                          onClick={() => onOpenChange(false)}
                          display="block"
                          px={4}
                          py={3}
                          bg={isSelected ? 'brand.50' : 'transparent'}
                          borderLeftWidth={isSelected ? '3px' : '0'}
                          borderLeftColor="brand.500"
                          transition="all 0.1s ease"
                          _hover={{ bg: 'bg.subtle', textDecoration: 'none' }}
                          _dark={{
                            bg: isSelected ? 'brand.950' : 'transparent',
                          }}
                          onMouseEnter={() => setSelectedIndex(index)}
                        >
                          <HStack justify="space-between" align="flex-start" mb={1}>
                            <HStack gap={2}>
                              <Badge colorPalette="red" size="sm">
                                Ст. {item.articleNumber}
                              </Badge>
                              <Text fontSize="sm" fontWeight="medium" color="fg.default">
                                {item.title}
                              </Text>
                            </HStack>
                            <Badge size="sm" variant="subtle" colorPalette="gray">
                              {item.category}
                            </Badge>
                          </HStack>
                          <Text fontSize="xs" color="fg.muted" lineClamp={2}>
                            <Highlight text={item.content} matches={matches} fieldKey="content" />
                          </Text>
                        </Link>
                      )
                    })}
                  </VStack>
                )
                : (
                  <Flex direction="column" align="center" justify="center" py={8} gap={2}>
                    <Text color="fg.muted" fontSize="sm">
                      Введите запрос для поиска
                    </Text>
                    <HStack gap={2} fontSize="xs" color="fg.muted">
                      <Kbd>↑</Kbd>
                      <Kbd>↓</Kbd>
                      <Text>для навигации</Text>
                      <Kbd>Enter</Kbd>
                      <Text>для перехода</Text>
                    </HStack>
                  </Flex>
                )}
            </Box>

            <Dialog.CloseTrigger asChild position="absolute" top={3} right={3}>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
