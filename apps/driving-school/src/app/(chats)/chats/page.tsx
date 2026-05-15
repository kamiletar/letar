import { Box, Icon, Text, VStack } from '@chakra-ui/react'
import { LuMessageSquare } from 'react-icons/lu'

export default function ChatsPage() {
  return (
    <Box h="full" display="flex" alignItems="center" justifyContent="center">
      <VStack gap={4} color="fg.muted" textAlign="center" p={8}>
        <Icon fontSize="6xl" color="fg.muted">
          <LuMessageSquare />
        </Icon>
        <Text fontSize="lg" fontWeight="medium">
          Выберите чат
        </Text>
        <Text fontSize="sm">Выберите существующий чат из списка слева или создайте новый</Text>
      </VStack>
    </Box>
  )
}
