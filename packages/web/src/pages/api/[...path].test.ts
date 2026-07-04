import {beforeEach, describe, expect, mock, test} from 'bun:test'

mock.module('astro:env/server', () => ({ INTERNAL_API_URL: 'http://internal-api.test' }))

const { ALL } = await import('./[...path]')

let calls: { url: string; init: RequestInit }[] = []

beforeEach(() => {
  calls = []
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: url.toString(), init: init ?? {} })
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
})

function call(path: string, requestInit?: RequestInit) {
  const url = new URL(`http://web.test/api/${path}`)
  const request = new Request(url, requestInit)
  return ALL({ params: { path: url.pathname.replace('/api/', '') }, request, url } as any)
}

describe('api proxy', () => {
  test('forwards the path and query string to the internal API', async () => {
    await call('auth/me?foo=bar')
    expect(calls[0].url).toBe('http://internal-api.test/auth/me?foo=bar')
  })

  test('forwards method and headers', async () => {
    await call('auth/login', {
      method: 'POST',
      headers: { Cookie: 'token=abc' },
    })
    expect(calls[0].init.method).toBe('POST')
    expect((calls[0].init.headers as Headers).get('cookie')).toBe('token=abc')
  })

  test('omits the body for GET requests', async () => {
    await call('auth/me')
    expect(calls[0].init.body).toBeUndefined()
  })

  test('forwards the body for non-GET requests', async () => {
    await call('auth/login', { method: 'POST', body: JSON.stringify({ email: 'a@b.com' }) })
    expect(calls[0].init.body).toBeInstanceOf(ArrayBuffer)
  })

  test('returns the upstream status and body', async () => {
    const res = await call('auth/me')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
