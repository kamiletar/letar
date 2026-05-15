'use client'

import { Box, Button, EmptyState, Kbd, Text, VStack } from '@chakra-ui/react'
import { LuFilm, LuFolderPlus, LuKeyboard } from 'react-icons/lu'

interface EmptyLibraryStateProps {
  /** Колбэк для открытия визарда импорта */
  onImport: () => void
  /** Колбэк для показа горячих клавиш */
  onShowShortcuts?: () => void
}

/**
 * Компонент пустого состояния библиотеки
 *
 * Показывается когда в библиотеке нет аниме
 * Предлагает импортировать видео или показать подсказки
 */
export function EmptyLibraryState({ onImport, onShowShortcuts }: EmptyLibraryStateProps) {
  return (
    <EmptyState.Root>
      <EmptyState.Content>
        {/* Иконка */}
        <EmptyState.Indicator>
          <Box as={LuFilm} color="primary.fg" />
        </EmptyState.Indicator>

        {/* Текст */}
        <VStack textAlign="center" gap={2}>
          <EmptyState.Title fontSize="xl">Библиотека пуста</EmptyState.Title>
          <EmptyState.Description color="fg.muted" maxW="sm">
            Импортируйте папку с аниме, чтобы начать просмотр. Animatrona автоматически распознает структуру папок и
            загрузит метаданные из Shikimori.
          </EmptyState.Description>
        </VStack>

        {/* Кнопка импорта */}
        <Button colorPalette="purple" size="lg" onClick={onImport} mt={4}>
          <LuFolderPlus />
          Импортировать видео
        </Button>

        {/* Подсказка про drag & drop */}
        <Text fontSize="sm" color="fg.subtle" mt={2}>
          Или перетащите папку сюда
        </Text>

        {/* Подсказка про хоткеи */}
        {onShowShortcuts && (
          <Button
            variant="ghost"
            size="sm"
            color="fg.subtle"
            onClick={onShowShortcuts}
            mt={4}
            _hover={{ color: 'fg.muted' }}
          >
            <LuKeyboard />
            <Text>
              Нажмите{' '}
              <Kbd bg="bg.muted" borderColor="border" px={1}>
                Ctrl
              </Kbd>{' '}
              +{' '}
              <Kbd bg="bg.muted" borderColor="border" px={1}>
                /
              </Kbd>{' '}
              для списка горячих клавиш
            </Text>
          </Button>
        )}
      </EmptyState.Content>
    </EmptyState.Root>
  )
}
