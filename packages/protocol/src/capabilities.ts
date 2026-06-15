export type CapabilityId =
  | 'biometric.authenticate'
  | 'camera.scanQr'
  | 'camera.capture'
  | 'gps.getCurrentPosition'
  | 'storage.pickFile'
  | 'providerProxy.call'

export type CapabilityExecutionTarget = 'host' | 'runtime'

export const HOST_CAPABILITY_IDS = [
  'biometric.authenticate',
  'camera.scanQr',
  'camera.capture',
  'gps.getCurrentPosition',
  'storage.pickFile',
] as const satisfies readonly CapabilityId[]

export const RUNTIME_CAPABILITY_IDS = [
  'providerProxy.call',
] as const satisfies readonly CapabilityId[]

export interface BiometricAuthenticateParams {
  reason: string
}

export interface BiometricAuthenticateResult {
  authenticated: boolean
}

export interface CameraScanQrParams {
  reason: string
}

export interface CameraScanQrResult {
  content: string
  format: string
}

export interface CameraCaptureParams {
  reason: string
  quality?: number
}

export interface CameraCaptureResult {
  uri: string
  mimeType: string
}

export interface GpsGetCurrentPositionParams {
  reason: string
  accuracy?: 'high' | 'medium' | 'low'
}

export interface GpsGetCurrentPositionResult {
  latitude: number
  longitude: number
  accuracy: number
}

export interface StoragePickFileParams {
  reason: string
  types?: string[]
}

export interface StoragePickFileResult {
  uri: string
  name: string
  size: number
  mimeType: string
}

export interface ProviderProxyCallParams {
  providerId: string
  operationId: string
  body?: unknown
  query?: Record<string, string | number | boolean>
  path?: Record<string, string>
  headers?: Record<string, string>
  reason?: string
}

export interface ProviderProxyCallResult {
  status: number
  headers?: Record<string, string>
  data: unknown
}

export interface CapabilityParamMap {
  'biometric.authenticate': BiometricAuthenticateParams
  'camera.scanQr': CameraScanQrParams
  'camera.capture': CameraCaptureParams
  'gps.getCurrentPosition': GpsGetCurrentPositionParams
  'storage.pickFile': StoragePickFileParams
  'providerProxy.call': ProviderProxyCallParams
}

export interface CapabilityResultMap {
  'biometric.authenticate': BiometricAuthenticateResult
  'camera.scanQr': CameraScanQrResult
  'camera.capture': CameraCaptureResult
  'gps.getCurrentPosition': GpsGetCurrentPositionResult
  'storage.pickFile': StoragePickFileResult
  'providerProxy.call': ProviderProxyCallResult
}

export function getCapabilityExecutionTarget(capability: CapabilityId): CapabilityExecutionTarget {
  return (RUNTIME_CAPABILITY_IDS as readonly string[]).includes(capability) ? 'runtime' : 'host'
}
