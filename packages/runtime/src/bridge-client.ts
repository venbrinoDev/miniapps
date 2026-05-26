import type {
  CapabilityId,
  DeviceErrorResponse,
  DeviceEvent,
  DeviceRequest,
  DeviceResponse,
  HostCapabilitiesChangedPayload,
  SessionPairedPayload,
  SessionUnavailablePayload,
} from '@miniapps/protocol'
import { MiniAppError } from '@miniapps/protocol'
import type { MiniAppManifest } from '@miniapps/manifest'
import { io, type Socket } from 'socket.io-client'
import { CapabilityGuard } from './capability-guard.js'

export type PairingState = 'connecting' | 'paired' | 'unavailable' | 'disconnected'

export interface BridgeClientConfig {
  url: string
  miniAppId: string
  sessionId: string
  userId: string
  deviceId?: string
  manifest: MiniAppManifest
  timeoutMs?: number
  pairingTimeoutMs?: number
  token?: string
}

export interface PairedDevice {
  deviceId: string
  capabilities: CapabilityId[]
}

export interface PairingResult {
  state: Extract<PairingState, 'paired' | 'unavailable'>
  sessionId: string
  deviceId?: string
  capabilities: CapabilityId[]
  code?: 'NO_DEVICE' | 'NOT_PAIRED'
  message?: string
}

interface PendingRequest {
  resolve: (result: unknown) => void
  reject: (error: MiniAppError) => void
  timer: ReturnType<typeof setTimeout>
}

export class BridgeClient {
  private readonly socket: Socket
  private readonly guard: CapabilityGuard
  private readonly pendingRequests = new Map<string, PendingRequest>()
  private readonly eventListeners = new Set<(event: DeviceEvent) => void>()
  private readonly timeoutMs: number
  private readonly pairingTimeoutMs: number
  private pairingState: PairingState = 'connecting'
  private pairedDevice: PairedDevice | null = null
  private unavailablePayload: SessionUnavailablePayload | null = null
  private pairingWaiters = new Set<{
    resolve: (result: PairingResult) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
  }>()

  constructor(private readonly config: BridgeClientConfig) {
    this.timeoutMs = config.timeoutMs ?? config.manifest.timeout ?? 30_000
    this.pairingTimeoutMs = config.pairingTimeoutMs ?? 10_000
    this.guard = new CapabilityGuard(config.manifest)

    const url = config.url.endsWith('/') ? `${config.url}client` : `${config.url}/client`
    this.socket = io(url, {
      auth: config.token ? { token: config.token } : undefined,
      transports: ['websocket'],
    })

    this.setupListeners()
  }

  private setupListeners(): void {
    this.socket.on('connect', () => {
      this.pairingState = 'connecting'
      this.unavailablePayload = null
      this.sendHello()
    })

    this.socket.on('disconnect', () => {
      this.pairingState = 'disconnected'
      this.pairedDevice = null
      this.unavailablePayload = null
    })

    this.socket.on('session.paired', (payload: SessionPairedPayload) => {
      this.pairingState = 'paired'
      this.unavailablePayload = null
      this.pairedDevice = {
        deviceId: payload.deviceId,
        capabilities: payload.capabilities,
      }
      this.resolvePairingWaiters({
        state: 'paired',
        sessionId: payload.sessionId,
        deviceId: payload.deviceId,
        capabilities: payload.capabilities,
      })
    })

    this.socket.on('session.unavailable', (payload: SessionUnavailablePayload) => {
      this.pairingState = 'unavailable'
      this.pairedDevice = null
      this.unavailablePayload = payload
      this.resolvePairingWaiters({
        state: 'unavailable',
        sessionId: payload.sessionId,
        capabilities: [],
        code: payload.code,
        message: payload.message,
      })
    })

    this.socket.on('host.capabilities.changed', (payload: HostCapabilitiesChangedPayload) => {
      if (this.pairedDevice?.deviceId !== payload.deviceId) {
        return
      }
      this.pairedDevice = {
        deviceId: payload.deviceId,
        capabilities: payload.capabilities,
      }
    })

    this.socket.on('device.response', (response: DeviceResponse) => {
      const pending = this.pendingRequests.get(response.requestId)
      if (!pending) {
        return
      }
      clearTimeout(pending.timer)
      this.pendingRequests.delete(response.requestId)
      pending.resolve(response.result)
    })

    this.socket.on('device.error', (error: DeviceErrorResponse) => {
      const pending = this.pendingRequests.get(error.requestId)
      if (!pending) {
        return
      }
      clearTimeout(pending.timer)
      this.pendingRequests.delete(error.requestId)
      pending.reject(new MiniAppError(error.error.code, error.error.message, error.requestId))
    })

    this.socket.on('device.event', (event: DeviceEvent) => {
      for (const listener of this.eventListeners) {
        listener(event)
      }
    })
  }

