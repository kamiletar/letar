import { Center, Spinner } from '@chakra-ui/react'

export default function MatchLoading() {
  return (
    <Center minH="60vh">
      <Spinner size="xl" colorPalette="brand" />
    </Center>
  )
}
