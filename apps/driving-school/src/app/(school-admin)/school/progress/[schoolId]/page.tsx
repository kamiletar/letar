'use client'

import { Box, Button, HStack, Input, Spinner, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { LuPlus, LuSearch } from 'react-icons/lu'

import {
  getSchoolStudentsProgressAction,
  type ProgressFilters,
  type StudentProgressSummary,
} from '../_actions/progress.action'
import { ProgressFiltersBar } from './_components/progress-filters'
import { ProgressTable } from './_components/progress-table'

export default function SchoolStudentsProgressPage() {
  const params = useParams()
  const schoolId = params.schoolId as string

  const [students, setStudents] = useState<StudentProgressSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState<ProgressFilters>({})
  const [searchQuery, setSearchQuery] = useState('')

  const loadStudents = useCallback(async () => {
    setIsLoading(true)
    const result = await getSchoolStudentsProgressAction(schoolId, {
      ...filters,
      search: searchQuery || undefined,
    })
    if (result.success) {
      setStudents(result.students)
    }
    setIsLoading(false)
  }, [schoolId, filters, searchQuery])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
  }

  const handleFilterChange = (newFilters: ProgressFilters) => {
    setFilters(newFilters)
  }

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок */}
      <HStack justify="space-between">
        <Text fontSize="xl" fontWeight="semibold">
          Ученики и прогресс
        </Text>
        <Button colorPalette="brand" asChild>
          <Link href={`/school/progress/new?schoolId=${schoolId}`}>
            <LuPlus />
            Добавить ученика
          </Link>
        </Button>
      </HStack>

      {/* Поиск и фильтры */}
      <VStack gap={4} align="stretch">
        <HStack>
          <Box position="relative" flex={1}>
            <Input
              placeholder="Поиск по имени, email или телефону..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              pl={10}
            />
            <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="fg.muted">
              <LuSearch size={18} />
            </Box>
          </Box>
        </HStack>

        <ProgressFiltersBar filters={filters} onFilterChange={handleFilterChange} />
      </VStack>

      {/* Таблица */}
      {isLoading ? (
        <HStack justify="center" py={12}>
          <Spinner />
          <Text>Загрузка учеников...</Text>
        </HStack>
      ) : (
        <ProgressTable students={students} schoolId={schoolId} />
      )}
    </VStack>
  )
}
