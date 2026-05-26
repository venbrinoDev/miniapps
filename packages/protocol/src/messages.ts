import type { CapabilityId } from './capabilities.js'
import type { ErrorCode } from './errors.js'
import type {
  ApprovalDecision,
  DeviceErrorResponse,
  DeviceEvent,
  DeviceRequest,
  DeviceResponse,
} from './envelopes.js'

export interface HostRegisterPayload {
  deviceId: string
  userId: string
  capabilities: CapabilityId[]
}

export interface HostCapabilitiesUpdatePayload {
  deviceId: string
  capabilities: CapabilityId[]
}

export interface SessionHelloPayload {
  miniAppId: string
  sessionId: string
  userId: string
  desiredDeviceId?: string
  manifestHash?: string
}

export interface HostRegisteredPayload {
  deviceId: string
  success: boolean
  capabilities: CapabilityId[]
  error?: string
}

export interface SessionPairedPayload {
  sessionId: string
  deviceId: string
  capabilities: CapabilityId[]
}

export interface SessionUnavailablePayload {
  sessionId: string
  code: Extract<ErrorCode, 'NO_DEVICE' | 'NOT_PAIRED'>
  message: string
  desiredDeviceId?: string
}

export interface HostCapabilitiesChangedPayload {
  sessionId: string
  deviceId: string
  capabilities: CapabilityId[]
}

export interface DeviceApprovalRequestPayload {
  requestId: string
  miniAppId: string
  capability: CapabilityId
  reason: string
}

export interface DeviceApprovalResponsePayload {
  requestId: string
  decision: ApprovalDecision
}

export interface ServerToHostEvents {
  'host.registered': (payload: HostRegisteredPayload) => void
  'device.request': (request: DeviceRequest) => void
  'device.approval.request': (payload: DeviceApprovalRequestPayload) => void
  'device.subscribe': (payload: { requestId: string }) => void
  'device.unsubscribe': (payload: { requestId: string }) => void
}

export interface HostToServerEvents {
  'host.register': (payload: HostRegisterPayload) => void
  'host.capabilities.update': (payload: HostCapabilitiesUpdatePayload) => void
  'device.response': (response: DeviceResponse) => void
  'device.error': (error: DeviceErrorResponse) => void
  'device.event': (event: DeviceEvent) => void
  'device.approval.response': (payload: DeviceApprovalResponsePayload) => void
}

export interface ServerToClientEvents {
  'session.paired': (payload: SessionPairedPayload) => void
  'session.unavailable': (payload: SessionUnavailablePayload) => void
  'host.capabilities.changed': (payload: HostCapabilitiesChangedPayload) => void
  'device.response': (response: DeviceResponse) => void
  'device.error': (error: DeviceErrorResponse) => void
  'device.event': (event: DeviceEvent) => void
}

export interface ClientToServerEvents {
  'session.hello': (payload: SessionHelloPayload) => void
  'device.request': (request: DeviceRequest) => void
  'device.subscribe': (payload: { requestId: string }) => void
  'device.unsubscribe': (payload: { requestId: string }) => void
}
