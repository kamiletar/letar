'use client'

import type { RecipeType } from '@/generated/prisma/enums'
import { useDeleteRecipe, useFindManyRecipe } from '@/lib/hooks'
import { Badge, Box, Button, Card, Container, Flex, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'

/** Тип рецепта с included relations для списка */
interface RecipeWithRelations {
  id: string
  title: string
  portions: number
  tags: string[]
  components?: { id: string; title: string; weightGrams: number }[]
  info?: {
    base?: {
      type?: RecipeType
      rating?: number
    }
  }
}

export default function RecipesListPage() {
  const { data, isLoading, refetch } = useFindManyRecipe({
    include: {
      components: true,
      info: {
        include: {
          base: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  const deleteRecipe = useDeleteRecipe()

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Удалить рецепт "${title}"?`)) {
      return
    }

    await deleteRecipe.mutateAsync({ where: { id } })
    refetch()
  }

  if (isLoading) {
    return (
      <Container maxW="4xl" py="8">
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="xl" />
        </Flex>
      </Container>
    )
  }

  // Type assertion для included relations (ZenStack v3 не выводит типы из include)
  const recipes = (data ?? []) as RecipeWithRelations[]

  return (
    <Container maxW="4xl" py="8">
      <VStack gap={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading size="2xl">Рецепты</Heading>
          <Button asChild colorPalette="blue">
            <Link href="/recipes/new">Создать рецепт</Link>
          </Button>
        </Flex>

        {recipes.length === 0
          ? (
            <Box textAlign="center" py={10}>
              <Text color="gray.500" fontSize="lg">
                Нет рецептов. Создайте первый!
              </Text>
            </Box>
          )
          : (
            <VStack gap={4} align="stretch">
              {recipes.map((recipe) => (
                <Card.Root key={recipe.id}>
                  <Card.Body>
                    <Flex justify="space-between" align="start">
                      <VStack align="start" gap={2}>
                        <Heading size="md">{recipe.title}</Heading>
                        <HStack gap={2}>
                          <Badge colorPalette="blue">{recipe.portions} порций</Badge>
                          {recipe.info?.base?.type && (
                            <Badge colorPalette={recipe.info.base.type === 'SWEET' ? 'pink' : 'green'}>
                              {recipe.info.base.type === 'SWEET' ? 'Сладкое' : 'Солёное'}
                            </Badge>
                          )}
                          {recipe.info?.base?.rating && recipe.info.base.rating > 0 && (
                            <Badge colorPalette="yellow">Рейтинг: {recipe.info.base.rating}</Badge>
                          )}
                        </HStack>
                        {recipe.components && recipe.components.length > 0 && (
                          <Text fontSize="sm" color="gray.500">
                            {recipe.components.length} ингредиентов
                          </Text>
                        )}
                        {recipe.tags && recipe.tags.length > 0 && (
                          <HStack gap={1} flexWrap="wrap">
                            {recipe.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" size="sm">
                                {tag}
                              </Badge>
                            ))}
                          </HStack>
                        )}
                      </VStack>
                      <HStack gap={2}>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/recipes/${recipe.id}`}>Редактировать</Link>
                        </Button>
                        <Button
                          size="sm"
                          colorPalette="red"
                          variant="ghost"
                          onClick={() => handleDelete(recipe.id, recipe.title)}
                          loading={deleteRecipe.isPending}
                        >
                          Удалить
                        </Button>
                      </HStack>
                    </Flex>
                  </Card.Body>
                </Card.Root>
              ))}
            </VStack>
          )}
      </VStack>
    </Container>
  )
}
