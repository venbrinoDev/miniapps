import type { Server, Socket } from 'socket.io'
import type {
  ApprovalDecision,
  DeviceApprovalRequestPayload,
  DeviceApprovalResponsePayload,
  DeviceErrorResponse,
  DeviceRequest,
  DeviceResponse,
  ErrorCode,
  HostCapabilitiesChangedPayload,
  HostCapabilitiesUpdatePayload,
  HostRegisterPayload,
  SessionHelloPayload,
  SessionPairedPayload,
  SessionUnavailablePayload,
} from '@miniapps/protocol'
import { ApprovalStore } from './approval-store.js'
import { HostRegistry, type HostEntry } from './host-registry.js'
import { PairingManager } from './pairing-manager.js'
import { RequestRegistry } from './request-registry.js'
import { SessionManager, type SessionEntry } from './session-manager.js'

export interface AdapterConfig {
  approvalStorePath?: string
}

interface PendingApproval {
  hostSocketId: string
  scope: {
    miniAppId: string
    capability: DeviceRequest['capability']
    deviceId: string
    userId: string
  }
  resolve: (approved: boolean) => void
  timer: ReturnType<typeof setTimeout>
}

export class RequestRouter {
  private readonly hostRegistry = new HostRegistry()
  private readonly sessionManager = new SessionManager()
  private readonly pairingManager = new PairingManager()
  private readonly requestRegistry = new RequestRegistry()
  private readonly approvalStore: ApprovalStore
  private readonly pendingApprovals = new Map<string, PendingApproval>()

  constructor(
    private readonly io: Server,
    private readonly config: AdapterConfig = {},
  ) {
    this.approvalStore = new ApprovalStore(config.approvalStorePath)
  }

  async initialize(): Promise<void> {
    await this.approvalStore.load()
  }

  setup(): void {
    const hostNs = this.io.of('/host')
    const clientNs = this.io.of('/client')

    hostNs.on('connection', (socket) => this.handleHostConnection(socket))
    clientNs.on('connection', (socket) => this.handleClientConnection(socket))
  }

  private handleHostConnection(socket: Socket): void {
    socket.on('host.register', (payload: HostRegisterPayload) => {
      const host: HostEntry = {
        socketId: socket.id,
        deviceId: payload.deviceId,
        userId: payload.userId,
        capabilities: payload.capabilities,
        connectedAt: new Date(),
      }

      this.hostRegistry.register(host)
      socket.emit('host.registered', {
        deviceId: payload.deviceId,
        capabilities: payload.capabilities,
        success: true,
      })

      this.tryPairSessionsForUser(payload.userId)
    })

    socket.on('host.capabilities.update', (payload: HostCapabilitiesUpdatePayload) => {
      this.hostRegistry.updateCapabilities(socket.id, payload.capabilities)
      const affected = this.pairingManager.updateCapabilities(socket.id, payload.capabilities)
      for (const pairing of affected) {
        const payload: HostCapabilitiesChangedPayload = {
          sessionId: pairing.sessionId,
          deviceId: pairing.deviceId,
          capabilities: pairing.capabilities,
        }
        this.io.of('/client').to(pairing.clientSocketId).emit('host.capabilities.changed', payload)
      }
    })

    socket.on('device.response', (response: DeviceResponse) => {
      const record = this.requestRegistry.delete(response.requestId)
      if (!record) {
        return
      }
      this.io.of('/client').to(record.clientSocketId).emit('device.response', response)
    })

    socket.on('device.error', (error: DeviceErrorResponse) => {
      const record = this.requestRegistry.delete(error.requestId)
      if (!record) {
        return
      }
      this.io.of('/client').to(record.clientSocketId).emit('device.error', error)
    })

    socket.on('device.event', (event) => {
      const record = this.requestRegistry.get(event.requestId)
      if (!record) {
        return
      }
      this.io.of('/client').to(record.clientSocketId).emit('device.event', event)
    })

    socket.on('device.approval.response', (payload: DeviceApprovalResponsePayload) => {
      const pending = this.pendingApprovals.get(payload.requestId)
      if (!pending) {
        return
      }

      clearTimeout(pending.timer)
      this.pendingApprovals.delete(payload.requestId)

      if (payload.decision === 'allow-always') {
        this.approvalStore.record(pending.scope, payload.decision)
      }

      pending.resolve(payload.decision !== 'deny')
    })

    socket.on('disconnect', () => {
      this.handleHostDisconnect(socket.id)
    })
  }

