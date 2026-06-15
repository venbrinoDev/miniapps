import { describe, it, expect } from 'vitest'
import { MiniAppClient } from '../client.js'
import type { Transport, EventCallback } from '../transport.js'
import type {
  DeviceRequest,
} from '@miniapps/protocol'

function createMockTransport(): Transport & {
  lastRequest: DeviceRequest | null
  resolveLast: (result: unknown) => void
  rejectLast: (error: Error) => void
} {
  let lastRequest: DeviceRequest | null = null
  let resolve!: (result: unknown) => void
  let reject!: (error: Error) => void
  let eventListener: EventCallback | undefined

  const transport: Transport & {
    lastRequest: DeviceRequest | null
    resolveLast: (result: unknown) => void
    rejectLast: (error: Error) => void
  } = {
    get lastRequest() { return lastRequest },
    resolveLast: (result) => resolve(result),
    rejectLast: (error) => reject(error),
    sendRequest<T>(request: DeviceRequest): Promise<T> {
      lastRequest = request
      return new Promise<T>((res, rej) => {
        resolve = res as any
        reject = rej as any
      })
    },
    onDeviceEvent(listener: EventCallback): () => void {
      eventListener = listener
      return () => { eventListener = undefined }
    },
  }

  return transport
}

describe('MiniAppClient', () => {
  const defaultConfig = {
    miniAppId: 'test-app',
    sessionId: 'session-1',
    userId: 'user-1',
    deviceId: 'device-1',
  }

  it('creates namespaces', () => {
    const transport = createMockTransport()
    const client = new MiniAppClient(transport, defaultConfig)

    expect(client.biometric).toBeDefined()
    expect(client.camera).toBeDefined()
    expect(client.gps).toBeDefined()
    expect(client.storage).toBeDefined()
  })

  it('biometric.authenticate sends correct request', async () => {
    const transport = createMockTransport()
    const client = new MiniAppClient(transport, defaultConfig)

    const promise = client.biometric.authenticate({ reason: 'Verify' }).toPromise()

    expect(transport.lastRequest).toBeDefined()
    expect(transport.lastRequest!.capability).toBe('biometric.authenticate')
    expect(transport.lastRequest!.params).toEqual({ reason: 'Verify' })
    expect(transport.lastRequest!.miniAppId).toBe('test-app')
    expect(transport.lastRequest!.reason).toBe('Verify')

    transport.resolveLast({ authenticated: true })
    const result = await promise
    expect(result).toEqual({ authenticated: true })
  })

  it('camera.scanQr sends correct request', async () => {
    const transport = createMockTransport()
    const client = new MiniAppClient(transport, defaultConfig)

    const promise = client.camera.scanQr({ reason: 'Scan code' }).toPromise()

    expect(transport.lastRequest!.capability).toBe('camera.scanQr')
    expect(transport.lastRequest!.params).toEqual({ reason: 'Scan code' })

    transport.resolveLast({ content: 'https://example.com', format: 'qr' })
    const result = await promise
    expect(result).toEqual({ content: 'https://example.com', format: 'qr' })
  })

  it('gps.getCurrentPosition sends correct request', async () => {
    const transport = createMockTransport()
    const client = new MiniAppClient(transport, defaultConfig)

    const promise = client.gps.getCurrentPosition({ reason: 'Location', accuracy: 'high' }).toPromise()

    expect(transport.lastRequest!.capability).toBe('gps.getCurrentPosition')
    expect(transport.lastRequest!.params).toEqual({ reason: 'Location', accuracy: 'high' })

    transport.resolveLast({ latitude: 1.23, longitude: 4.56, accuracy: 10 })
    const result = await promise
    expect(result).toEqual({ latitude: 1.23, longitude: 4.56, accuracy: 10 })
  })

  it('storage.pickFile sends correct request', async () => {
    const transport = createMockTransport()
    const client = new MiniAppClient(transport, defaultConfig)

    const promise = client.storage.pickFile({ reason: 'Upload', types: ['image/*'] }).toPromise()

    expect(transport.lastRequest!.capability).toBe('storage.pickFile')
    expect(transport.lastRequest!.params).toEqual({ reason: 'Upload', types: ['image/*'] })

    transport.resolveLast({ uri: '/tmp/file.png', name: 'file.png', size: 1024, mimeType: 'image/png' })
    const result = await promise
    expect(result).toEqual({ uri: '/tmp/file.png', name: 'file.png', size: 1024, mimeType: 'image/png' })
  })

  it('generates unique requestIds', () => {
    const transport = createMockTransport()
    const client = new MiniAppClient(transport, defaultConfig)

    client.biometric.authenticate({ reason: 'A' }).toPromise()
    const id1 = transport.lastRequest!.requestId

    // Need a fresh transport to capture the second request independently
    const transport2 = createMockTransport()
    const client2 = new MiniAppClient(transport2, defaultConfig)
    client2.biometric.authenticate({ reason: 'B' }).toPromise()
    const id2 = transport2.lastRequest!.requestId

    expect(id1).not.toBe(id2)
  })

  it('uses configured timeoutMs', () => {
    const transport = createMockTransport()
    const client = new MiniAppClient(transport, { ...defaultConfig, timeoutMs: 5000 })

    client.biometric.authenticate({ reason: 'Test' }).toPromise()

    expect(transport.lastRequest!.timeoutMs).toBe(5000)
  })

  it('uses default 30s timeout when not configured', () => {
    const transport = createMockTransport()
    const client = new MiniAppClient(transport, defaultConfig)

    client.biometric.authenticate({ reason: 'Test' }).toPromise()

    expect(transport.lastRequest!.timeoutMs).toBe(30_000)
  })

  it('providers.call sends provider proxy requests', async () => {
    const transport = createMockTransport()
    const client = new MiniAppClient(transport, defaultConfig)

    const promise = client.providers.call({
      providerId: 'serper',
      operationId: 'maps',
      body: { q: 'restaurants in lagos' },
    }).toPromise()

    expect(transport.lastRequest!.capability).toBe('providerProxy.call')
    expect(transport.lastRequest!.params).toEqual({
      providerId: 'serper',
      operationId: 'maps',
      body: { q: 'restaurants in lagos' },
      reason: 'Provider proxy call serper/maps',
    })

    transport.resolveLast({ status: 200, data: { places: [] } })
    const result = await promise
    expect(result).toEqual({ status: 200, data: { places: [] } })
  })
})
