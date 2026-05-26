import { beforeEach, describe, expect, it, vi } from 'vitest'

class MockSocket {
  connected = false
  private handlers = new Map<string, Set<(payload: any) => void>>()
  public readonly emitted: Array<{ event: string; payload: unknown }> = []

  on(event: string, handler: (payload: any) => void): this {
    const set = this.handlers.get(event) ?? new Set()
    set.add(handler)
    this.handlers.set(event, set)
    return this
  }

  once(event: string, handler: (payload: any) => void): this {
    const wrapped = (payload: any) => {
      this.off(event, wrapped)
      handler(payload)
    }
    return this.on(event, wrapped)
  }

  off(event: string, handler: (payload: any) => void): this {
    this.handlers.get(event)?.delete(handler)
    return this
  }

  emit(event: string, payload?: unknown): this {
    this.emitted.push({ event, payload })
    return this
  }

  disconnect(): this {
    this.connected = false
    this.trigger('disconnect')
    return this
  }

  trigger(event: string, payload?: unknown): void {
    if (event === 'connect') {
      this.connected = true
    }
    if (event === 'disconnect') {
      this.connected = false
    }
    for (const handler of this.handlers.get(event) ?? []) {
      handler(payload)
    }
  }
}

const sockets: MockSocket[] = []

vi.mock('socket.io-client', () => ({
  io: () => {
    const socket = new MockSocket()
    sockets.push(socket)
    return socket
  },
}))

import { BridgeClient } from '../bridge-client.js'

describe('BridgeClient', () => {
  const manifest = {
    id: 'test-app',
    name: 'Test App',
    version: '1.0.0',
    runtime: 'node' as const,
    entry: 'src/index.ts',
    requiredCapabilities: ['biometric.authenticate'],
    permissions: {
      'biometric.authenticate': { reason: 'Verify identity' },
    },
  }

  beforeEach(() => {
    sockets.length = 0
  })

  it('waits for session pairing before connect resolves', async () => {
    const client = new BridgeClient({
      url: 'http://localhost:3000',
      miniAppId: 'test-app',
      sessionId: 'session-1',
      userId: 'user-1',
      manifest,
    })

    const promise = client.connect()
    const socket = sockets.at(-1)!
    socket.trigger('connect')

    let resolved = false
    promise.then(() => {
      resolved = true
    })

    await Promise.resolve()
    expect(resolved).toBe(false)

    socket.trigger('session.paired', {
      sessionId: 'session-1',
      deviceId: 'device-1',
      capabilities: ['biometric.authenticate'],
    })

    await expect(promise).resolves.toEqual({
      state: 'paired',
      sessionId: 'session-1',
      deviceId: 'device-1',
      capabilities: ['biometric.authenticate'],
    })
  })

  it('returns unavailable pairing result when no device can be paired', async () => {
    const client = new BridgeClient({
      url: 'http://localhost:3000',
      miniAppId: 'test-app',
      sessionId: 'session-1',
      userId: 'user-1',
      manifest,
    })

    const promise = client.connect()
    const socket = sockets.at(-1)!
    socket.trigger('connect')
    socket.trigger('session.unavailable', {
      sessionId: 'session-1',
      code: 'NO_DEVICE',
      message: 'No paired device host is available',
    })

    await expect(promise).resolves.toEqual({
      state: 'unavailable',
      sessionId: 'session-1',
      capabilities: [],
      code: 'NO_DEVICE',
      message: 'No paired device host is available',
    })
    expect(client.getPairingState()).toBe('unavailable')
  })

  it('updates host capabilities after pairing', async () => {
    const client = new BridgeClient({
      url: 'http://localhost:3000',
      miniAppId: 'test-app',
      sessionId: 'session-1',
      userId: 'user-1',
      manifest,
    })

    const promise = client.connect()
    const socket = sockets.at(-1)!
    socket.trigger('connect')
    socket.trigger('session.paired', {
      sessionId: 'session-1',
      deviceId: 'device-1',
      capabilities: ['biometric.authenticate'],
    })
    await promise

    socket.trigger('host.capabilities.changed', {
      sessionId: 'session-1',
      deviceId: 'device-1',
      capabilities: ['biometric.authenticate', 'camera.scanQr'],
    })

    expect(client.getPairedDevice()).toEqual({
      deviceId: 'device-1',
      capabilities: ['biometric.authenticate', 'camera.scanQr'],
    })
  })

  it('uses the paired device id for outgoing requests', async () => {
    const client = new BridgeClient({
      url: 'http://localhost:3000',
      miniAppId: 'test-app',
      sessionId: 'session-1',
      userId: 'user-1',
      manifest,
    })

    const promise = client.connect()
    const socket = sockets.at(-1)!
    socket.trigger('connect')
    socket.trigger('session.paired', {
      sessionId: 'session-1',
      deviceId: 'device-99',
      capabilities: ['biometric.authenticate'],
    })
    await promise

    const requestPromise = client.sendRequest({
      requestId: 'req-1',
      miniAppId: 'test-app',
      sessionId: 'session-1',
      userId: 'user-1',
      deviceId: '',
      capability: 'biometric.authenticate',
      params: { reason: 'Verify' },
      reason: 'Verify',
      timeoutMs: 1000,
    })

    expect(socket.emitted.at(-1)).toEqual({
      event: 'device.request',
      payload: {
        requestId: 'req-1',
        miniAppId: 'test-app',
        sessionId: 'session-1',
        userId: 'user-1',
        deviceId: 'device-99',
        capability: 'biometric.authenticate',
        params: { reason: 'Verify' },
        reason: 'Verify',
        timeoutMs: 1000,
      },
    })

    socket.trigger('device.response', {
      requestId: 'req-1',
      capability: 'biometric.authenticate',
      success: true,
      result: { authenticated: true },
    })

    await expect(requestPromise).resolves.toEqual({ authenticated: true })
  })
})
