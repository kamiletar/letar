import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { z } from 'zod/v4'

const ConsentSchema = z
  .object({
    necessary: z.literal(true),
    analytics: z.boolean(),
    marketing: z.boolean(),
    version: z.string().min(1).max(20),
    acceptedAt: z.string(),
  })
  .strip()

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = ConsentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const session = await getSession()
  const ipRaw = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'
  const ipHash = createHash('sha256').update(ipRaw).digest('hex')
  const userAgent = request.headers.get('user-agent') ?? null

  await prisma.consentLog.create({
    data: {
      userId: session?.user?.id ?? null,
      ipHash,
      userAgent,
      acceptedAnalytics: parsed.data.analytics,
      acceptedMarketing: parsed.data.marketing,
      acceptedFunctional: true,
      consentVersion: parsed.data.version,
    },
  })

  return NextResponse.json({ ok: true })
}