  private handleClientConnection(socket: Socket): void {
    socket.on('session.hello', (payload: SessionHelloPayload) => {
      const session: SessionEntry = {
        socketId: socket.id,
        sessionId: payload.sessionId,
        miniAppId: payload.miniAppId,
        userId: payload.userId,
        desiredDeviceId: payload.desiredDeviceId,
        connectedAt: new Date(),
      }

      this.sessionManager.register(session)
      this.resolvePairing(session)
    })

    socket.on('device.request', async (request: DeviceRequest) => {
      await this.routeRequest(socket, request)
    })

    socket.on('disconnect', () => {
      this.sessionManager.unregister(socket.id)
      this.pairingManager.deleteByClientSocketId(socket.id)
      this.failRequests(
        this.requestRegistry.deleteByClientSocketId(socket.id),
        'NOT_PAIRED',
        'Client session disconnected before the request completed',
      )
    })
  }

  private resolvePairing(session: SessionEntry): void {
    const host = this.findHostForSession(session)
    if (!host) {
      this.emitSessionUnavailable(session, 'NO_DEVICE', session.desiredDeviceId
        ? `No paired device host is available for device "${session.desiredDeviceId}"`
        : 'No paired device host is available')
      return
    }

    this.pairingManager.set({
      sessionId: session.sessionId,
      userId: session.userId,
      deviceId: host.deviceId,
      clientSocketId: session.socketId,
      hostSocketId: host.socketId,
      capabilities: [...host.capabilities],
      pairedAt: new Date(),
    })

    const payload: SessionPairedPayload = {
      sessionId: session.sessionId,
      deviceId: host.deviceId,
      capabilities: host.capabilities,
    }
    this.io.of('/client').to(session.socketId).emit('session.paired', payload)
  }

  private tryPairSessionsForUser(userId: string): void {
    for (const session of this.sessionManager.getAllByUserId(userId)) {
      const current = this.pairingManager.getBySessionId(session.sessionId)
      if (current) {
        continue
      }
      this.resolvePairing(session)
    }
  }

  private findHostForSession(session: SessionEntry): HostEntry | undefined {
    if (session.desiredDeviceId) {
      const host = this.hostRegistry.getByDeviceId(session.desiredDeviceId)
      if (host?.userId === session.userId) {
        return host
      }
      return undefined
    }

    return this.hostRegistry.getAllByUserId(session.userId)[0]
  }

  private emitSessionUnavailable(
    session: SessionEntry,
    code: Extract<ErrorCode, 'NO_DEVICE' | 'NOT_PAIRED'>,
    message: string,
  ): void {
    this.pairingManager.deleteBySessionId(session.sessionId)
    const payload: SessionUnavailablePayload = {
      sessionId: session.sessionId,
      code,
      message,
      desiredDeviceId: session.desiredDeviceId,
    }
    this.io.of('/client').to(session.socketId).emit('session.unavailable', payload)
  }

