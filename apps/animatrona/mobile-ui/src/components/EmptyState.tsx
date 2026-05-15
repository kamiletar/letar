/**
 * EmptyState — состояние пустой библиотеки
 *
 * Показывает иллюстрацию и call-to-action когда в библиотеке нет аниме.
 */

import { Box, Text, VStack } from '@chakra-ui/react'
import { LuFilm, LuFolderOpen, LuMonitor } from 'react-icons/lu'

interface EmptyStateProps {
  /** Тип пустого состояния */
  type?: 'library' | 'search' | 'filter'
  /** Заголовок */
  title?: string
  /** Описание */
  description?: string
}

export function EmptyState({ type = 'library', title, description }: EmptyStateProps) {
  const content = getContent(type, title, description)

  return (
    <VStack py={16} gap={6} textAlign="center">
      {/* Иллюстрация */}
      <Box position="relative" w="120px" h="120px" display="flex" alignItems="center" justifyContent="center">
        {/* Фоновый круг */}
        <Box
          position="absolute"
          inset={0}
          borderRadius="full"
          bg="purple.900/30"
          animation="pulse 3s ease-in-out infinite"
          css={{
            '@keyframes pulse': {
              '0%, 100%': { transform: 'scale(1)', opacity: 0.3 },
              '50%': { transform: 'scale(1.1)', opacity: 0.5 },
            },
          }}
        />

        {/* Иконка */}
        <Box
          position="relative"
          w="80px"
          h="80px"
          borderRadius="2xl"
          bg="gray.800"
          display="flex"
          alignItems="center"
          justifyContent="center"
          border="1px solid"
          borderColor="gray.700"
        >
          {content.icon}
        </Box>

        {/* Декоративные элементы */}
        <Box
          position="absolute"
          top={0}
          right={0}
          w="24px"
          h="24px"
          borderRadius="full"
          bg="purple.600/50"
          animation="float 2.5s ease-in-out infinite"
          css={{
            '@keyframes float': {
              '0%, 100%': { transform: 'translateY(0)' },
              '50%': { transform: 'translateY(-8px)' },
            },
          }}
        />
        <Box
          position="absolute"
          bottom={2}
          left={0}
          w="16px"
          h="16px"
          borderRadius="full"
          bg="purple.500/30"
          animation="float 3s ease-in-out infinite reverse"
        />
      </Box>

      {/* Текст */}
      <VStack gap={2}>
        <Text fontWeight="semibold" fontSize="lg" color="white">
          {content.title}
        </Text>
        <Text color="gray.400" fontSize="sm" maxW="280px" lineHeight="tall">
          {content.description}
        </Text>
      </VStack>

      {/* Подсказка */}
      <VStack gap={2} pt={4}>
        <Box
          display="flex"
          alignItems="center"
          gap={2}
          px={4}
          py={3}
          borderRadius="lg"
          bg="gray.800/50"
          border="1px solid"
          borderColor="gray.700"
        >
          <LuMonitor size={18} color="var(--chakra-colors-purple-400)" />
          <Text fontSize="sm" color="gray.300">
            Добавьте аниме через приложение на компьютере
          </Text>
        </Box>
      </VStack>
    </VStack>
  )
}

/** Контент для разных типов */
function getContent(type: EmptyStateProps['type'], title?: string, description?: string) {
  switch (type) {
    case 'search':
      return {
        icon: <LuFilm size={32} color="var(--chakra-colors-gray-500)" />,
        title: title || 'Ничего не найдено',
        description: description || 'Попробуйте изменить поисковый запрос или проверьте написание',
      }
    case 'filter':
      return {
        icon: <LuFolderOpen size={32} color="var(--chakra-colors-gray-500)" />,
        title: title || 'Нет аниме с таким статусом',
        description: description || 'Попробуйте выбрать другой фильтр',
      }
    case 'library':
    default:
      return {
        icon: <LuFilm size={32} color="var(--chakra-colors-purple-400)" />,
        title: title || 'Библиотека пуста',
        description: description || 'Добавьте своё первое аниме, чтобы начать просмотр с мобильного устройства',
      }
  }
}
