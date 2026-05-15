'use client'

import { Badge, Box, Button, Card, HStack, IconButton, Input, Spinner, Text, Textarea, VStack } from '@chakra-ui/react'
import type { LicenseCategory } from '@letar/driving-school-db/prisma'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { LuArrowLeft, LuBuilding2, LuPlus, LuSearch, LuTrash2 } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

import {
  createPartnershipAction,
  getPartnerSchoolsAction,
  type PartnerSchoolOption,
} from '../../_actions/partnership.action'
import type { CreatePartnershipData } from '../../_schemas/partnership.schema'

// Опции категорий
const CATEGORY_OPTIONS: { label: string; value: LicenseCategory }[] = [
  { label: 'M (мопеды)', value: 'M' },
  { label: 'A1 (лёгкие мотоциклы)', value: 'A1' },
  { label: 'A (мотоциклы)', value: 'A' },
  { label: 'B1 (трициклы)', value: 'B1' },
  { label: 'B (легковые авто)', value: 'B' },
  { label: 'C1 (средние грузовики)', value: 'C1' },
  { label: 'C (грузовые авто)', value: 'C' },
  { label: 'D1 (малые автобусы)', value: 'D1' },
  { label: 'D (автобусы)', value: 'D' },
  { label: 'BE', value: 'BE' },
  { label: 'CE', value: 'CE' },
  { label: 'C1E', value: 'C1E' },
  { label: 'DE', value: 'DE' },
  { label: 'D1E', value: 'D1E' },
  { label: 'Tm (трамваи)', value: 'Tm' },
  { label: 'Tb (троллейбусы)', value: 'Tb' },
]

interface CategoryForm {
  id: string
  category: LicenseCategory
  pricePerLesson: string
  notes: string
}

/**
 * Страница создания нового партнёрства
 */
