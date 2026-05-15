import { Box, Container, Text } from '@chakra-ui/react'

/** Футер сайта */
export function Footer() {
  return (
    <Box as="footer" py={8} borderTopWidth="1px" borderColor="border">
      <Container maxW="5xl" textAlign="center">
        <Text color="fg.subtle" fontSize="sm">
          &copy; {new Date().getFullYear()} Letar
        </Text>
      </Container>
    </Box>
  )
}
