import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const SECRET_KEY = process.env.JWT_SECRET || 'pon-aqui-una-clave-secreta-larga'
const ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 // 7 días

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10)
}

export function verifyPassword(plain: string, hashed: string): boolean {
  return bcrypt.compareSync(plain, hashed)
}

export function createToken(userId: string): string {
  const payload = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRE_MINUTES * 60
  }
  return jwt.sign(payload, SECRET_KEY)
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, SECRET_KEY) as { sub: string }
    return payload.sub
  } catch {
    return null
  }
}

export function getUserIdFromRequest(req: Request): string | null {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.substring(7)
  return verifyToken(token)
}