export default function NewPartnershipPage() {
  const params = useParams()
  const router = useRouter()
  const schoolId = params.schoolId as string

  // Поиск школ
  const [searchQuery, setSearchQuery] = useState('')
  const [schools, setSchools] = useState<PartnerSchoolOption[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState<PartnerSchoolOption | null>(null)

  // Форма
  const [terms, setTerms] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [categories, setCategories] = useState<CategoryForm[]>([
    { id: crypto.randomUUID(), category: 'A', pricePerLesson: '', notes: '' },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Поиск школ
  const searchSchools = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSchools([])
      return
    }

    setIsSearching(true)
    try {
      const result = await getPartnerSchoolsAction(schoolId, searchQuery)
      if (result.success) {
        setSchools(result.schools)
      }
    } finally {
      setIsSearching(false)
    }
  }, [schoolId, searchQuery])

  useEffect(() => {
    const debounce = setTimeout(searchSchools, 300)
    return () => clearTimeout(debounce)
  }, [searchSchools])

  // Добавление категории
  const addCategory = () => {
    // Находим первую неиспользованную категорию
    const usedCategories = categories.map((c) => c.category)
    const availableCategory = CATEGORY_OPTIONS.find((opt) => !usedCategories.includes(opt.value))

    if (availableCategory) {
      setCategories([
        ...categories,
        { id: crypto.randomUUID(), category: availableCategory.value, pricePerLesson: '', notes: '' },
      ])
    }
  }

  // Удаление категории
  const removeCategory = (index: number) => {
    if (categories.length > 1) {
      setCategories(categories.filter((_, i) => i !== index))
    }
  }

  // Обновление категории
  const updateCategory = (index: number, field: keyof CategoryForm, value: string) => {
    const newCategories = [...categories]
    if (field === 'category') {
      newCategories[index].category = value as LicenseCategory
    } else {
      newCategories[index][field] = value
    }
    setCategories(newCategories)
  }

  // Отправка формы
  const handleSubmit = async () => {
    if (!selectedSchool) {
      toaster.error({ title: 'Выберите школу-партнёра' })
      return
    }

    if (categories.length === 0) {
      toaster.error({ title: 'Добавьте хотя бы одну категорию' })
      return
    }

    setIsSubmitting(true)
    try {
      const data: CreatePartnershipData = {
        partnerOrgId: selectedSchool.id,
        terms: terms || null,
        expiresAt: expiresAt || null,
        categories: categories.map((c) => ({
          category: c.category,
          pricePerLesson: c.pricePerLesson ? parseFloat(c.pricePerLesson) : null,
          notes: c.notes || null,
        })),
      }

      const result = await createPartnershipAction(schoolId, data)
      if (result.success) {
        toaster.success({ title: 'Запрос на партнёрство отправлен' })
        router.push(`/school/partnerships/${schoolId}`)
      } else {
        toaster.error({ title: result.message ?? 'Ошибка создания партнёрства' })
      }
    } catch {
      toaster.error({ title: 'Ошибка создания партнёрства' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок */}
      <HStack>
        <IconButton aria-label="Назад" variant="ghost" onClick={() => router.back()}>
          <LuArrowLeft />
        </IconButton>
        <Text fontSize="xl" fontWeight="semibold">
          Новое партнёрство
        </Text>
      </HStack>

      {/* Выбор школы */}
      <Card.Root>
        <Card.Header>
          <Card.Title>Школа-партнёр</Card.Title>
          <Card.Description>Выберите автошколу, с которой хотите установить партнёрство</Card.Description>
        </Card.Header>
        <Card.Body>
          {selectedSchool ? (
            <HStack justify="space-between">
              <HStack>
                <Box bg="bg.muted" borderRadius="md" p={2}>
                  <LuBuilding2 />
                </Box>
                <VStack align="start" gap={0}>
                  <Text fontWeight="semibold">{selectedSchool.name}</Text>
                  <Text fontSize="sm" color="fg.muted">
                    {selectedSchool.slug}
                  </Text>
                </VStack>
              </HStack>
              <Button variant="ghost" onClick={() => setSelectedSchool(null)}>
                Изменить
              </Button>
            </HStack>
          ) : (
            <VStack align="stretch" gap={3}>
              <HStack>
                <Input
                  placeholder="Поиск по названию школы..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <IconButton aria-label="Поиск" variant="outline">
                  {isSearching ? <Spinner size="sm" /> : <LuSearch />}
                </IconButton>
              </HStack>

              {schools.length > 0 && (
                <VStack align="stretch" gap={2}>
                  {schools.map((school) => (
                    <Button
                      key={school.id}
                      variant="outline"
                      justifyContent="flex-start"
                      onClick={() => {
                        setSelectedSchool(school)
                        setSearchQuery('')
                        setSchools([])
                      }}
                    >
                      <LuBuilding2 />
                      {school.name}
                    </Button>
                  ))}
                </VStack>
              )}

              {searchQuery && !isSearching && schools.length === 0 && (
                <Text color="fg.muted" fontSize="sm">
                  Школы не найдены
                </Text>
              )}
            </VStack>
          )}
        </Card.Body>
      </Card.Root>

      {/* Категории */}
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between">
            <VStack align="start" gap={0}>
              <Card.Title>Категории партнёрства</Card.Title>
              <Card.Description>Укажите категории, по которым вы будете направлять учеников</Card.Description>
            </VStack>
            <Button size="sm" variant="outline" onClick={addCategory}>
              <LuPlus />
              Добавить
            </Button>
          </HStack>
        </Card.Header>
        <Card.Body>
          <VStack align="stretch" gap={4}>
            {categories.map((cat, index) => (
              <Box key={cat.id} p={4} borderWidth={1} borderRadius="md" position="relative">
                <VStack align="stretch" gap={3}>
                  <HStack justify="space-between">
                    <Text fontWeight="medium">Категория {index + 1}</Text>
                    {categories.length > 1 && (
                      <IconButton
                        aria-label="Удалить"
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => removeCategory(index)}
                      >
                        <LuTrash2 />
                      </IconButton>
                    )}
                  </HStack>

                  <HStack gap={4}>
                    <Box flex={1}>
                      <Text fontSize="sm" mb={1}>
                        Категория прав
                      </Text>
                      <select
                        value={cat.category}
                        onChange={(e) => updateCategory(index, 'category', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--chakra-colors-border-emphasized)',
                          background: 'transparent',
                        }}
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </Box>
                    <Box flex={1}>
                      <Text fontSize="sm" mb={1}>
                        Цена за занятие (₽)
                      </Text>
                      <Input
                        type="number"
                        placeholder="2000"
                        value={cat.pricePerLesson}
                        onChange={(e) => updateCategory(index, 'pricePerLesson', e.target.value)}
                      />
                    </Box>
                  </HStack>

                  <Box>
                    <Text fontSize="sm" mb={1}>
                      Примечания
                    </Text>
                    <Textarea
                      placeholder="Дополнительные условия..."
                      value={cat.notes}
                      onChange={(e) => updateCategory(index, 'notes', e.target.value)}
                      rows={2}
                    />
                  </Box>
                </VStack>
              </Box>
            ))}
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Условия */}
      <Card.Root>
        <Card.Header>
          <Card.Title>Условия партнёрства</Card.Title>
          <Card.Description>Опишите общие условия сотрудничества (опционально)</Card.Description>
        </Card.Header>
        <Card.Body>
          <VStack align="stretch" gap={4}>
            <Box>
              <Text fontSize="sm" mb={1}>
                Описание условий
              </Text>
              <Textarea
                placeholder="Опишите условия сотрудничества, порядок расчётов и т.д."
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={4}
              />
            </Box>

            <Box>
              <Text fontSize="sm" mb={1}>
                Срок действия партнёрства
              </Text>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              <Text fontSize="xs" color="fg.muted" mt={1}>
                Оставьте пустым для бессрочного партнёрства
              </Text>
            </Box>
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Кнопки */}
      <HStack justify="flex-end" gap={4}>
        <Button variant="outline" onClick={() => router.back()}>
          Отмена
        </Button>
        <Button colorPalette="brand" onClick={handleSubmit} loading={isSubmitting} disabled={!selectedSchool}>
          Отправить запрос
        </Button>
      </HStack>

      {/* Информация */}
      <Card.Root variant="subtle" bg="bg.muted">
        <Card.Body>
          <HStack gap={3}>
            <Badge colorPalette="blue">i</Badge>
            <Text fontSize="sm" color="fg.muted">
              После отправки запроса школа-партнёр получит уведомление и сможет принять или отклонить ваше предложение.
              Партнёрство станет активным после подтверждения.
            </Text>
          </HStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
