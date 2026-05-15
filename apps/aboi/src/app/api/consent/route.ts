import { auth } from '@/lib/auth'
import { prismaAuth } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { z } from 'zod/v4'

const ConsentSchema = z
  .object({
    acceptedAnalytics: z.boolean(),
    acceptedMarketing: z.boolean(),
    acceptedFunctional: z.boolean(),
    consentVersion: z.string().min(1).max(20),
  })
  .strip()

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = ConsentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const session = await auth.api.getSession({ headers: request.headers })
  const ipRaw = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip')
    ?? 'unknown'
  const ipHash = createHash('sha256').update(ipRaw).digest('hex')
  const userAgent = request.headers.get('user-agent') ?? null

  await prismaAuth.consentLog.create({
    data: {
      userId: session?.user?.id ?? null,
      ipHash,
      userAgent,
      acceptedAnalytics: parsed.data.acceptedAnalytics,
      acceptedMarketing: parsed.data.acceptedMarketing,
      acceptedFunctional: parsed.data.acceptedFunctional,
      consentVersion: parsed.data.consentVersion,
    },
  })

  return NextResponse.json({ ok: true })
}
