import type {APIRoute} from 'astro'
import {INTERNAL_API_URL} from 'astro:env/server'

export const prerender = false

export const ALL: APIRoute = async ({ params, request, url }) => {
  const target = new URL(`/${params.path ?? ''}${url.search}`, INTERNAL_API_URL)

  const res = await fetch(target, {
    method: request.method,
    headers: request.headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
  })

  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  })
}

