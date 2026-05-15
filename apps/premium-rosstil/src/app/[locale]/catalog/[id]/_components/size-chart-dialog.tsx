'use client'

import type { Gender } from '@/generated/prisma'
import { Button, CloseButton, Dialog, Portal, Table, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { getSizeChart } from '../_actions/get-size-chart'

interface SizeChartDialogProps {
  gender: Gender
}

interface ProductSize {
  id: string
  gender: Gender
  international: string
  ru: string
  de: string
  it: string
  fr: string
  uk: string
  us: string
  jeansFrom: string
  jeansTo: string
  bustMin: number | null
  bustMax: number | null
  waistMin: number | null
  waistMax: number | null
  hipsMin: number | null
  hipsMax: number | null
}

export function SizeChartDialog({ gender }: SizeChartDialogProps) {
  const [open, setOpen] = useState(false)
  const [sizes, setSizes] = useState<ProductSize[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && sizes.length === 0) {
      setLoading(true)
      getSizeChart(gender)
        .then((data) => setSizes(data))
        .finally(() => setLoading(false))
    }
  }, [open, gender, sizes.length])

  const genderLabel = gender === 'FEMALE' ? 'Женские' : 'Мужские'

  return (
    <Dialog.Root size="xl" open={open} onOpenChange={(e) => setOpen(e.open)} scrollBehavior="inside">
      <Dialog.Trigger asChild>
        <Button colorPalette="gray" size="lg" flex="1" variant="outline">
          Таблица размеров
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{genderLabel} размеры</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {loading ? (
                <Text>Загрузка...</Text>
              ) : sizes.length === 0 ? (
                <Text>Нет данных о размерах</Text>
              ) : (
                <VStack align="stretch" gap={6}>
                  {/* Таблица международных размеров */}
                  <VStack align="stretch" gap={2}>
                    <Text fontWeight="semibold">Соответствие размеров по странам</Text>
                    <Table.Root size="sm" variant="outline">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeader>INT</Table.ColumnHeader>
                          <Table.ColumnHeader>RU</Table.ColumnHeader>
                          <Table.ColumnHeader>DE</Table.ColumnHeader>
                          <Table.ColumnHeader>IT</Table.ColumnHeader>
                          <Table.ColumnHeader>FR</Table.ColumnHeader>
                          <Table.ColumnHeader>UK</Table.ColumnHeader>
                          <Table.ColumnHeader>US</Table.ColumnHeader>
                          <Table.ColumnHeader>Jeans</Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {sizes.map((size) => (
                          <Table.Row key={size.id}>
                            <Table.Cell fontWeight="semibold">{size.international}</Table.Cell>
                            <Table.Cell>{size.ru}</Table.Cell>
                            <Table.Cell>{size.de}</Table.Cell>
                            <Table.Cell>{size.it}</Table.Cell>
                            <Table.Cell>{size.fr}</Table.Cell>
                            <Table.Cell>{size.uk}</Table.Cell>
                            <Table.Cell>{size.us}</Table.Cell>
                            <Table.Cell>
                              {size.jeansFrom}
                              {size.jeansFrom !== size.jeansTo && `-${size.jeansTo}`}
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </VStack>

                  {/* Таблица измерений тела */}
                  {sizes.some((s) => s.bustMin || s.bustMax || s.waistMin || s.waistMax || s.hipsMin || s.hipsMax) && (
                    <VStack align="stretch" gap={2}>
                      <Text fontWeight="semibold">Измерения тела (см)</Text>
                      <Table.Root size="sm" variant="outline">
                        <Table.Header>
                          <Table.Row>
                            <Table.ColumnHeader>Размер</Table.ColumnHeader>
                            <Table.ColumnHeader>Грудь</Table.ColumnHeader>
                            <Table.ColumnHeader>Талия</Table.ColumnHeader>
                            <Table.ColumnHeader>Бедра</Table.ColumnHeader>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {sizes.map((size) => {
                            const hasMeasurements =
                              size.bustMin ||
                              size.bustMax ||
                              size.waistMin ||
                              size.waistMax ||
                              size.hipsMin ||
                              size.hipsMax

                            if (!hasMeasurements) {
                              return null
                            }

                            const formatRange = (min: number | null, max: number | null) => {
                              if (!min && !max) {
                                return '—'
                              }
                              if (!max || min === max) {
                                return `${min}`
                              }
                              return `${min}-${max}`
                            }

                            return (
                              <Table.Row key={size.id}>
                                <Table.Cell fontWeight="semibold">{size.international}</Table.Cell>
                                <Table.Cell>{formatRange(size.bustMin, size.bustMax)}</Table.Cell>
                                <Table.Cell>{formatRange(size.waistMin, size.waistMax)}</Table.Cell>
                                <Table.Cell>{formatRange(size.hipsMin, size.hipsMax)}</Table.Cell>
                              </Table.Row>
                            )
                          })}
                        </Table.Body>
                      </Table.Root>
                    </VStack>
                  )}

                  {/* Пояснение */}
                  <Text fontSize="sm" color="fg.muted">
                    Все измерения указаны в сантиметрах. Если вы находитесь между размерами, рекомендуем выбрать больший
                    размер.
                  </Text>
                </VStack>
              )}
            </Dialog.Body>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
