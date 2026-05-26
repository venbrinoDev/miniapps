import { afterEach, describe, expect, it } from 'vitest'
import { io, type Socket } from 'socket.io-client'
import { existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { MiniAppsServer } from '../server.js'

function randomPort(): number {
  return 41000 + Math.floor(Math.random() * 2000)
}

async function connectHost(
  baseUrl: string,
  payload: { deviceId: string; userId: string; capabilities: string[] },
): Promise<Socket> {
  const socket = io(`${baseUrl}/host`, { transports: ['websocket'] })

  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      socket.emit('host.register', payload)
    })
    socket.on('host.registered', () => resolve())
    socket.on('connect_error', reject)
  })

  return socket
}

async function connectClient(
  baseUrl: string,
): Promise<Socket> {
  const socket = io(`${baseUrl}/client`, { transports: ['websocket'] })

  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => resolve())
    socket.on('connect_error', reject)
  })

  return socket
}

async function once<T = unknown>(socket: Socket, event: string): Promise<T> {
  return new Promise<T>((resolve) => {
    socket.once(event, (payload: T) => resolve(payload))
  })
}

describe('RequestRouter integration', () => {
  const sockets: Socket[] = []
  const servers: MiniAppsServer[] = []
  const files: string[] = []

  afterEach(async () => {
    for (const socket of sockets.splice(0)) {
      socket.disconnect()
    }
    for (const server of servers.splice(0)) {
      await server.stop()
    }
    for (const file of files.splice(0)) {
      if (existsSync(file)) {
        unlinkSync(file)
      }
    }
  })

  it('pairs sessions to explicit devices and routes responses by request ownership', async () => {
    const port = randomPort()
    const approvalStorePath = join('/tmp', `miniapps-approvals-${port}.json`)
    files.push(approvalStorePath)
    const server = new MiniAppsServer({ port, approvalStorePath })
    servers.push(server)
    await server.start()
    const baseUrl = `http://127.0.0.1:${port}`

    const host1 = await connectHost(baseUrl, {
      deviceId: 'dev-1',
      userId: 'user-1',
      capabilities: ['biometric.authenticate'],
    })
    const host2 = await connectHost(baseUrl, {
      deviceId: 'dev-2',
      userId: 'user-1',
      capabilities: ['biometric.authenticate'],
    })
    sockets.push(host1, host2)

    const client1 = await connectClient(baseUrl)
    const client2 = await connectClient(baseUrl)
    sockets.push(client1, client2)

    const client1Paired = once(client1, 'session.paired')
    const client2Paired = once(client2, 'session.paired')
    client1.emit('session.hello', {
      miniAppId: 'app-1',
      sessionId: 'sess-1',
      userId: 'user-1',
      desiredDeviceId: 'dev-1',
    })
    client2.emit('session.hello', {
      miniAppId: 'app-1',
      sessionId: 'sess-2',
      userId: 'user-1',
      desiredDeviceId: 'dev-2',
    })

    await expect(client1Paired).resolves.toMatchObject({ deviceId: 'dev-1' })
    await expect(client2Paired).resolves.toMatchObject({ deviceId: 'dev-2' })

    const host1Approval = once<{ requestId: string }>(host1, 'device.approval.request')
    const host2Approval = once<{ requestId: string }>(host2, 'device.approval.request')

    client1.emit('device.request', {
      requestId: 'req-1',
      miniAppId: 'app-1',
      sessionId: 'sess-1',
      userId: 'user-1',
      deviceId: 'dev-1',
      capability: 'biometric.authenticate',
      params: { reason: 'Verify 1' },
      reason: 'Verify 1',
      timeoutMs: 1000,
    })
    client2.emit('device.request', {
      requestId: 'req-2',
      miniAppId: 'app-1',
      sessionId: 'sess-2',
      userId: 'user-1',
      deviceId: 'dev-2',
      capability: 'biometric.authenticate',
      params: { reason: 'Verify 2' },
      reason: 'Verify 2',
      timeoutMs: 1000,
    })

    const host1RequestPromise = once<any>(host1, 'device.request')
    const host2RequestPromise = once<any>(host2, 'device.request')
    host1.emit('device.approval.response', { requestId: (await host1Approval).requestId, decision: 'allow-always' })
    host2.emit('device.approval.response', { requestId: (await host2Approval).requestId, decision: 'allow-always' })

    const host1Request = await host1RequestPromise
    const host2Request = await host2RequestPromise
    expect(host1Request.requestId).toBe('req-1')
    expect(host2Request.requestId).toBe('req-2')

    const client1Response = once<any>(client1, 'device.response')
    const client2Response = once<any>(client2, 'device.response')

    host2.emit('device.response', {
      requestId: 'req-2',
      capability: 'biometric.authenticate',
      success: true,
      result: { authenticated: true, host: 'dev-2' },
    })
    host1.emit('device.response', {
      requestId: 'req-1',
      capability: 'biometric.authenticate',
      success: true,
      result: { authenticated: true, host: 'dev-1' },
    })

    await expect(client1Response).resolves.toMatchObject({ requestId: 'req-1', result: { host: 'dev-1' } })
    await expect(client2Response).resolves.toMatchObject({ requestId: 'req-2', result: { host: 'dev-2' } })
  })

  it('consumes allow-once approvals after a single request', async () => {
    const port = randomPort()
    const approvalStorePath = join('/tmp', `miniapps-approvals-${port}.json`)
    files.push(approvalStorePath)
    const server = new MiniAppsServer({ port, approvalStorePath })
    servers.push(server)
    await server.start()
    const baseUrl = `http://127.0.0.1:${port}`

    const host = await connectHost(baseUrl, {
      deviceId: 'dev-1',
      userId: 'user-1',
      capabilities: ['biometric.authenticate'],
    })
    const client = await connectClient(baseUrl)
    sockets.push(host, client)
    const paired = once(client, 'session.paired')
    client.emit('session.hello', {
      miniAppId: 'app-1',
      sessionId: 'sess-1',
      userId: 'user-1',
      desiredDeviceId: 'dev-1',
    })
    await paired

    const firstApproval = once<any>(host, 'device.approval.request')
    client.emit('device.request', {
      requestId: 'req-1',
      miniAppId: 'app-1',
      sessionId: 'sess-1',
      userId: 'user-1',
      deviceId: 'dev-1',
      capability: 'biometric.authenticate',
      params: { reason: 'First' },
      reason: 'First',
      timeoutMs: 1000,
    })
    const firstDeviceRequest = once<any>(host, 'device.request')
    host.emit('device.approval.response', { requestId: (await firstApproval).requestId, decision: 'allow-once' })
    await firstDeviceRequest
    host.emit('device.response', {
      requestId: 'req-1',
      capability: 'biometric.authenticate',
      success: true,
      result: { authenticated: true },
    })
    await once(client, 'device.response')

    const secondApproval = once<any>(host, 'device.approval.request')
    client.emit('device.request', {
      requestId: 'req-2',
      miniAppId: 'app-1',
      sessionId: 'sess-1',
      userId: 'user-1',
      deviceId: 'dev-1',
      capability: 'biometric.authenticate',
      params: { reason: 'Second' },
      reason: 'Second',
      timeoutMs: 1000,
    })

    await expect(secondApproval).resolves.toMatchObject({ requestId: 'req-2' })
  })

  it('emits session.unavailable when no host can be paired', async () => {
    const port = randomPort()
    const approvalStorePath = join('/tmp', `miniapps-approvals-${port}.json`)
    files.push(approvalStorePath)
    const server = new MiniAppsServer({ port, approvalStorePath })
    servers.push(server)
    await server.start()
    const baseUrl = `http://127.0.0.1:${port}`

    const client = await connectClient(baseUrl)
    sockets.push(client)

    const unavailable = once(client, 'session.unavailable')
    client.emit('session.hello', {
      miniAppId: 'app-1',
      sessionId: 'sess-1',
      userId: 'user-1',
      desiredDeviceId: 'missing-device',
    })

    await expect(unavailable).resolves.toMatchObject({
      sessionId: 'sess-1',
      code: 'NO_DEVICE',
      desiredDeviceId: 'missing-device',
    })
  })

  it('returns a host error when the paired host disconnects during an inflight request', async () => {
    const port = randomPort()
    const approvalStorePath = join('/tmp', `miniapps-approvals-${port}.json`)
    files.push(approvalStorePath)
    const server = new MiniAppsServer({ port, approvalStorePath })
    servers.push(server)
    await server.start()
    const baseUrl = `http://127.0.0.1:${port}`

    const host = await connectHost(baseUrl, {
      deviceId: 'dev-1',
      userId: 'user-1',
      capabilities: ['biometric.authenticate'],
    })
    const client = await connectClient(baseUrl)
    sockets.push(host, client)
    const paired = once(client, 'session.paired')
    client.emit('session.hello', {
      miniAppId: 'app-1',
      sessionId: 'sess-1',
      userId: 'user-1',
      desiredDeviceId: 'dev-1',
    })
    await paired

    const approval = once<any>(host, 'device.approval.request')
    client.emit('device.request', {
      requestId: 'req-1',
      miniAppId: 'app-1',
      sessionId: 'sess-1',
      userId: 'user-1',
      deviceId: 'dev-1',
      capability: 'biometric.authenticate',
      params: { reason: 'Verify' },
      reason: 'Verify',
      timeoutMs: 1000,
    })
    const deviceRequest = once<any>(host, 'device.request')
    host.emit('device.approval.response', { requestId: (await approval).requestId, decision: 'allow-always' })
    await deviceRequest

    const errorPromise = once<any>(client, 'device.error')
    host.disconnect()

    await expect(errorPromise).resolves.toMatchObject({
      requestId: 'req-1',
      error: {
        code: 'HOST_ERROR',
      },
    })
  })
})
