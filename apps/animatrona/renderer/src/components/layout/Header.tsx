'use client'

import { UpdateBadge } from '@/components/update'
import { Box, Flex, HStack, Icon, Kbd, Text } from '@chakra-ui/react'
import { LuSearch } from 'react-icons/lu'

interface HeaderProps {
  title?: string
  /** Callback для открытия QuickSearch (опционально, работает через глобальный хоткей) */
  onOpenSearch?: () => void
}

/**
 * Верхняя панель приложения
 *
 * Поиск открывается по Ctrl+K или / (глобальный хоткей)
 */
export function Header({ title, onOpenSearch }: HeaderProps) {
  // Обработчик клика по кнопке поиска
  const handleSearchClick = () => {
    if (onOpenSearch) {
      onOpenSearch()
    } else {
      // Эмулируем Ctrl+K для открытия QuickSearch через глобальный хоткей
      // Используем code вместо key — не зависит от раскладки (ru/en)
      const event = new KeyboardEvent('keydown', {
        code: 'KeyK',
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)
    }
  }
  return (
    <Box
      as="header"
      h="60px"
      px={6}
      bg="bg.panel"
      borderBottom="1px"
      borderColor="border"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      position="sticky"
      top={0}
      zIndex="sticky"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Заголовок страницы */}
      <Text fontSize="lg" fontWeight="semibold" color="fg">
        {title}
      </Text>

      {/* Правая панель: UpdateBadge + Поиск */}
      <HStack gap={2} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Badge обновлений */}
        <UpdateBadge />

        {/* Кнопка поиска */}
        <Flex
          as="button"
          align="center"
          gap={2}
          px={3}
          py={1.5}
          bg="bg.muted"
          borderRadius="md"
          cursor="pointer"
          onClick={handleSearchClick}
          _hover={{ bg: 'state.hover' }}
          _active={{ bg: 'state.active', transform: 'scale(0.98)' }}
          transition="all 0.1s ease-out"
        >
          <Icon as={LuSearch} color="fg.subtle" boxSize={4} />
          <Text fontSize="sm" color="fg.subtle">
            Поиск
          </Text>
          <HStack gap={0.5} ml={2}>
            <Kbd bg="bg.emphasized" borderColor="border" fontSize="xs" px={1.5}>
              Ctrl
            </Kbd>
            <Kbd bg="bg.emphasized" borderColor="border" fontSize="xs" px={1.5}>
              K
            </Kbd>
          </HStack>
        </Flex>
      </HStack>
    </Box>
  )
}
