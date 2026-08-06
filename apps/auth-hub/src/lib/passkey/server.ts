/**
 * Серверная часть WebAuthn / Passkeys для Ключницы.
 *
 * Использует @simplewebauthn/server для верификации WebAuthn assertion/attestation.
 * Better Auth 1.6.x не включает passkey плагин, поэтому реализовано вручную.
 *
 * Эндпоинты (в api/passkey/route.ts):
 *   POST /api/passkey/register/options   — options для регистрации нового ключа
 *   POST /api/passkey/register/verify    — верификация регистрации
 *   POST /api/passkey/authenticate/options — options для входа по ключу
 *   POST /api/passkey/authenticate/verify  — верификация входа → создать сессию
 */

import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  PublicKeyCredentialDescriptorJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'

export const RP_ID = process.env.WEBAUTHN_RP_ID || 'letar.best'
export const RP_NAME = 'Ключница letar.best'
export const RP_ORIGIN = process.env.BETTER_AUTH_URL || 'https://auth.letar.best'

// Время жизни challenge (2 минуты)
const CHALLENGE_TTL_MS = 2 * 60 * 1000

// Временное хранилище challenges (in-memory; в prod достаточно для single-instance)
const challengeStore = new Map<string, { challenge: string; expiresAt: number }>()

function setChallenge(key: string, challenge: string): void {
  challengeStore.set(key, { challenge, expiresAt: Date.now() + CHALLENGE_TTL_MS })
}

export function getChallenge(key: string): string | null {
  const entry = challengeStore.get(key)
  if (!entry || Date.now() > entry.expiresAt) {
    challengeStore.delete(key)
    return null
  }
  return entry.challenge
}

export function deleteChallenge(key: string): void {
  challengeStore.delete(key)
}

// ========================================
// Регистрация
// ========================================

export async function generatePasskeyRegistrationOptions(userId: string, userName: string, userEmail: string) {
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: userEmail,
    userDisplayName: userName || userEmail,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
    // WebAuthn user handle = userId
    userID: new TextEncoder().encode(userId),
  })

  setChallenge(`reg:${userId}`, options.challenge)
  return options
}

export async function verifyPasskeyRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  deviceName?: string,
) {
  const expectedChallenge = getChallenge(`reg:${userId}`)
  if (!expectedChallenge) {
    throw new Error('Challenge не найден или истёк. Повторите регистрацию.')
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: RP_ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: false,
  })

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Верификация passkey не прошла')
  }

  deleteChallenge(`reg:${userId}`)

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

  return {
    id: credential.id,
    publicKey: Buffer.from(credential.publicKey),
    userId,
    webAuthnUserId: userId,
    counter: BigInt(credential.counter),
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    transports: credential.transports ? JSON.stringify(credential.transports) : null,
    name: deviceName || null,
  }
}

// ========================================
// Аутентификация
// ========================================

export async function generatePasskeyAuthenticationOptions(
  existingPasskeys: Array<{ id: string; transports: string | null }>,
) {
  const allowCredentials: PublicKeyCredentialDescriptorJSON[] = existingPasskeys.map((pk) => ({
    id: pk.id,
    type: 'public-key' as const,
    transports: pk.transports ? (JSON.parse(pk.transports) as AuthenticatorTransportFuture[]) : undefined,
  }))

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials,
    userVerification: 'preferred',
  })

  // challenge хранится по временному ключу (до verify знаем только credentialId)
  setChallenge(`auth:${options.challenge}`, options.challenge)
  return options
}

export async function verifyPasskeyAuthentication(
  response: AuthenticationResponseJSON,
  passkey: {
    id: string
    publicKey: Buffer
    counter: bigint
    transports: string | null
  },
) {
  const expectedChallenge = getChallenge(`auth:${response.response.clientDataJSON}`)
    // Декодируем clientDataJSON для получения challenge
    ?? (() => {
      try {
        const decoded = JSON.parse(Buffer.from(response.response.clientDataJSON, 'base64url').toString())
        return getChallenge(`auth:${decoded.challenge}`)
      } catch {
        return null
      }
    })()

  if (!expectedChallenge) {
    throw new Error('Challenge не найден или истёк.')
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: RP_ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: false,
    credential: {
      id: passkey.id,
      publicKey: new Uint8Array(passkey.publicKey),
      counter: Number(passkey.counter),
      transports: passkey.transports ? (JSON.parse(passkey.transports) as AuthenticatorTransportFuture[]) : undefined,
    },
  })

  if (!verification.verified) {
    throw new Error('Passkey аутентификация не прошла')
  }

  deleteChallenge(`auth:${expectedChallenge}`)

  return {
    newCounter: BigInt(verification.authenticationInfo.newCounter),
  }
}
