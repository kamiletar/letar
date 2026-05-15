'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Card, EmptyState, Heading, Icon, Text, VStack } from '@chakra-ui/react'
import type { LicenseCategory, TransmissionType } from '@letar/driving-school-db/prisma'
import { useCallback, useState, useTransition } from 'react'
import { LuCreditCard, LuPlus } from 'react-icons/lu'
import {
  addStudentLicense,
  removeStudentLicense,
  renewStudentLicense,
  type StudentLicenseData,
} from '../_actions/license.action'
import { LicenseCard } from './license-card'
import { LicenseFormDialog } from './license-form-dialog'

interface LicenseSectionProps {
  initialLicenses: StudentLicenseData[]
}

export function LicenseSection({ initialLicenses }: LicenseSectionProps) {
  const [licenses, setLicenses] = useState<StudentLicenseData[]>(initialLicenses)
  const [isPending, startTransition] = useTransition()

  // Состояние диалога
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'add' | 'renew'>('add')
  const [selectedLicense, setSelectedLicense] = useState<StudentLicenseData | null>(null)

  // Получить существующие категории
  const existingCategories = licenses.map((l) => l.category)

  // Открыть диалог добавления
  const handleAdd = useCallback(() => {
    setDialogMode('add')
    setSelectedLicense(null)
    setDialogOpen(true)
  }, [])

  // Открыть диалог обновления
  const handleRenew = useCallback((license: StudentLicenseData) => {
    setDialogMode('renew')
    setSelectedLicense(license)
    setDialogOpen(true)
  }, [])

  // Удаление прав
  const handleDelete = useCallback((license: StudentLicenseData) => {
    if (!confirm(`Удалить права категории ${license.category}?`)) {
      return
    }

    startTransition(async () => {
      const result = await removeStudentLicense(license.id)

      if (result.success) {
        setLicenses((prev) => prev.filter((l) => l.id !== license.id))
        toaster.success({
          title: 'Права удалены',
          description: `Права категории ${license.category} удалены из профиля`,
        })
      } else {
        toaster.error({
          title: 'Ошибка',
          description: result.error,
        })
      }
    })
  }, [])

  // Отправка формы (добавление или обновление)
  const handleSubmit = useCallback(
    async (data: {
      category: LicenseCategory
      transmissionRestriction?: TransmissionType
      obtainedAt: Date
      expiresAt: Date
    }) => {
      startTransition(async () => {
        if (dialogMode === 'renew' && selectedLicense) {
          // Обновление прав
          const result = await renewStudentLicense(selectedLicense.id, {
            obtainedAt: data.obtainedAt,
            expiresAt: data.expiresAt,
          })

          if (result.success) {
            // Обновляем локальное состояние
            setLicenses((prev) =>
              prev.map((l) =>
                l.id === selectedLicense.id
                  ? {
                      ...l,
                      obtainedAt: data.obtainedAt,
                      expiresAt: data.expiresAt,
                      isVerified: false,
                      verifiedAt: null,
                    }
                  : l
              )
            )
            setDialogOpen(false)
            toaster.success({
              title: 'Права обновлены',
              description: 'Даты действия прав обновлены',
            })
          } else {
            toaster.error({
              title: 'Ошибка',
              description: result.error,
            })
          }
        } else {
          // Добавление новых прав
          const result = await addStudentLicense({
            category: data.category,
            transmissionRestriction: data.transmissionRestriction,
            obtainedAt: data.obtainedAt,
            expiresAt: data.expiresAt,
          })

          if (result.success) {
            // Добавляем в локальное состояние (с временным ID)
            const newLicense: StudentLicenseData = {
              id: `temp-${Date.now()}`,
              category: data.category,
              transmissionRestriction: data.transmissionRestriction || null,
              obtainedAt: data.obtainedAt,
              expiresAt: data.expiresAt,
              isVerified: false,
              verifiedAt: null,
            }
            setLicenses((prev) => [...prev, newLicense])
            setDialogOpen(false)
            toaster.success({
              title: 'Права добавлены',
              description: `Права категории ${data.category} добавлены в профиль`,
            })
          } else {
            toaster.error({
              title: 'Ошибка',
              description: result.error,
            })
          }
        }
      })
    },
    [dialogMode, selectedLicense]
  )

  return (
    <>
      <Card.Root>
        <Card.Header>
          <Heading size="md">
            <Icon mr={2}>
              <LuCreditCard />
            </Icon>
            Водительские права
          </Heading>
          <Text color="fg.muted" fontSize="sm">
            Укажите ваши водительские права для записи к частным инструкторам
          </Text>
        </Card.Header>

        <Card.Body>
          {licenses.length === 0 ? (
            <EmptyState.Root>
              <EmptyState.Content>
                <EmptyState.Indicator>
                  <LuCreditCard />
                </EmptyState.Indicator>
                <VStack textAlign="center">
                  <EmptyState.Title>Права не указаны</EmptyState.Title>
                  <EmptyState.Description>
                    Добавьте информацию о ваших водительских правах для записи к частным инструкторам
                  </EmptyState.Description>
                </VStack>
              </EmptyState.Content>
            </EmptyState.Root>
          ) : (
            <VStack gap={3} align="stretch">
              {licenses.map((license) => (
                <LicenseCard key={license.id} license={license} onRenew={handleRenew} onDelete={handleDelete} />
              ))}
            </VStack>
          )}

          <Box mt={4}>
            <Button colorPalette="brand" onClick={handleAdd} disabled={isPending}>
              <Icon>
                <LuPlus />
              </Icon>
              Добавить права
            </Button>
          </Box>
        </Card.Body>
      </Card.Root>

      <LicenseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        license={selectedLicense}
        existingCategories={existingCategories}
        onSubmit={handleSubmit}
        isPending={isPending}
      />
    </>
  )
}
