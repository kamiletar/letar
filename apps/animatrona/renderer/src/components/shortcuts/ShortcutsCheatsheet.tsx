'use client'

import { Box, Dialog, Grid, GridItem, HStack, Kbd, Text, VStack } from '@chakra-ui/react'
import { LuKeyboard, LuX } from 'react-icons/lu'

import { SHORTCUTS_CONFIG } from '@/lib/shortcuts'

interface ShortcutsCheatsheetProps {
  /** Открыт ли диалог */
  open: boolean
  /** Колбэк изменения состояния */
  onOpenChange: (open: boolean) => void
}

/**
 * Модальное окно со списком горячих клавиш
 *
 * Открывается по Ctrl+/
 * Показывает все доступные хоткеи сгруппированные по категориям
 */
export function ShortcutsCheatsheet({ open, onOpenChange }: ShortcutsCheatsheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} placement="center" size="lg">
      <Dialog.Backdrop bg="blackAlpha.700" />
      <Dialog.Positioner>
        <Dialog.Content bg="bg.panel" borderColor="border.subtle" borderWidth={1} maxW="600px">
          <Dialog.Header borderBottomWidth={1} borderColor="border.subtle">
            <HStack gap={2}>
              <Box as={LuKeyboard} color="purple.400" />
              <Dialog.Title>Горячие клавиши</Dialog.Title>
            </HStack>
            <Dialog.CloseTrigger asChild position="absolute" top={3} right={3}>
              <Box as="button" p={2} borderRadius="md" _hover={{ bg: 'bg.subtle' }} cursor="pointer">
                <LuX />
              </Box>
            </Dialog.CloseTrigger>
          </Dialog.Header>

          <Dialog.Body py={4}>
            <Grid templateColumns="repeat(2, 1fr)" gap={6}>
              {SHORTCUTS_CONFIG.map((category) => (
                <GridItem key={category.name}>
                  <VStack align="stretch" gap={3}>
                    {/* Заголовок категории */}
                    <Text
                      fontSize="xs"
                      fontWeight="semibold"
                      color="purple.400"
                      textTransform="uppercase"
                      letterSpacing="wider"
                    >
                      {category.name}
                    </Text>

                    {/* Список хоткеев */}
                    <VStack align="stretch" gap={2}>
                      {category.items.map((item, index) => (
                        <HStack key={index} justify="space-between">
                          <Text fontSize="sm" color="fg.muted">
                            {item.description}
                          </Text>
                          <HStack gap={1}>
                            {item.keys.map((key, keyIndex) => (
                              <Kbd
                                key={keyIndex}
                                bg="bg.subtle"
                                borderColor="border.subtle"
                                borderWidth={1}
                                px={2}
                                py={0.5}
                                fontSize="xs"
                                borderRadius="md"
                              >
                                {key}
                              </Kbd>
                            ))}
                          </HStack>
                        </HStack>
                      ))}
                    </VStack>
                  </VStack>
                </GridItem>
              ))}
            </Grid>
          </Dialog.Body>

          <Dialog.Footer borderTopWidth={1} borderColor="border.subtle" pt={3}>
            <Text fontSize="xs" color="fg.subtle">
              Нажмите{' '}
              <Kbd bg="bg.subtle" borderColor="border.subtle" px={1}>
                Esc
              </Kbd>{' '}
              чтобы закрыть
            </Text>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
