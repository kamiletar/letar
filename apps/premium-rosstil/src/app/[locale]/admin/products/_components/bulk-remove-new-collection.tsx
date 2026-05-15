'use client'

import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValueText } from '@/app/_components/ui/select'
import { toaster } from '@/app/_components/ui/toaster'
import { Button, createListCollection, HStack, Text, VStack } from '@chakra-ui/react'
import { useState, useTransition } from 'react'
import { LuSparkles } from 'react-icons/lu'
import { bulkRemoveNewCollection } from '../_actions/toggle-new-collection'

interface Category {
  id: string
  name: string
}

interface BulkRemoveNewCollectionProps {
  categories: Category[]
  newCollectionCount: number
}

const daysOptions = createListCollection({
  items: [
    { value: '30', label: 'Старше 30 дней' },
    { value: '60', label: 'Старше 60 дней' },
    { value: '90', label: 'Старше 90 дней (3 месяца)' },
    { value: '180', label: 'Старше 180 дней (6 месяцев)' },
    { value: 'all', label: 'Все новинки' },
  ],
})

/**
 * Компонент для массового снятия флага "Новая коллекция"
 */
export function BulkRemoveNewCollection({ categories, newCollectionCount }: BulkRemoveNewCollectionProps) {
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  const categoryCollection = createListCollection({
    items: [{ value: '', label: 'Любая категория' }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
  })

  const handleBulkRemove = () => {
    if (!selectedDays.length || selectedDays[0] === '') {
      toaster.error({
        title: 'Выберите фильтр',
        description: 'Укажите, какие продукты нужно обработать',
      })
      return
    }

    const daysValue = selectedDays[0]
    const categoryValue = selectedCategory[0]

    // Подтверждение
    const filterDescription =
      daysValue === 'all'
        ? 'со ВСЕХ продуктов'
        : `с продуктов старше ${daysValue} дней${categoryValue ? ' в выбранной категории' : ''}`

    if (!confirm(`Снять флаг "Новая коллекция" ${filterDescription}?`)) {
      return
    }

    startTransition(async () => {
      try {
        const result = await bulkRemoveNewCollection({
          olderThanDays: daysValue === 'all' ? undefined : parseInt(daysValue),
          categoryId: categoryValue || undefined,
          all: daysValue === 'all',
        })

        if (result.count === 0) {
          toaster.info({
            title: 'Нет подходящих продуктов',
            description: 'Не найдено продуктов, соответствующих фильтрам',
          })
        } else {
          toaster.success({
            title: 'Готово',
            description: `Флаг новинки снят с ${result.count} продуктов`,
          })
        }

        // Сбрасываем фильтры
        setSelectedDays([])
        setSelectedCategory([])
      } catch (error) {
        toaster.error({
          title: 'Ошибка',
          description: error instanceof Error ? error.message : 'Не удалось выполнить операцию',
        })
      }
    })
  }

  if (newCollectionCount === 0) {
    return null
  }

  return (
    <VStack align="stretch" gap={3} p={4} bg="yellow.subtle" borderRadius="md">
      <HStack gap={2}>
        <LuSparkles />
        <Text fontWeight="medium">
          Новинок: {newCollectionCount} {newCollectionCount === 1 ? 'продукт' : 'продуктов'}
        </Text>
      </HStack>

      <HStack gap={3} flexWrap="wrap">
        <SelectRoot
          collection={daysOptions}
          value={selectedDays}
          onValueChange={(e: { value: string[] }) => setSelectedDays(e.value)}
          size="sm"
          width="200px"
        >
          <SelectTrigger>
            <SelectValueText placeholder="Выберите период" />
          </SelectTrigger>
          <SelectContent>
            {daysOptions.items.map((item) => (
              <SelectItem key={item.value} item={item}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>

        {categories.length > 0 && (
          <SelectRoot
            collection={categoryCollection}
            value={selectedCategory}
            onValueChange={(e: { value: string[] }) => setSelectedCategory(e.value)}
            size="sm"
            width="180px"
          >
            <SelectTrigger>
              <SelectValueText placeholder="Категория" />
            </SelectTrigger>
            <SelectContent>
              {categoryCollection.items.map((item) => (
                <SelectItem key={item.value} item={item}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectRoot>
        )}

        <Button
          size="sm"
          variant="outline"
          colorPalette="yellow"
          onClick={handleBulkRemove}
          loading={isPending}
          disabled={!selectedDays.length || selectedDays[0] === ''}
        >
          Снять флаг новинки
        </Button>
      </HStack>
    </VStack>
  )
}
