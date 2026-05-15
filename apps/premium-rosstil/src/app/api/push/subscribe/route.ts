import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  userAgent: z.string().optional(),
  deviceType: z.enum(['desktop', 'mobile', 'tablet']).optional(),
  preferences: z
    .object({
      newProducts: z.boolean().optional(),
      orderStatus: z.boolean().optional(),
      promotions: z.boolean().optional(),
      cartReminder: z.boolean().optional(),
    })
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = subscribeSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid subscription data', details: result.error.issues }, { status: 400 })
    }

    const { endpoint, keys, userAgent, deviceType, preferences } = result.data

    // Get current user (optional - anonymous subscriptions allowed)
    const session = await getSession()
    const userId = session?.user?.id || null

    // Upsert subscription
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId,
        userAgent,
        deviceType,
        newProducts: preferences?.newProducts ?? true,
        orderStatus: preferences?.orderStatus ?? true,
        promotions: preferences?.promotions ?? true,
        cartReminder: preferences?.cartReminder ?? true,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId, // Update userId if user logged in after subscribing
        userAgent,
        deviceType,
        ...(preferences && {
          newProducts: preferences.newProducts,
          orderStatus: preferences.orderStatus,
          promotions: preferences.promotions,
          cartReminder: preferences.cartReminder,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
    })
  } catch (error) {
    console.error('Push subscription error:', error)
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 })
    }

    await prisma.pushSubscription.delete({
      where: { endpoint },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push unsubscribe error:', error)
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }
}
