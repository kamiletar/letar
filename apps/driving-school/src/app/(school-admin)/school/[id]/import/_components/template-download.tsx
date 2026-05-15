'use client'

import type { ImportDataType, TemplateFormat } from '@/lib/excel'
import { getDataTypeLabel } from '@/lib/excel'
import { Button, HStack, Menu, Portal, Text, VStack } from '@chakra-ui/react'
import { LuDownload, LuFileSpreadsheet } from 'react-icons/lu'

interface TemplateDownloadProps {
  dataType: ImportDataType
}

export function TemplateDownload({ dataType }: TemplateDownloadProps) {
  const label = getDataTypeLabel(dataType)

  const handleDownload = async (format: TemplateFormat) => {
    const url = `/api/import/template?type=${dataType}&format=${format}`

    // Используем fetch для скачивания
    const response = await fetch(url)
    if (!response.ok) {
      console.error('Ошибка скачивания шаблона')
      return
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `шаблон_${dataType === 'students' ? 'ученики' : 'инструкторы'}.${format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(downloadUrl)
  }

  return (
    <VStack align="stretch" gap={2} p={4} bg="bg.muted" borderRadius="lg">
      <HStack>
        <LuFileSpreadsheet size={20} />
        <Text fontWeight="medium">{label}</Text>
      </HStack>
      <Text fontSize="sm" color="fg.muted">
        Скачайте шаблон, заполните данные и загрузите обратно
      </Text>
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button size="sm" variant="outline" colorPalette="brand">
            <LuDownload />
            Скачать шаблон
          </Button>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content>
              <Menu.Item value="xlsx" onClick={() => handleDownload('xlsx')}>
                Excel (.xlsx)
              </Menu.Item>
              <Menu.Item value="ods" onClick={() => handleDownload('ods')}>
                LibreOffice (.ods)
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </VStack>
  )
}