  async connect(): Promise<PairingResult> {
    if (!this.socket.connected) {
      await new Promise<void>((resolve, reject) => {
        const onConnect = () => {
          this.socket.off('connect_error', onError)
          resolve()
        }
        const onError = (err: Error) => {
          this.socket.off('connect', onConnect)
          reject(err)
        }
        this.socket.once('connect', onConnect)
        this.socket.once('connect_error', onError)
      })
    } else {
      this.sendHello()
    }

    return this.waitForPairing(this.pairingTimeoutMs)
  }

  async disconnect(): Promise<void> {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timer)
      pending.reject(new MiniAppError('NOT_PAIRED', 'Bridge client disconnected'))
    }
    this.pendingRequests.clear()
    this.rejectPairingWaiters(new MiniAppError('NOT_PAIRED', 'Bridge client disconnected'))
    this.socket.disconnect()
    this.pairingState = 'disconnected'
    this.pairedDevice = null
    this.unavailablePayload = null
  }

  async waitForPairing(timeoutMs = this.pairingTimeoutMs): Promise<PairingResult> {
    if (this.pairingState === 'paired' && this.pairedDevice) {
      return {
        state: 'paired',
        sessionId: this.config.sessionId,
        deviceId: this.pairedDevice.deviceId,
        capabilities: [...this.pairedDevice.capabilities],
      }
    }

    if (this.pairingState === 'unavailable' && this.unavailablePayload) {
      return {
        state: 'unavailable',
        sessionId: this.unavailablePayload.sessionId,
        capabilities: [],
        code: this.unavailablePayload.code,
        message: this.unavailablePayload.message,
      }
    }

    return new Promise<PairingResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pairingWaiters.delete(waiter)
        reject(new MiniAppError('TIMEOUT', `Pairing timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      const waiter = { resolve, reject, timer }
      this.pairingWaiters.add(waiter)
    })
  }

  getPairingState(): PairingState {
    return this.pairingState
  }

  getPairedDevice(): PairedDevice | null {
    return this.pairedDevice ? { ...this.pairedDevice, capabilities: [...this.pairedDevice.capabilities] } : null
  }

  async sendRequest<T = unknown>(request: DeviceRequest): Promise<T> {
    const pairedDevice = this.getPairedDevice()
    if (!pairedDevice) {
      const payload = this.unavailablePayload
      throw new MiniAppError(payload?.code ?? 'NO_DEVICE', payload?.message ?? 'No paired device host is available')
    }

    this.guard.checkHostCapability(request.capability, pairedDevice.capabilities)

    const normalizedRequest: DeviceRequest = {
      ...request,
      deviceId: pairedDevice.deviceId,
      sessionId: this.config.sessionId,
      userId: this.config.userId,
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(request.requestId)
        reject(new MiniAppError('TIMEOUT', `Request timed out after ${this.timeoutMs}ms`, request.requestId))
      }, this.timeoutMs)

      this.pendingRequests.set(request.requestId, {
        resolve: (result) => resolve(result as T),
        reject: (error) => reject(error),
        timer,
      })
      this.socket.emit('device.request', normalizedRequest)
    })
  }

  onDeviceEvent(listener: (event: DeviceEvent) => void): () => void {
    this.eventListeners.add(listener)
    return () => {
      this.eventListeners.delete(listener)
    }
  }

  private sendHello(): void {
    this.socket.emit('session.hello', {
      miniAppId: this.config.miniAppId,
      sessionId: this.config.sessionId,
      userId: this.config.userId,
      desiredDeviceId: this.config.deviceId,
    })
  }

  private resolvePairingWaiters(result: PairingResult): void {
    for (const waiter of this.pairingWaiters) {
      clearTimeout(waiter.timer)
      waiter.resolve(result)
    }
    this.pairingWaiters.clear()
  }

  private rejectPairingWaiters(error: Error): void {
    for (const waiter of this.pairingWaiters) {
      clearTimeout(waiter.timer)
      waiter.reject(error)
    }
    this.pairingWaiters.clear()
  }
}
