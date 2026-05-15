import { Skeleton, VStack } from '@chakra-ui/react'

export default function CoachLoading() {
  return (
    <VStack gap={6} align="stretch">
      <Skeleton h="32px" w="200px" />
      <Skeleton h="200px" borderRadius="xl" />
    </VStack>
  )
}
