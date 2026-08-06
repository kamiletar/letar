import { auth } from '@/lib/auth'
import { verifyPasskeyRegistration } from '@/lib/passkey/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { response: unknown; name?: string }
  try {
    body = (await request.json()) as { response: unknown; name?: string }
  } catch {
    return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 })
  }

  try {
    const passkeyData = await verifyPasskeyRegistration(
      session.user.id,
      body.response as Parameters<typeof verifyPasskeyRegistration>[1],
      body.name,
    )
    await prisma.passkey.create({ data: passkeyData })
    return NextResponse.json({ verified: true })
  } catch (error) {
    console.error('Ошибка верификации passkey:', error)
    const message = error instanceof Error ? error.message : 'Ошибка верификации'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
