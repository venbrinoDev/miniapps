export type CapabilityId =
  | 'biometric.authenticate'
  | 'camera.scanQr'
  | 'camera.capture'
  | 'gps.getCurrentPosition'
  | 'storage.pickFile'

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

export interface CapabilityParamMap {
  'biometric.authenticate': BiometricAuthenticateParams
  'camera.scanQr': CameraScanQrParams
  'camera.capture': CameraCaptureParams
  'gps.getCurrentPosition': GpsGetCurrentPositionParams
  'storage.pickFile': StoragePickFileParams
}

export interface CapabilityResultMap {
  'biometric.authenticate': BiometricAuthenticateResult
  'camera.scanQr': CameraScanQrResult
  'camera.capture': CameraCaptureResult
  'gps.getCurrentPosition': GpsGetCurrentPositionResult
  'storage.pickFile': StoragePickFileResult
}
