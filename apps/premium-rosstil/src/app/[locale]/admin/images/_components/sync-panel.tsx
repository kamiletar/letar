'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { Badge, Box, Button, Card, Heading, HStack, Table, Text, VStack } from '@chakra-ui/react'
import { useState, useTransition } from 'react'
import { FiAlertTriangle, FiCheck, FiRefreshCw, FiTrash2 } from 'react-icons/fi'
import {
  deleteAllBrokenRecords,
  deleteAllOrphanFiles,
  deleteBrokenRecord,
  deleteOrphanFile,
  syncImages,
  type SyncResult,
} from '../_actions/sync-images'

/**
 * Форматирование размера файла.
 */
function formatSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Б'
  }

  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))

  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

export function SyncPanel() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [deletingOrphan, setDeletingOrphan] = useState<string | null>(null)
  const [deletingBroken, setDeletingBroken] = useState<string | null>(null)

  const handleSync = async () => {
    setIsScanning(true)
    try {
      const result = await syncImages()
      setSyncResult(result)

      if (result.success) {
        const issues = result.orphanFiles.length + result.brokenRecords.length
        if (issues === 0) {
          toaster.success({
            title: 'Синхронизация завершена',
            description: 'Проблем не найдено',
          })
        } else {
          toaster.info({
            title: 'Синхронизация завершена',
            description: `Найдено ${issues} проблем`,
          })
        }
      } else {
        toaster.error({
          title: 'Ошибка синхронизации',
          description: result.error,
        })
      }
    } finally {
      setIsScanning(false)
    }
  }

  const handleDeleteOrphan = async (path: string) => {
    setDeletingOrphan(path)
    try {
      const result = await deleteOrphanFile(path)
      if (result.success) {
        toaster.success({ title: 'Файл удалён' })
        // Обновляем результат
        if (syncResult) {
          setSyncResult({
            ...syncResult,
            orphanFiles: syncResult.orphanFiles.filter((f) => f.path !== path),
          })
        }
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    } finally {
      setDeletingOrphan(null)
    }
  }

  const handleDeleteBroken = async (id: string) => {
    setDeletingBroken(id)
    try {
      const result = await deleteBrokenRecord(id)
      if (result.success) {
        toaster.success({ title: 'Запись удалена' })
        // Обновляем результат
        if (syncResult) {
          setSyncResult({
            ...syncResult,
            brokenRecords: syncResult.brokenRecords.filter((r) => r.id !== id),
          })
        }
        startTransition(() => {
          router.refresh()
        })
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    } finally {
      setDeletingBroken(null)
    }
  }

  const handleDeleteAllOrphans = async () => {
    if (!syncResult || syncResult.orphanFiles.length === 0) {
      return
    }

    if (!confirm(`Удалить ${syncResult.orphanFiles.length} сиротских файлов?`)) {
      return
    }

    setIsScanning(true)
    try {
      const result = await deleteAllOrphanFiles()
      if (result.success) {
        toaster.success({
          title: 'Файлы удалены',
          description: `Удалено ${result.deleted} файлов`,
        })
        setSyncResult({
          ...syncResult,
          orphanFiles: [],
        })
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    } finally {
      setIsScanning(false)
    }
  }

  const handleDeleteAllBroken = async () => {
    if (!syncResult || syncResult.brokenRecords.length === 0) {
      return
    }

    if (!confirm(`Удалить ${syncResult.brokenRecords.length} битых записей?`)) {
      return
    }

    setIsScanning(true)
    try {
      const result = await deleteAllBrokenRecords()
      if (result.success) {
        toaster.success({
          title: 'Записи удалены',
          description: `Удалено ${result.deleted} записей`,
        })
        setSyncResult({
          ...syncResult,
          brokenRecords: [],
        })
        startTransition(() => {
          router.refresh()
        })
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="md">Синхронизация файлов</Heading>
          <Button size="sm" colorPalette="fg" onClick={handleSync} loading={isScanning || isPending}>
            <FiRefreshCw /> Сканировать
          </Button>
        </HStack>
      </Card.Header>
      <Card.Body>
        {!syncResult ? (
          <Text color="fg.muted" textAlign="center" py={4}>
            Нажмите "Сканировать" для проверки синхронизации файлов с базой данных
          </Text>
        ) : (
          <VStack gap={6} align="stretch">
            {/* Статистика */}
            <HStack gap={4} wrap="wrap">
              <Badge colorPalette="blue" px={3} py={1}>
                Файлов на диске: {syncResult.totalFilesOnDisk}
              </Badge>
              <Badge colorPalette="purple" px={3} py={1}>
                Записей в БД: {syncResult.totalRecordsInDb}
              </Badge>
              {syncResult.orphanFiles.length === 0 && syncResult.brokenRecords.length === 0 ? (
                <Badge colorPalette="green" px={3} py={1}>
                  <FiCheck /> Всё синхронизировано
                </Badge>
              ) : (
                <Badge colorPalette="orange" px={3} py={1}>
                  <FiAlertTriangle /> Найдено проблем: {syncResult.orphanFiles.length + syncResult.brokenRecords.length}
                </Badge>
              )}
            </HStack>

            {/* Сиротские файлы */}
            {syncResult.orphanFiles.length > 0 && (
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Heading size="sm" color="orange.600">
                    Файлы без записей в БД ({syncResult.orphanFiles.length})
                  </Heading>
                  <Button size="xs" colorPalette="red" onClick={handleDeleteAllOrphans} loading={isScanning}>
                    <FiTrash2 /> Удалить все
                  </Button>
                </HStack>
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Путь</Table.ColumnHeader>
                      <Table.ColumnHeader>Категория</Table.ColumnHeader>
                      <Table.ColumnHeader>Размер</Table.ColumnHeader>
                      <Table.ColumnHeader w="80px">Действие</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {syncResult.orphanFiles.map((file) => (
                      <Table.Row key={file.path}>
                        <Table.Cell>
                          <Text fontSize="sm" wordBreak="break-all">
                            {file.path}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge>{file.category}</Badge>
                        </Table.Cell>
                        <Table.Cell>{formatSize(file.size)}</Table.Cell>
                        <Table.Cell>
                          <Button
                            size="xs"
                            colorPalette="red"
                            variant="ghost"
                            onClick={() => handleDeleteOrphan(file.path)}
                            loading={deletingOrphan === file.path}
                          >
                            <FiTrash2 />
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            )}

            {/* Битые записи */}
            {syncResult.brokenRecords.length > 0 && (
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Heading size="sm" color="red.600">
                    Записи без файлов на диске ({syncResult.brokenRecords.length})
                  </Heading>
                  <Button size="xs" colorPalette="red" onClick={handleDeleteAllBroken} loading={isScanning}>
                    <FiTrash2 /> Удалить все
                  </Button>
                </HStack>
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>ID</Table.ColumnHeader>
                      <Table.ColumnHeader>Путь</Table.ColumnHeader>
                      <Table.ColumnHeader>Категория</Table.ColumnHeader>
                      <Table.ColumnHeader w="80px">Действие</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {syncResult.brokenRecords.map((record) => (
                      <Table.Row key={record.id}>
                        <Table.Cell>
                          <Text fontSize="xs" fontFamily="mono">
                            {record.id.slice(0, 8)}...
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm" wordBreak="break-all">
                            {record.path}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge>{record.category}</Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Button
                            size="xs"
                            colorPalette="red"
                            variant="ghost"
                            onClick={() => handleDeleteBroken(record.id)}
                            loading={deletingBroken === record.id}
                          >
                            <FiTrash2 />
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            )}
          </VStack>
        )}
      </Card.Body>
    </Card.Root>
  )
}
