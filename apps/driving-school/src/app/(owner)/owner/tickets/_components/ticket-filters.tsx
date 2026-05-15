'use client'

import { Button, Card, Grid, Input } from '@chakra-ui/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { LuSearch, LuX } from 'react-icons/lu'

import { NativeSelectField, NativeSelectRoot } from '@/app/_components/ui/native-select'

import type { TicketCategory, TicketStatus } from '@letar/driving-school-db/prisma'

import { TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS } from '../_schemas/ticket.schema'

interface TicketFiltersProps {
  currentFilters: {
    status?: TicketStatus | 'all'
    category?: TicketCategory | 'all'
    search?: string
  }
}

export function TicketFilters({ currentFilters }: TicketFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [status, setStatus] = useState<TicketStatus | 'all'>(currentFilters.status || 'all')
  const [category, setCategory] = useState<TicketCategory | 'all'>(currentFilters.category || 'all')
  const [search, setSearch] = useState(currentFilters.search || '')

  const handleFilter = () => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())

      // Устанавливаем фильтры
      if (status !== 'all') {
        params.set('status', status)
      } else {
        params.delete('status')
      }

      if (category !== 'all') {
        params.set('category', category)
      } else {
        params.delete('category')
      }

      if (search.trim()) {
        params.set('search', search.trim())
      } else {
        params.delete('search')
      }

      router.push(`/owner/tickets?${params.toString()}`)
    })
  }

  const handleReset = () => {
    setStatus('all')
    setCategory('all')
    setSearch('')

    startTransition(() => {
      router.push('/owner/tickets')
    })
  }

  const hasFilters = status !== 'all' || category !== 'all' || search.trim() !== ''

  return (
    <Card.Root>
      <Card.Body>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr) auto' }} gap={4}>
          {/* Фильтр по статусу */}
          <NativeSelectRoot>
            <NativeSelectField
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as TicketStatus | 'all')
              }}
            >
              <option value="all">Все статусы</option>
              <option value="OPEN">{TICKET_STATUS_LABELS.OPEN}</option>
              <option value="IN_PROGRESS">{TICKET_STATUS_LABELS.IN_PROGRESS}</option>
              <option value="RESOLVED">{TICKET_STATUS_LABELS.RESOLVED}</option>
              <option value="CLOSED">{TICKET_STATUS_LABELS.CLOSED}</option>
            </NativeSelectField>
          </NativeSelectRoot>

          {/* Фильтр по категории */}
          <NativeSelectRoot>
            <NativeSelectField
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as TicketCategory | 'all')
              }}
            >
              <option value="all">Все категории</option>
              <option value="HELP">{TICKET_CATEGORY_LABELS.HELP}</option>
              <option value="BUG">{TICKET_CATEGORY_LABELS.BUG}</option>
              <option value="FEATURE">{TICKET_CATEGORY_LABELS.FEATURE}</option>
              <option value="OTHER">{TICKET_CATEGORY_LABELS.OTHER}</option>
            </NativeSelectField>
          </NativeSelectRoot>

          {/* Поиск */}
          <Input
            placeholder="Поиск по теме, описанию, автору..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleFilter()
              }
            }}
          />

          {/* Кнопки */}
          <Grid templateColumns="auto auto" gap={2}>
            <Button colorPalette="brand" onClick={handleFilter} loading={isPending}>
              <LuSearch />
              Применить
            </Button>
            {hasFilters && (
              <Button variant="ghost" onClick={handleReset} loading={isPending}>
                <LuX />
                Сбросить
              </Button>
            )}
          </Grid>
        </Grid>
      </Card.Body>
    </Card.Root>
  )
}