  private async routeRequest(clientSocket: Socket, request: DeviceRequest): Promise<void> {
    const session = this.sessionManager.getBySocketId(clientSocket.id)
    if (!session || session.sessionId !== request.sessionId) {
      this.sendError(clientSocket, request, 'NOT_PAIRED', 'No active session found for this request')
      return
    }

    const pairing = this.pairingManager.getBySessionId(session.sessionId)
    if (!pairing) {
      this.sendError(clientSocket, request, 'NO_DEVICE', 'No paired device host is available')
      return
    }

    if (request.deviceId && request.deviceId !== pairing.deviceId) {
      this.sendError(clientSocket, request, 'NOT_PAIRED', 'Request targeted a device that is not paired to this session')
      return
    }

    if (!pairing.capabilities.includes(request.capability)) {
      this.sendError(clientSocket, request, 'CAPABILITY_UNAVAILABLE', `Host does not support "${request.capability}"`)
      return
    }

    const scope = {
      miniAppId: request.miniAppId,
      capability: request.capability,
      deviceId: pairing.deviceId,
      userId: pairing.userId,
    }

    const trusted = this.approvalStore.lookup(scope)
    const canForward = trusted?.decision === 'allow-always'
      ? true
      : await this.requestApproval(pairing.hostSocketId, request, scope)

    if (!canForward) {
      this.sendError(clientSocket, request, 'USER_DENIED', 'User denied the request')
      return
    }

    const routedRequest: DeviceRequest = {
      ...request,
      deviceId: pairing.deviceId,
      sessionId: pairing.sessionId,
      userId: pairing.userId,
    }

    this.requestRegistry.set({
      requestId: request.requestId,
      sessionId: pairing.sessionId,
      deviceId: pairing.deviceId,
      clientSocketId: pairing.clientSocketId,
      hostSocketId: pairing.hostSocketId,
      capability: request.capability,
      request: routedRequest,
    })

    this.io.of('/host').to(pairing.hostSocketId).emit('device.request', routedRequest)
  }

  private async requestApproval(
    hostSocketId: string,
    request: DeviceRequest,
    scope: PendingApproval['scope'],
  ): Promise<boolean> {
    const approvalPayload: DeviceApprovalRequestPayload = {
      requestId: request.requestId,
      miniAppId: request.miniAppId,
      capability: request.capability,
      reason: request.reason,
    }

    this.io.of('/host').to(hostSocketId).emit('device.approval.request', approvalPayload)

    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        this.pendingApprovals.delete(request.requestId)
        resolve(false)
      }, request.timeoutMs)

      this.pendingApprovals.set(request.requestId, {
        hostSocketId,
        scope,
        resolve,
        timer,
      })
    })
  }

  private sendError(
    socket: Socket,
    request: Pick<DeviceRequest, 'requestId' | 'capability'>,
    code: ErrorCode,
    message: string,
  ): void {
    const error: DeviceErrorResponse = {
      requestId: request.requestId,
      capability: request.capability,
      success: false,
      error: { code, message },
    }
    socket.emit('device.error', error)
  }

  private handleHostDisconnect(hostSocketId: string): void {
    const host = this.hostRegistry.getBySocketId(hostSocketId)
    if (!host) {
      return
    }

    this.hostRegistry.unregister(hostSocketId)

    for (const [requestId, pending] of this.pendingApprovals.entries()) {
      if (pending.hostSocketId !== hostSocketId) {
        continue
      }
      clearTimeout(pending.timer)
      this.pendingApprovals.delete(requestId)
      pending.resolve(false)
    }

    const requests = this.requestRegistry.deleteByHostSocketId(hostSocketId)
    this.failRequests(requests, 'HOST_ERROR', 'Device host disconnected before the request completed')

    const affectedPairings = this.pairingManager.deleteByHostSocketId(hostSocketId)
    for (const pairing of affectedPairings) {
      const session = this.sessionManager.getBySessionId(pairing.sessionId)
      if (!session) {
        continue
      }
      this.emitSessionUnavailable(session, 'NOT_PAIRED', `Paired device "${pairing.deviceId}" disconnected`)
      this.resolvePairing(session)
    }
  }

  private failRequests(
    requests: Array<{ request: DeviceRequest; clientSocketId: string }>,
    code: ErrorCode,
    message: string,
  ): void {
    for (const record of requests) {
      const clientSocket = this.io.of('/client').sockets.get(record.clientSocketId)
      if (!clientSocket) {
        continue
      }
      this.sendError(clientSocket, record.request, code, message)
    }
  }

  async shutdown(): Promise<void> {
    for (const pending of this.pendingApprovals.values()) {
      clearTimeout(pending.timer)
      pending.resolve(false)
    }
    this.pendingApprovals.clear()
    await this.approvalStore.flush()
  }
}
