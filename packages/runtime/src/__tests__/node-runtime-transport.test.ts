import { afterEach, describe, expect, it, vi } from 'vitest'
import { MiniAppError } from '@miniapps/protocol'
import { NodeRuntimeTransport } from '../node-runtime-transport.js'

describe('NodeRuntimeTransport', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
    delete process.env.JOVITA_PROVIDER_PROXY_BASE_URL
    delete process.env.JOVITA_GATEWAY_PORT
  })

  it('routes provider proxy requests through the local gateway contract', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ places: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    globalThis.fetch = fetchMock as typeof fetch

    const transport = new NodeRuntimeTransport({ baseUrl: 'http://127.0.0.1:18789' })
    const result = await transport.sendRequest({
      requestId: 'req-1',
      miniAppId: 'clientfinder',
      sessionId: 'session-1',
      userId: 'user-1',
      deviceId: '',
      capability: 'providerProxy.call',
      params: {
        providerId: 'serper',
        operationId: 'maps',
        body: { q: 'restaurants in lagos' },
      },
      reason: 'Search leads',
      timeoutMs: 1000,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:18789/runtime/provider-proxy/serper/maps',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    expect(result).toEqual({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { places: [] },
    })
  })

  it('rejects host-only capabilities', async () => {
    const transport = new NodeRuntimeTransport()
    await expect(
      transport.sendRequest({
        requestId: 'req-2',
        miniAppId: 'clientfinder',
        sessionId: 'session-1',
        userId: 'user-1',
        deviceId: '',
        capability: 'biometric.authenticate',
        params: { reason: 'Verify' },
        reason: 'Verify',
        timeoutMs: 1000,
      } as never),
    ).rejects.toMatchObject<Partial<MiniAppError>>({
      code: 'CAPABILITY_UNAVAILABLE',
    })
  })
})
