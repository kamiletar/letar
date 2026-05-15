import { getStudentLicenses } from '@/app/(student)/my-profile/_actions/license.action'
import { getStudentProfile } from '@/app/(student)/my-profile/_actions/update-student-profile.action'
import { LicenseSection } from '@/app/(student)/my-profile/_components/license-section'
import { StudentProfileForm } from '@/app/(student)/my-profile/_components/student-profile-form'
import { getSession } from '@/lib/auth'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'

export default async function StudentProfilePage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const [profile, licenses] = await Promise.all([getStudentProfile(), getStudentLicenses()])

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        <Box>
          <Heading size="xl">Мой профиль</Heading>
          <Text color="fg.muted" mt={2}>
            Настройте ваш профиль ученика
          </Text>
        </Box>

        <Box bg="bg.panel" p={6} borderRadius="lg" shadow="sm" borderWidth="1px">
          <StudentProfileForm initialData={profile} />
        </Box>

        <LicenseSection initialLicenses={licenses} />
      </VStack>
    </Container>
  )
}
