export type { CapabilityId } from './capabilities.js'
export type {
  BiometricAuthenticateParams,
  BiometricAuthenticateResult,
  CameraCaptureParams,
  CameraCaptureResult,
  CameraScanQrParams,
  CameraScanQrResult,
  CapabilityParamMap,
  CapabilityResultMap,
  GpsGetCurrentPositionParams,
  GpsGetCurrentPositionResult,
  StoragePickFileParams,
  StoragePickFileResult,
} from './capabilities.js'
export type { ErrorCode } from './errors.js'
export { ERROR_MESSAGES, MiniAppError } from './errors.js'
export type { ApprovalRecord } from './approval.js'
export type {
  ApprovalDecision,
  ApprovalRequest,
  ApprovalResponse,
  ApprovalScope,
  DeviceErrorResponse,
  DeviceEvent,
  DeviceRequest,
  DeviceResponse,
  DeviceSubscribe,
  DeviceUnsubscribe,
} from './envelopes.js'
export type {
  ClientToServerEvents,
  DeviceApprovalRequestPayload,
  DeviceApprovalResponsePayload,
  HostCapabilitiesUpdatePayload,
  HostCapabilitiesChangedPayload,
  HostRegisterPayload,
  HostRegisteredPayload,
  HostToServerEvents,
  ServerToClientEvents,
  ServerToHostEvents,
  SessionHelloPayload,
  SessionPairedPayload,
  SessionUnavailablePayload,
} from './messages.js'
