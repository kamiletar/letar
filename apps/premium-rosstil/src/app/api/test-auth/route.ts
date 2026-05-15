import { SignJWT } from 'jose'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// ВАЖНО: Этот endpoint доступен только в development/test окружении
export async function POST(request: NextRequest) {
  // Блокируем доступ в production
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_TEST_AUTH) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const { role } = await request.json()

    // Валидация роли
    if (!role || !['USER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be USER or ADMIN' }, { status: 400 })
    }

    // Создаем тестового пользователя
    const testUser = {
      id: role === 'ADMIN' ? 'test-admin-id' : 'test-user-id',
      email: role === 'ADMIN' ? 'admin@test.com' : 'user@test.com',
      name: role === 'ADMIN' ? 'Test Admin' : 'Test User',
      role: role,
      image: null,
    }

    // Создаем JWT токен для Auth.js
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'development-secret-key-for-testing')

    const token = await new SignJWT({
      sub: testUser.id,
      email: testUser.email,
      name: testUser.name,
      role: testUser.role,
      picture: testUser.image,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret)

    return NextResponse.json({
      token,
      user: testUser,
      message: 'Test authentication successful',
    })
  } catch (error) {
    console.error('Test auth error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET endpoint для проверки доступности
export async function GET() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_TEST_AUTH) {
    return NextResponse.json({ available: false, reason: 'Disabled in production' }, { status: 403 })
  }

  return NextResponse.json({
    available: true,
    environment: process.env.NODE_ENV,
    message: 'Test authentication endpoint is available',
  })
}
