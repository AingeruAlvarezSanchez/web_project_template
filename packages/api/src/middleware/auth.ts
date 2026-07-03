import {createMiddleware} from 'hono/factory'
import {verify} from 'hono/jwt'
import {getCookie} from 'hono/cookie'

export const authMiddleware = createMiddleware<{
  Variables: { user: { id: number; email: string } }
}>(async (c, next) => {
  const token = getCookie(c, 'token') ?? c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const payload = await verify(token, process.env.JWT_SECRET!)
    c.set('user', { id: payload.sub as number, email: payload.email as string })
    await next()
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }
})
