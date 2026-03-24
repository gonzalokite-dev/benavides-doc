import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-change-in-production'
)

const SESSION_DURATION = 7 * 24 * 60 * 60 // 7 days in seconds

export interface SessionPayload extends JWTPayload {
  authenticated: boolean
}

export async function createToken(): Promise<string> {
  return await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, JWT_SECRET)
    return payload
  } catch {
    return null
  }
}

export function validatePassword(password: string): boolean {
  const teamPassword = process.env.TEAM_PASSWORD
  if (!teamPassword) {
    console.error('TEAM_PASSWORD env var not set')
    return false
  }
  return password === teamPassword
}
