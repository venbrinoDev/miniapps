import type {
  DeviceErrorResponse,
  DeviceEvent,
  DeviceResponse,
} from '@miniapps/protocol'
import type {
  BiometricNamespace,
  CameraNamespace,
  GpsNamespace,
  StorageNamespace,
} from './capabilities.js'
import {
  createBiometricNamespace,
  createCameraNamespace,
  createGpsNamespace,
  createStorageNamespace,
} from './capabilities.js'
import type { Transport } from './transport.js'

export interface MiniAppClientConfig {
  miniAppId: string
  sessionId: string
  userId: string
  deviceId?: string
  timeoutMs?: number
}

export class MiniAppClient {
  public readonly biometric: BiometricNamespace
  public readonly camera: CameraNamespace
  public readonly gps: GpsNamespace
  public readonly storage: StorageNamespace

  private config: Required<MiniAppClientConfig>

  constructor(transport: Transport, config: MiniAppClientConfig) {
    this.config = {
      ...config,
      deviceId: config.deviceId ?? '',
      timeoutMs: config.timeoutMs ?? 30_000,
    }

    const getCtx = () => ({
      miniAppId: this.config.miniAppId,
      sessionId: this.config.sessionId,
      userId: this.config.userId,
      deviceId: this.config.deviceId,
      timeoutMs: this.config.timeoutMs,
    })

    this.biometric = createBiometricNamespace(transport, getCtx)
    this.camera = createCameraNamespace(transport, getCtx)
    this.gps = createGpsNamespace(transport, getCtx)
    this.storage = createStorageNamespace(transport, getCtx)
  }
}
