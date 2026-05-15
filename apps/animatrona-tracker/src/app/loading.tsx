import { Box, Center, Spinner } from '@chakra-ui/react'

/** Глобальный loading fallback */
export default function Loading() {
  return (
    <Box minH="60vh">
      <Center h="60vh">
        <Spinner size="xl" colorPalette="brand" />
      </Center>
    </Box>
  )
}
