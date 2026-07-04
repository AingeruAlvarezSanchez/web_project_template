import {beforeAll, describe, expect} from 'bun:test'
import {Hono} from 'hono'
import {sign} from 'hono/jwt'
import {authMiddleware} from './auth'

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret'
})

function testApp() {
  const app = new Hono()
  app.get('/protected', authMiddleware, (c) => c.json(c.var.user))
  return app
}

async function tokenFor(payload: Record<string, unknown>) {
  return sign(payload, process.env.JWT_SECRET!)
}

describe('authMiddleware', () => {
  test('rejects a request with no token', async () => {
    const res = await testApp().request('/protected')
    expect(res.status).toBe(401)
  })

  test('rejects a malformed token', async () => {
    const res = await testApp().request('/protected', {
      headers: { Authorization: 'Bearer not-a-jwt' },
    })
    expect(res.status).toBe(401)
  })

  test('rejects an expired token', async () => {
    const token = await tokenFor({ sub: 1, email: 'a@b.com', exp: Math.floor(Date.now() / 1000) - 10 })
    const res = await testApp().request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(401)
  })

  test('accepts a valid token via the Authorization header', async () => {
    const token = await tokenFor({ sub: 1, email: 'a@b.com', exp: Math.floor(Date.now() / 1000) + 60 })
    const res = await testApp().request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 1, email: 'a@b.com' })
  })

  test('accepts a valid token via the cookie', async () => {
    const token = await tokenFor({ sub: 2, email: 'c@d.com', exp: Math.floor(Date.now() / 1000) + 60 })
    const res = await testApp().request('/protected', {
      headers: { Cookie: `token=${token}` },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 2, email: 'c@d.com' })
  })
})
