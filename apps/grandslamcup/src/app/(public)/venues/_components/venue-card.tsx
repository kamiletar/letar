import { Badge, Box, Flex, Heading, Text } from '@chakra-ui/react'
import Link from 'next/link'

interface VenueCardProps {
  slug: string
  name: string
  cityName: string
  address: string | null
  teamNames: string[]
}

export function VenueCard({ slug, name, cityName, address, teamNames }: VenueCardProps) {
  return (
    <Link href={`/venues/${slug}`}>
      <Box
        bg="bg.panel"
        borderRadius="xl"
        p={5}
        borderWidth="1px"
        borderColor="border.muted"
        _hover={{ borderColor: 'border.emphasized', shadow: 'sm' }}
        transition="all 0.15s"
        h="full"
      >
        <Heading size="md" mb={2}>
          {name}
        </Heading>
        <Text fontSize="sm" color="fg.muted" mb={1}>
          {cityName}
        </Text>
        {address && (
          <Text fontSize="sm" color="fg.muted" mb={3}>
            {address}
          </Text>
        )}
        {teamNames.length > 0 && (
          <Flex gap={1} wrap="wrap">
            {teamNames.map((tn) => (
              <Badge key={tn} size="sm" colorPalette="blue">
                {tn}
              </Badge>
            ))}
          </Flex>
        )}
      </Box>
    </Link>
  )
}
