export type ErrorCode =
  | 'NO_DEVICE'
  | 'NOT_PAIRED'
  | 'CAPABILITY_UNAVAILABLE'
  | 'MANIFEST_VIOLATION'
  | 'USER_DENIED'
  | 'TIMEOUT'
  | 'HOST_ERROR'

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  NO_DEVICE: 'No paired device host is available',
  NOT_PAIRED: 'The device host is not paired with this session',
  CAPABILITY_UNAVAILABLE: 'The requested capability is not supported by the host',
  MANIFEST_VIOLATION: 'The requested capability is not declared in the mini-app manifest',
  USER_DENIED: 'The user denied the request',
  TIMEOUT: 'The request timed out',
  HOST_ERROR: 'The host encountered an error while executing the request',
}

export class MiniAppError extends Error {
  public readonly code: ErrorCode
  public readonly requestId?: string

  constructor(code: ErrorCode, message?: string, requestId?: string) {
    super(message ?? ERROR_MESSAGES[code])
    this.name = 'MiniAppError'
    this.code = code
    this.requestId = requestId
  }

  toJSON(): { code: ErrorCode; message: string; requestId?: string } {
    return {
      code: this.code,
      message: this.message,
      requestId: this.requestId,
    }
  }
}
