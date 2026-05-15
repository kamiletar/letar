'use client'

import { Button, Card, HStack, Input, VStack } from '@chakra-ui/react'

import { Field } from '@/app/_components/ui/field'
import { NativeSelectField, NativeSelectRoot } from '@/app/_components/ui/native-select'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuFilter, LuX } from 'react-icons/lu'

import type { AuditAction } from '@letar/driving-school-db/prisma'

interface AuditFiltersProps {
  currentFilters: {
    action?: AuditAction | 'all'
    dateRange?: 'today' | 'week' | 'month' | 'all'
    search?: string
  }
}

export function AuditFilters({ currentFilters }: AuditFiltersProps) {
  const router = useRouter()

  const [action, setAction] = useState<string>(currentFilters.action || 'all')
  const [dateRange, setDateRange] = useState<string>(currentFilters.dateRange || 'all')
  const [search, setSearch] = useState(currentFilters.search || '')

  const handleApplyFilters = () => {
    const params = new URLSearchParams()

    if (action !== 'all') {
      params.set('action', action)
    }
    if (dateRange !== 'all') {
      params.set('dateRange', dateRange)
    }
    if (search.trim()) {
      params.set('search', search.trim())
    }

    router.push(`/owner/audit?${params.toString()}`)
  }

  const handleResetFilters = () => {
    setAction('all')
    setDateRange('all')
    setSearch('')
    router.push('/owner/audit')
  }

  const hasActiveFilters = action !== 'all' || dateRange !== 'all' || search.trim() !== ''

  return (
    <Card.Root>
      <Card.Body>
        <VStack gap={4} align="stretch">
          <HStack gap={4} flexWrap="wrap">
            {/* Фильтр по типу действия */}
            <Field label="Тип действия" flex="1" minW="200px">
              <NativeSelectRoot>
                <NativeSelectField value={action} onChange={(e) => setAction(e.target.value)}>
                  <option value="all">Все действия</option>
                  <optgroup label="Пользователи">
                    <option value="USER_REGISTER">Регистрация</option>
                    <option value="USER_LOGIN">Вход</option>
                  </optgroup>
                  <optgroup label="Занятия">
                    <option value="LESSON_CREATE">Создание занятия</option>
                    <option value="LESSON_CONFIRM">Подтверждение занятия</option>
                    <option value="LESSON_CANCEL">Отмена занятия</option>
                    <option value="LESSON_RESCHEDULE">Перенос занятия</option>
                    <option value="LESSON_COMPLETE">Завершение занятия</option>
                  </optgroup>
                  <optgroup label="Штрафы">
                    <option value="PENALTY_CHARGE">Начисление штрафа</option>
                    <option value="PENALTY_PAY">Оплата штрафа</option>
                    <option value="PENALTY_CANCEL">Отмена штрафа</option>
                  </optgroup>
                  <optgroup label="Система">
                    <option value="SCHEDULE_UPDATE">Обновление расписания</option>
                    <option value="STUDENT_TRANSFER">Передача ученика</option>
                    <option value="ADMIN_ACTION">Действие админа</option>
                  </optgroup>
                  <optgroup label="Владелец">
                    <option value="OWNER_USER_BLOCK">Блокировка пользователя</option>
                    <option value="OWNER_USER_UNBLOCK">Разблокировка пользователя</option>
                    <option value="OWNER_USER_ROLE_CHANGE">Изменение роли</option>
                    <option value="OWNER_SCHOOL_MODERATE">Модерация школы</option>
                    <option value="OWNER_REVIEW_HIDE">Скрытие отзыва</option>
                    <option value="OWNER_TICKET_ASSIGN">Назначение тикета</option>
                    <option value="OWNER_TICKET_RESOLVE">Решение тикета</option>
                  </optgroup>
                </NativeSelectField>
              </NativeSelectRoot>
            </Field>

            {/* Фильтр по дате */}
            <Field label="Период" flex="1" minW="150px">
              <NativeSelectRoot>
                <NativeSelectField value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                  <option value="all">Всё время</option>
                  <option value="today">Сегодня</option>
                  <option value="week">Неделя</option>
                  <option value="month">Месяц</option>
                </NativeSelectField>
              </NativeSelectRoot>
            </Field>

            {/* Поиск по пользователю */}
            <Field label="Поиск по пользователю" flex="2" minW="250px">
              <Input
                placeholder="Имя или email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyFilters()
                  }
                }}
              />
            </Field>
          </HStack>

          {/* Кнопки */}
          <HStack justify="flex-end" gap={2}>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                <LuX />
                Сбросить
              </Button>
            )}
            <Button colorPalette="brand" size="sm" onClick={handleApplyFilters}>
              <LuFilter />
              Применить
            </Button>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
