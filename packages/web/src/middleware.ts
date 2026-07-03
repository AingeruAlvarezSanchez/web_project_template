import {defineMiddleware} from 'astro:middleware'

export const onRequest = defineMiddleware(async (_ctx, next) => {
  const res = await next()
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return res
})
