import { Container, Heading, Stack, Text } from '@chakra-ui/react'
import { LoginButton } from './_components/login-button'

export default function LoginPage() {
  return (
    <Container maxW="md" py={24}>
      <Stack gap={6} align="flex-start">
        <Heading asChild size="2xl">
          <h1>Блокнот Ками</h1>
        </Heading>
        <Text color="fg.muted">Личный блокнот. Заходить может только владелец.</Text>
        <LoginButton />
      </Stack>
    </Container>
  )
}
