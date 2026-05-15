import { Container, Heading, VStack } from '@chakra-ui/react'
import { RecipeForm } from '../_components/recipe-form'

interface EditRecipePageProps {
  params: Promise<{ id: string }>
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const { id } = await params

  return (
    <Container maxW="4xl" py="8">
      <VStack gap={6} align="stretch">
        <Heading size="2xl">Редактирование рецепта</Heading>
        <RecipeForm recipeId={id} />
      </VStack>
    </Container>
  )
}
