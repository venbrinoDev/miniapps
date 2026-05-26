import type { CapabilityId, CapabilityParamMap, CapabilityResultMap } from './capabilities.js'
import type { ErrorCode } from './errors.js'

export interface DeviceRequest<TCapability extends CapabilityId = CapabilityId> {
  requestId: string
  miniAppId: string
  sessionId: string
  userId: string
  deviceId: string
  capability: TCapability
  params: CapabilityParamMap[TCapability]
  reason: string
  timeoutMs: number
}

export interface DeviceResponse<TCapability extends CapabilityId = CapabilityId> {
  requestId: string
  capability: TCapability
  success: true
  result: CapabilityResultMap[TCapability]
}

export interface DeviceErrorResponse {
  requestId: string
  capability: CapabilityId
  success: false
  error: {
    code: ErrorCode
    message: string
  }
}

export interface DeviceEvent<T = unknown> {
  requestId: string
  capability: CapabilityId
  event: string
  data: T
}

export interface DeviceSubscribe {
  requestId: string
  capability: CapabilityId
}

export interface DeviceUnsubscribe {
  requestId: string
  capability: CapabilityId
}

export type ApprovalDecision = 'allow-once' | 'allow-always' | 'deny'

export interface ApprovalScope {
  miniAppId: string
  capability: CapabilityId
  deviceId: string
  userId: string
}

export interface ApprovalRequest {
  requestId: string
  miniAppId: string
  capability: CapabilityId
  reason: string
  scope: ApprovalScope
}

export interface ApprovalResponse {
  requestId: string
  decision: ApprovalDecision
}
