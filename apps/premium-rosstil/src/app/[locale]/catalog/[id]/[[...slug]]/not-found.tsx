import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'

export default function ProductNotFound() {
  return (
    <Container maxW="2xl" py={16}>
      <VStack gap={6} textAlign="center">
        <Heading size="3xl" textTransform="none">
          Продукт не найден
        </Heading>
        <Text fontSize="lg" color="fg.muted">
          К сожалению, запрашиваемый продукт не найден в каталоге.
        </Text>
        <Box mt={4}>
          <Button asChild colorPalette="fg" size="lg">
            <NextLink href="/catalog">Вернуться к каталогу</NextLink>
          </Button>
        </Box>
      </VStack>
    </Container>
  )
}
