import type {Context} from 'hono'
import {Hono} from 'hono'
import {sign} from 'hono/jwt'
import {deleteCookie, setCookie} from 'hono/cookie'
import {eq} from 'drizzle-orm'
import {db} from '../db'
import {users} from '../db/schema'
import {authMiddleware} from '../middleware/auth'

const auth = new Hono()

async function issueToken(c: Context, user: { id: number; email: string }) {
  const token = await sign(
    { sub: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 },
    process.env.JWT_SECRET!,
  )
  setCookie(c, 'token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

auth.post('/register', async (c) => {
  const { email, password } = await c.req.json()
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: 'valid email required' }, 400)
  }
  if (typeof password !== 'string' || password.length < 8) {
    return c.json({ error: 'password must be at least 8 characters' }, 400)
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (existing) return c.json({ error: 'email already registered' }, 409)

  const passwordHash = await Bun.password.hash(password)
  const [user] = await db.insert(users).values({ email, passwordHash }).returning()

  await issueToken(c, user)
  return c.json({ id: user.id, email: user.email })
})

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json()
  const user = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (!user || !(await Bun.password.verify(password, user.passwordHash))) {
    return c.json({ error: 'invalid credentials' }, 401)
  }

  await issueToken(c, user)
  return c.json({ id: user.id, email: user.email })
})

auth.post('/logout', (c) => {
  deleteCookie(c, 'token', { path: '/' })
  return c.json({ ok: true })
})

auth.get('/me', authMiddleware, (c) => c.json(c.var.user))

export default auth
