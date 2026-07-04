import {afterAll, describe, expect} from 'bun:test'
import {eq} from 'drizzle-orm'
import auth from './auth'
import {db} from '../db'
import {users} from '../db/schema'

process.env.JWT_SECRET ??= 'test-secret'

const json = { 'Content-Type': 'application/json' }
const uniqueEmail = () => `test-${crypto.randomUUID()}@example.com`
const createdEmails: string[] = []

function register(email: string, password = 'password123') {
  createdEmails.push(email)
  return auth.request('/register', { method: 'POST', headers: json, body: JSON.stringify({ email, password }) })
}

afterAll(async () => {
  for (const email of createdEmails) await db.delete(users).where(eq(users.email, email))
})

describe('POST /register', () => {
  test('creates a user and sets an auth cookie', async () => {
    const email = uniqueEmail()
    const res = await register(email)
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain('token=')
    expect(await res.json()).toMatchObject({ email })
  })

  test('rejects an invalid email', async () => {
    const res = await auth.request('/register', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ email: 'not-an-email', password: 'password123' }),
    })
    expect(res.status).toBe(400)
  })

  test('rejects a short password', async () => {
    const res = await auth.request('/register', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ email: uniqueEmail(), password: 'short' }),
    })
    expect(res.status).toBe(400)
  })

  test('rejects a duplicate email', async () => {
    const email = uniqueEmail()
    await register(email)
    const res = await register(email)
    expect(res.status).toBe(409)
  })
})

describe('POST /login', () => {
  test('succeeds with correct credentials', async () => {
    const email = uniqueEmail()
    await register(email)
    const res = await auth.request('/login', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ email, password: 'password123' }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain('token=')
  })

  test('rejects the wrong password', async () => {
    const email = uniqueEmail()
    await register(email)
    const res = await auth.request('/login', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ email, password: 'wrong-password' }),
    })
    expect(res.status).toBe(401)
  })

  test('rejects an unknown email', async () => {
    const res = await auth.request('/login', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ email: uniqueEmail(), password: 'password123' }),
    })
    expect(res.status).toBe(401)
  })
})

describe('POST /logout', () => {
  test('clears the auth cookie', async () => {
    const res = await auth.request('/logout', { method: 'POST' })
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toMatch(/token=;/)
  })
})

describe('GET /me', () => {
  test('requires authentication', async () => {
    const res = await auth.request('/me')
    expect(res.status).toBe(401)
  })

  test('returns the current user when authenticated', async () => {
    const email = uniqueEmail()
    const registerRes = await register(email)
    const token = registerRes.headers.get('set-cookie')!.match(/token=([^;]+)/)![1]
    const res = await auth.request('/me', { headers: { Cookie: `token=${token}` } })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ email })
  })
})
