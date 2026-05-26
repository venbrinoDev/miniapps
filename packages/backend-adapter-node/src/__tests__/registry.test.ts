import { afterEach, describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { existsSync, unlinkSync } from 'node:fs'
import { ApprovalStore } from '../approval-store.js'
import { HostRegistry } from '../host-registry.js'
import { PairingManager } from '../pairing-manager.js'
import { RequestRegistry } from '../request-registry.js'
import { SessionManager } from '../session-manager.js'

describe('HostRegistry', () => {
  it('registers and retrieves hosts by socket and device id', () => {
    const registry = new HostRegistry()
    registry.register({
      socketId: 'sock-1',
      deviceId: 'dev-1',
      userId: 'user-1',
      capabilities: ['biometric.authenticate'],
      connectedAt: new Date(),
    })

    expect(registry.getBySocketId('sock-1')?.deviceId).toBe('dev-1')
    expect(registry.getByDeviceId('dev-1')?.socketId).toBe('sock-1')
  })

  it('returns all hosts for a user in newest-first order', () => {
    const registry = new HostRegistry()
    registry.register({
      socketId: 'sock-1',
      deviceId: 'dev-1',
      userId: 'user-1',
      capabilities: [],
      connectedAt: new Date('2025-01-01T00:00:00.000Z'),
    })
    registry.register({
      socketId: 'sock-2',
      deviceId: 'dev-2',
      userId: 'user-1',
      capabilities: [],
      connectedAt: new Date('2025-01-01T00:00:01.000Z'),
    })

    expect(registry.getAllByUserId('user-1').map((host) => host.deviceId)).toEqual(['dev-2', 'dev-1'])
  })
})

describe('SessionManager', () => {
  it('registers sessions with desired device ids', () => {
    const manager = new SessionManager()
    manager.register({
      socketId: 'sock-1',
      sessionId: 'sess-1',
      miniAppId: 'app-1',
      userId: 'user-1',
      desiredDeviceId: 'dev-1',
      connectedAt: new Date(),
    })

    expect(manager.getBySessionId('sess-1')?.desiredDeviceId).toBe('dev-1')
  })

  it('returns all sessions for a user in newest-first order', () => {
    const manager = new SessionManager()
    manager.register({
      socketId: 'sock-1',
      sessionId: 'sess-1',
      miniAppId: 'app-1',
      userId: 'user-1',
      connectedAt: new Date('2025-01-01T00:00:00.000Z'),
    })
    manager.register({
      socketId: 'sock-2',
      sessionId: 'sess-2',
      miniAppId: 'app-2',
      userId: 'user-1',
      connectedAt: new Date('2025-01-01T00:00:01.000Z'),
    })

    expect(manager.getAllByUserId('user-1').map((session) => session.sessionId)).toEqual(['sess-2', 'sess-1'])
  })
})

describe('PairingManager', () => {
  it('stores and updates pairings', () => {
    const manager = new PairingManager()
    manager.set({
      sessionId: 'sess-1',
      userId: 'user-1',
      deviceId: 'dev-1',
      clientSocketId: 'client-1',
      hostSocketId: 'host-1',
      capabilities: ['biometric.authenticate'],
      pairedAt: new Date(),
    })

    expect(manager.getBySessionId('sess-1')?.deviceId).toBe('dev-1')
    manager.updateCapabilities('host-1', ['camera.scanQr'])
    expect(manager.getBySessionId('sess-1')?.capabilities).toEqual(['camera.scanQr'])
  })
})

describe('RequestRegistry', () => {
  it('tracks inflight requests by request id', () => {
    const registry = new RequestRegistry()
    registry.set({
      requestId: 'req-1',
      sessionId: 'sess-1',
      deviceId: 'dev-1',
      clientSocketId: 'client-1',
      hostSocketId: 'host-1',
      capability: 'biometric.authenticate',
      request: {
        requestId: 'req-1',
        miniAppId: 'app-1',
        sessionId: 'sess-1',
        userId: 'user-1',
        deviceId: 'dev-1',
        capability: 'biometric.authenticate',
        params: { reason: 'Verify' },
        reason: 'Verify',
        timeoutMs: 1000,
      },
    })

    expect(registry.get('req-1')?.hostSocketId).toBe('host-1')
    expect(registry.delete('req-1')?.clientSocketId).toBe('client-1')
    expect(registry.get('req-1')).toBeUndefined()
  })
})

describe('ApprovalStore', () => {
  const testFile = join('/tmp', `test-approvals-${Date.now()}.json`)

  afterEach(() => {
    if (existsSync(testFile)) unlinkSync(testFile)
  })

  it('persists allow-always approvals', async () => {
    const store = new ApprovalStore(testFile)
    await store.load()

    const scope = {
      miniAppId: 'app',
      capability: 'biometric.authenticate' as const,
      deviceId: 'dev',
      userId: 'user',
    }

    store.record(scope, 'allow-always')
    await store.flush()

    const found = store.lookup(scope)
    expect(found?.decision).toBe('allow-always')
  })

  it('does not persist allow-once approvals', async () => {
    const store = new ApprovalStore(testFile)
    await store.load()

    const scope = {
      miniAppId: 'app',
      capability: 'biometric.authenticate' as const,
      deviceId: 'dev',
      userId: 'user',
    }

    store.record(scope, 'allow-once')
    await store.flush()

    expect(store.lookup(scope)).toBeUndefined()
  })
})
