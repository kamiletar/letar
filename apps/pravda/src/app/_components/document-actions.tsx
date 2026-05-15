'use client'

import { Box, IconButton, Menu, Portal, Text } from '@chakra-ui/react'
import { LuDownload, LuPrinter } from 'react-icons/lu'

/**
 * Меню действий с документом: печать и экспорт в PDF.
 * Скрывается при печати.
 */
export function DocumentActions() {
  const handlePrint = () => {
    window.print()
  }

  const handleSaveAsPdf = () => {
    // В современных браузерах печать с выбором "Сохранить как PDF" — лучший способ
    // Показываем подсказку и открываем диалог печати
    window.print()
  }

  return (
    <Box data-print-hide>
      <Menu.Root>
        <Menu.Trigger asChild>
          <IconButton
            aria-label="Действия с документом"
            aria-haspopup="menu"
            title="Печать и экспорт"
            variant="ghost"
            size="sm"
          >
            <LuPrinter />
          </IconButton>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content minW="200px">
              <Menu.Item value="print" onClick={handlePrint}>
                <LuPrinter />
                <Box flex="1">Печать</Box>
                <Menu.ItemCommand>Ctrl+P</Menu.ItemCommand>
              </Menu.Item>
              <Menu.Item value="pdf" onClick={handleSaveAsPdf}>
                <LuDownload />
                <Box flex="1">Сохранить как PDF</Box>
              </Menu.Item>
              <Menu.Separator />
              <Box px={3} py={2}>
                <Text fontSize="xs" color="fg.muted">
                  Для PDF выберите «Сохранить как PDF» в диалоге печати
                </Text>
              </Box>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </Box>
  )
}
