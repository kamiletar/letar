import { InstructorHeader } from '@/app/(instructor)/_components/instructor-header'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'

import { InviteForm } from './_components/invite-form'

export default function InviteStudentPage() {
  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        <InstructorHeader />

        <Box>
          <Heading size="xl">Пригласить ученика</Heading>
          <Text color="fg.muted" mt={2}>
            Создайте приглашение и покажите QR-код или отправьте ссылку
          </Text>
        </Box>

        <Box bg="bg.panel" p={6} borderRadius="lg" shadow="sm" borderWidth="1px">
          <InviteForm />
        </Box>
      </VStack>
    </Container>
  )
}
