'use client'

import { Badge, Box, Button, Card, Checkbox, HStack, Icon, Progress, Table, Text } from '@chakra-ui/react'
import { LuCheck, LuFileVideo, LuLoader, LuSquareCheck, LuSquareMinus, LuX } from 'react-icons/lu'

import type { FileItem } from '@/hooks/useTranscode'

interface FileListProps {
  files: FileItem[]
  selectedFiles: string[]
  onToggle: (path: string) => void
  onSelectAll?: () => void
  onDeselectAll?: () => void
  showProgress?: boolean
}

/**
 * Список файлов для транскодирования
 */
export function FileList({ files, selectedFiles, onToggle, onSelectAll, onDeselectAll, showProgress }: FileListProps) {
  const allSelected = files.length > 0 && selectedFiles.length === files.length
  const noneSelected = selectedFiles.length === 0
  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    return gb >= 1 ? `${gb.toFixed(2)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`
  }

  const getStatusBadge = (status: FileItem['status']) => {
    switch (status) {
      case 'pending':
        return <Badge colorPalette="gray">Ожидание</Badge>
      case 'analyzing':
        return (
          <Badge colorPalette="blue">
            <Icon as={LuLoader} mr={1} className="animate-spin" />
            Анализ
          </Badge>
        )
      case 'ready':
        return <Badge colorPalette="green">Готов</Badge>
      case 'transcoding':
        return (
          <Badge colorPalette="purple">
            <Icon as={LuLoader} mr={1} className="animate-spin" />
            Кодирование
          </Badge>
        )
      case 'completed':
        return (
          <Badge colorPalette="green">
            <Icon as={LuCheck} mr={1} />
            Готово
          </Badge>
        )
      case 'error':
        return (
          <Badge colorPalette="red">
            <Icon as={LuX} mr={1} />
            Ошибка
          </Badge>
        )
    }
  }

  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      {/* Кнопки выбора */}
      {(onSelectAll || onDeselectAll) && (
        <Card.Header bg="bg.subtle" borderBottom="1px" borderColor="border.subtle" py={3}>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">
              Выбрано: {selectedFiles.length} из {files.length}
            </Text>
            <HStack gap={2}>
              <Button size="xs" variant="ghost" onClick={onSelectAll} disabled={allSelected}>
                <Icon as={LuSquareCheck} mr={1} />
                Выбрать всё
              </Button>
              <Button size="xs" variant="ghost" onClick={onDeselectAll} disabled={noneSelected}>
                <Icon as={LuSquareMinus} mr={1} />
                Снять всё
              </Button>
            </HStack>
          </HStack>
        </Card.Header>
      )}
      <Card.Body p={0}>
        <Table.Root variant="line">
          <Table.Header>
            <Table.Row bg="bg.subtle">
              <Table.ColumnHeader w="40px" />
              <Table.ColumnHeader>Файл</Table.ColumnHeader>
              <Table.ColumnHeader>Размер</Table.ColumnHeader>
              <Table.ColumnHeader>Информация</Table.ColumnHeader>
              <Table.ColumnHeader>Статус</Table.ColumnHeader>
              {showProgress && <Table.ColumnHeader>Прогресс</Table.ColumnHeader>}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {files.map((file) => (
              <Table.Row
                key={file.path}
                _hover={{ bg: 'bg.subtle' }}
                opacity={selectedFiles.includes(file.path) ? 1 : 0.5}
              >
                <Table.Cell>
                  <Checkbox.Root
                    checked={selectedFiles.includes(file.path)}
                    onCheckedChange={() => onToggle(file.path)}
                    disabled={file.status === 'transcoding' || file.status === 'completed'}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                  </Checkbox.Root>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={3}>
                    <Icon as={LuFileVideo} color="purple.400" boxSize={5} />
                    <Text fontWeight="medium">{file.name}</Text>
                  </HStack>
                </Table.Cell>
                <Table.Cell color="fg.muted">{formatSize(file.size)}</Table.Cell>
                <Table.Cell>
                  {file.mediaInfo ? (
                    <Text fontSize="sm" color="fg.muted">
                      {file.mediaInfo.videoTracks[0]?.codec || 'N/A'} • {file.mediaInfo.videoTracks[0]?.width}x
                      {file.mediaInfo.videoTracks[0]?.height}
                    </Text>
                  ) : (
                    <Text fontSize="sm" color="fg.subtle">
                      —
                    </Text>
                  )}
                </Table.Cell>
                <Table.Cell>{getStatusBadge(file.status)}</Table.Cell>
                {showProgress && (
                  <Table.Cell>
                    {file.status === 'transcoding' && (
                      <Box w="100px">
                        <Progress.Root value={file.progress || 0} size="sm">
                          <Progress.Track>
                            <Progress.Range />
                          </Progress.Track>
                        </Progress.Root>
                        <Text fontSize="xs" color="fg.subtle" mt={1}>
                          {file.progress?.toFixed(0)}%
                        </Text>
                      </Box>
                    )}
                    {file.status === 'completed' && <Icon as={LuCheck} color="green.400" boxSize={5} />}
                  </Table.Cell>
                )}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Card.Body>
    </Card.Root>
  )
}
