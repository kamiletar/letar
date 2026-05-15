import { Center, Spinner } from '@chakra-ui/react'

export default function PublicLoading() {
  return (
    <Center py={20}>
      <Spinner size="xl" color="brand.solid" />
    </Center>
  )
}
