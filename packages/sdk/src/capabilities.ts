import type {
  BiometricAuthenticateParams,
  CameraCaptureParams,
  CameraScanQrParams,
  CapabilityId,
  CapabilityParamMap,
  CapabilityResultMap,
  DeviceRequest,
  GpsGetCurrentPositionParams,
  ProviderProxyCallParams,
  StoragePickFileParams,
} from '@miniapps/protocol'
import type { Transport } from './transport.js'

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

interface CapabilityRequestBuilder<TCapability extends CapabilityId> {
  onComplete(cb: (result: CapabilityResultMap[TCapability]) => void): CapabilityRequestBuilder<TCapability>
  onError(cb: (error: Error) => void): CapabilityRequestBuilder<TCapability>
  toPromise(): Promise<CapabilityResultMap[TCapability]>
}

class CapabilityRequestBuilderImpl<TCapability extends CapabilityId>
  implements CapabilityRequestBuilder<TCapability>
{
  private completeCb?: (result: CapabilityResultMap[TCapability]) => void
  private errorCb?: (error: Error) => void

  constructor(
    private transport: Transport,
    private requestId: string,
    private capability: TCapability,
    private params: CapabilityParamMap[TCapability],
    private miniAppId: string,
    private sessionId: string,
    private userId: string,
    private deviceId: string,
    private reason: string,
    private timeoutMs: number,
  ) {}

  onComplete(cb: (result: CapabilityResultMap[TCapability]) => void): this {
    this.completeCb = cb
    return this
  }

  onError(cb: (error: Error) => void): this {
    this.errorCb = cb
    return this
  }

  toPromise(): Promise<CapabilityResultMap[TCapability]> {
    const request = this.buildRequest()
    const promise = this.transport.sendRequest<CapabilityResultMap[TCapability]>(request)
    promise.then(this.completeCb, this.errorCb)
    return promise
  }

  private buildRequest(): DeviceRequest<TCapability> {
    return {
      requestId: this.requestId,
      miniAppId: this.miniAppId,
      sessionId: this.sessionId,
      userId: this.userId,
      deviceId: this.deviceId,
      capability: this.capability,
      params: this.params,
      reason: this.reason,
      timeoutMs: this.timeoutMs,
    }
  }
}

function createCapabilityMethod<TCapability extends CapabilityId>(
  transport: Transport,
  capability: TCapability,
  getCtx: () => { miniAppId: string; sessionId: string; userId: string; deviceId: string; timeoutMs: number },
) {
  return (params: CapabilityParamMap[TCapability] & { reason: string }): CapabilityRequestBuilder<TCapability> => {
    const ctx = getCtx()
    const requestId = generateRequestId()
    return new CapabilityRequestBuilderImpl(
      transport,
      requestId,
      capability,
      params,
      ctx.miniAppId,
      ctx.sessionId,
      ctx.userId,
      ctx.deviceId,
      params.reason,
      ctx.timeoutMs,
    )
  }
}

export interface BiometricNamespace {
  authenticate(params: BiometricAuthenticateParams): CapabilityRequestBuilder<'biometric.authenticate'>
}

export interface CameraNamespace {
  scanQr(params: CameraScanQrParams): CapabilityRequestBuilder<'camera.scanQr'>
  capture(params: CameraCaptureParams): CapabilityRequestBuilder<'camera.capture'>
}

export interface GpsNamespace {
  getCurrentPosition(
    params: GpsGetCurrentPositionParams,
  ): CapabilityRequestBuilder<'gps.getCurrentPosition'>
}

export interface StorageNamespace {
  pickFile(params: StoragePickFileParams): CapabilityRequestBuilder<'storage.pickFile'>
}

export interface ProviderProxyNamespace {
  call(params: ProviderProxyCallParams): CapabilityRequestBuilder<'providerProxy.call'>
}

export function createBiometricNamespace(
  transport: Transport,
  getCtx: () => { miniAppId: string; sessionId: string; userId: string; deviceId: string; timeoutMs: number },
): BiometricNamespace {
  return {
    authenticate: createCapabilityMethod(transport, 'biometric.authenticate', getCtx),
  }
}

export function createCameraNamespace(
  transport: Transport,
  getCtx: () => { miniAppId: string; sessionId: string; userId: string; deviceId: string; timeoutMs: number },
): CameraNamespace {
  return {
    scanQr: createCapabilityMethod(transport, 'camera.scanQr', getCtx),
    capture: createCapabilityMethod(transport, 'camera.capture', getCtx),
  }
}

export function createGpsNamespace(
  transport: Transport,
  getCtx: () => { miniAppId: string; sessionId: string; userId: string; deviceId: string; timeoutMs: number },
): GpsNamespace {
  return {
    getCurrentPosition: createCapabilityMethod(transport, 'gps.getCurrentPosition', getCtx),
  }
}

export function createStorageNamespace(
  transport: Transport,
  getCtx: () => { miniAppId: string; sessionId: string; userId: string; deviceId: string; timeoutMs: number },
): StorageNamespace {
  return {
    pickFile: createCapabilityMethod(transport, 'storage.pickFile', getCtx),
  }
}

export function createProviderProxyNamespace(
  transport: Transport,
  getCtx: () => { miniAppId: string; sessionId: string; userId: string; deviceId: string; timeoutMs: number },
): ProviderProxyNamespace {
  return {
    call: (params) => createCapabilityMethod(
      transport,
      'providerProxy.call',
      getCtx,
    )({
      ...params,
      reason: params.reason ?? `Provider proxy call ${params.providerId}/${params.operationId}`,
    }),
  }
}
