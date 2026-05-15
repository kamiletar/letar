import { Box, Card, Heading, Stack, Text } from '@chakra-ui/react'
import { LetarAuthButton } from '../_components/LetarAuthButton'

export default function SignInPage() {
  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="bg" px={4}>
      <Card.Root maxW="md" w="full">
        <Card.Header>
          <Stack gap={1}>
            <Heading size="lg">Dashboard</Heading>
            <Text color="fg.muted">Войдите через единый аккаунт Letar</Text>
          </Stack>
        </Card.Header>
        <Card.Body>
          <LetarAuthButton />
        </Card.Body>
      </Card.Root>
    </Box>
  )
}
