'use client'

import {
  Avatar,
  Box,
  Button,
  Checkbox,
  CloseButton,
  Dialog,
  EmptyState,
  HStack,
  Input,
  Portal,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { LuSearch, LuUserPlus, LuUsers } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

import { bulkAddMembersAction, getAvailableStudentsAction } from '../_actions/study-group-member.action'
import type { AvailableStudent } from '../_actions/study-group-member.types'

interface AddMemberDialogProps {
  groupId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddMemberDialog({ groupId, isOpen, onClose, onSuccess }: AddMemberDialogProps) {
  const [students, setStudents] = useState<AvailableStudent[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadStudents = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getAvailableStudentsAction(groupId)
      if (result.success) {
        setStudents(result.students)
      } else {
        toaster.error({ title: 'Ошибка', description: 'Не удалось загрузить список учеников' })
      }
    } finally {
      setIsLoading(false)
    }
  }, [groupId])

  // Загружаем доступных студентов при открытии диалога
  useEffect(() => {
    if (isOpen) {
      loadStudents()
    }
  }, [isOpen, loadStudents])

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s.id)))
    }
  }

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      return
    }

    setIsSubmitting(true)
    try {
      const result = await bulkAddMembersAction(groupId, Array.from(selectedIds))
      if (result.success) {
        toaster.success({
          title: 'Участники добавлены',
          description: `Добавлено: ${result.addedCount}${
            result.skippedCount > 0 ? `, пропущено: ${result.skippedCount}` : ''
          }`,
        })
        setSelectedIds(new Set())
        onSuccess()
        onClose()
      } else {
        toaster.error({
          title: 'Ошибка',
          description: result.message || 'Не удалось добавить участников',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedIds(new Set())
    setSearchQuery('')
    onClose()
  }

  // Фильтрация по поисковому запросу
  const filteredStudents = students.filter(
    (s) =>
      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && handleClose()} size={{ base: 'full', md: 'lg' }}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Добавить участников</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body>
              <VStack gap={4} align="stretch">
                {/* Поиск */}
                <Box position="relative">
                  <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="fg.muted">
                    <LuSearch />
                  </Box>
                  <Input
                    pl={10}
                    placeholder="Поиск по имени или email"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </Box>

                {/* Список студентов */}
                {isLoading ? (
                  <HStack justify="center" py={8}>
                    <Spinner />
                    <Text>Загрузка...</Text>
                  </HStack>
                ) : filteredStudents.length === 0 ? (
                  <EmptyState.Root>
                    <EmptyState.Content>
                      <EmptyState.Indicator>
                        <LuUsers />
                      </EmptyState.Indicator>
                      <EmptyState.Title>
                        {students.length === 0 ? 'Нет доступных учеников' : 'Ничего не найдено'}
                      </EmptyState.Title>
                      <EmptyState.Description>
                        {students.length === 0
                          ? 'Все ученики школы уже добавлены в группу'
                          : 'Попробуйте изменить запрос'}
                      </EmptyState.Description>
                    </EmptyState.Content>
                  </EmptyState.Root>
                ) : (
                  <VStack align="stretch" gap={2} maxH="400px" overflowY="auto">
                    {/* Выбрать всех */}
                    <HStack justify="space-between" py={2} borderBottomWidth={1} borderColor="border">
                      <Checkbox.Root
                        checked={selectedIds.size === filteredStudents.length && filteredStudents.length > 0}
                        onCheckedChange={handleSelectAll}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label fontWeight="medium">Выбрать всех ({filteredStudents.length})</Checkbox.Label>
                      </Checkbox.Root>
                      {selectedIds.size > 0 && (
                        <Text fontSize="sm" color="fg.muted">
                          Выбрано: {selectedIds.size}
                        </Text>
                      )}
                    </HStack>

                    {/* Список */}
                    {filteredStudents.map((student) => (
                      <HStack
                        key={student.id}
                        py={2}
                        px={2}
                        borderRadius="md"
                        _hover={{ bg: 'bg.subtle' }}
                        cursor="pointer"
                        onClick={() => handleToggle(student.id)}
                      >
                        <Checkbox.Root
                          checked={selectedIds.has(student.id)}
                          onCheckedChange={() => handleToggle(student.id)}
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control />
                        </Checkbox.Root>
                        <Avatar.Root size="sm">
                          <Avatar.Fallback>{student.name?.charAt(0) || '?'}</Avatar.Fallback>
                          {student.image && <Avatar.Image src={student.image} />}
                        </Avatar.Root>
                        <Box flex={1}>
                          <Text fontWeight="medium">{student.name || 'Без имени'}</Text>
                          {student.email && (
                            <Text fontSize="xs" color="fg.muted">
                              {student.email}
                            </Text>
                          )}
                        </Box>
                      </HStack>
                    ))}
                  </VStack>
                )}
              </VStack>
            </Dialog.Body>

            <Dialog.Footer>
              <Button variant="ghost" onClick={handleClose}>
                Отмена
              </Button>
              <Button
                colorPalette="brand"
                onClick={handleSubmit}
                disabled={selectedIds.size === 0}
                loading={isSubmitting}
              >
                <LuUserPlus />
                Добавить ({selectedIds.size})
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
