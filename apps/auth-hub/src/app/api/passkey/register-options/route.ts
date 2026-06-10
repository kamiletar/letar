import { auth } from '@/lib/auth'
import { generatePasskeyRegistrationOptions } from '@/lib/passkey/server'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const options = await generatePasskeyRegistrationOptions(
      session.user.id,
      session.user.name ?? '',
      session.user.email,
    )
    return NextResponse.json(options)
  } catch (error) {
    console.error('Ошибка генерации passkey options:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
