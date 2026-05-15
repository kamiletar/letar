'use client'

import { Box, Button, HStack, Icon, Input, Popover, Portal, Text, VStack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { LuCheck, LuChevronDown, LuSearch } from 'react-icons/lu'

export interface SearchableSelectItem {
  value: string
  label: string
}

export interface SearchableSelectProps {
  /** Элементы для выбора */
  items: SearchableSelectItem[]
  /** Текущее выбранное значение */
  value: string
  /** Callback при изменении значения */
  onChange: (value: string) => void
  /** Placeholder для триггера */
  placeholder: string
  /** Placeholder для поиска */
  searchPlaceholder?: string
  /** Ширина компонента */
  width?: string
  /** Активен ли фильтр (для подсветки) */
  isActive?: boolean
}

/**
 * Select с поиском для длинных списков
 *
 * v0.19.0: Создан для жанров, студий, озвучки, режиссёров
 */
export function SearchableSelect({
  items,
  value,
  onChange,
  placeholder,
  searchPlaceholder = 'Поиск...',
  width = '180px',
  isActive,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Фильтрованные элементы по поисковому запросу
  const filteredItems = useMemo(() => {
    if (!search) {
      return items
    }
    const searchLower = search.toLowerCase()
    return items.filter((item) => item.label.toLowerCase().includes(searchLower))
  }, [items, search])

  // Находим label выбранного элемента
  const selectedLabel = useMemo(() => {
    const selected = items.find((item) => item.value === value)
    return selected?.label || placeholder
  }, [items, value, placeholder])

  const handleSelect = (itemValue: string) => {
    onChange(itemValue)
    setOpen(false)
    setSearch('')
  }

  // Сбрасываем поиск при закрытии
  const handleOpenChange = (details: { open: boolean }) => {
    setOpen(details.open)
    if (!details.open) {
      setSearch('')
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange} positioning={{ placement: 'bottom-start' }}>
      <Popover.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          w={width}
          h="36px"
          px={3}
          bg={isActive ? 'purple.subtle' : 'bg.subtle'}
          color={isActive ? 'purple.fg' : 'fg'}
          fontWeight="normal"
          _hover={{ bg: isActive ? 'purple.subtle' : 'bg.muted' }}
        >
          <Text truncate>{selectedLabel}</Text>
          <HStack gap={1}>
            {isActive && (
              <Box as="span" color="purple.500">
                •
              </Box>
            )}
            <Icon as={LuChevronDown} boxSize={4} color="fg.subtle" />
          </HStack>
        </Button>
      </Popover.Trigger>

      <Portal>
        <Popover.Positioner>
          <Popover.Content
            w={width}
            maxH="300px"
            bg="bg.panel"
            borderColor="border.subtle"
            boxShadow="lg"
            borderRadius="md"
            overflow="hidden"
          >
            <Popover.Body p={0}>
              {/* Поле поиска */}
              <Box p={2} borderBottomWidth={1} borderColor="border.subtle">
                <Box position="relative">
                  <Input
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    size="sm"
                    pl={8}
                    autoFocus
                  />
                  <Icon
                    as={LuSearch}
                    position="absolute"
                    left={2.5}
                    top="50%"
                    transform="translateY(-50%)"
                    color="fg.subtle"
                    boxSize={4}
                  />
                </Box>
              </Box>

              {/* Список элементов */}
              <VStack
                gap={0}
                align="stretch"
                maxH="220px"
                overflowY="auto"
                css={{
                  '&::-webkit-scrollbar': { width: '6px' },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'var(--chakra-colors-border-subtle)',
                    borderRadius: '3px',
                  },
                }}
              >
                {filteredItems.length === 0 ? (
                  <Box p={3} textAlign="center">
                    <Text fontSize="sm" color="fg.subtle">
                      Ничего не найдено
                    </Text>
                  </Box>
                ) : (
                  filteredItems.map((item) => (
                    <Button
                      key={item.value}
                      variant="ghost"
                      size="sm"
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      w="full"
                      px={3}
                      py={2}
                      h="auto"
                      minH="36px"
                      fontWeight="normal"
                      textAlign="left"
                      borderRadius={0}
                      bg={item.value === value ? 'purple.subtle' : 'transparent'}
                      color={item.value === value ? 'purple.fg' : 'fg'}
                      _hover={{ bg: item.value === value ? 'purple.subtle' : 'bg.muted' }}
                      onClick={() => handleSelect(item.value)}
                    >
                      <Text truncate>{item.label}</Text>
                      {item.value === value && <Icon as={LuCheck} boxSize={4} color="purple.500" />}
                    </Button>
                  ))
                )}
              </VStack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
