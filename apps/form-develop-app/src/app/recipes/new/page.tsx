import { Container, Heading, VStack } from '@chakra-ui/react'
import { RecipeForm } from '../_components/recipe-form'

export default function NewRecipePage() {
  return (
    <Container maxW="4xl" py="8">
      <VStack gap={6} align="stretch">
        <Heading size="2xl">Новый рецепт</Heading>
        <RecipeForm />
      </VStack>
    </Container>
  )
}
